import {
  AuthResponse,
  RegisterData,
  LoginData,
  ProfileUpdateData,
  PasswordChangeData,
  PasswordResetData,
  PasswordResetConfirmData,
  User,
  UserProfile,
  ApiError
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 표준화된 API 에러 클래스
export class AuthApiError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(public error: ApiError) {
    super(error.message);
    this.name = 'AuthApiError';
    this.code = error.code;
    this.details = error.details;
  }
}

// HTTP 상태 코드별 에러 처리
export class NetworkError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// 토큰 관련 에러
export class TokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenError';
  }
}

class AuthApi {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // 네트워크 에러 처리
    if (!response.ok) {
      // 401 Unauthorized - 토큰 만료 또는 인증 실패
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({
          error: {
            code: 'UNAUTHORIZED',
            message: '인증이 필요합니다.',
          }
        }));
        throw new AuthApiError(errorData.error);
      }

      // 403 Forbidden - 권한 없음
      if (response.status === 403) {
        throw new AuthApiError({
          code: 'FORBIDDEN',
          message: '접근 권한이 없습니다.',
        });
      }

      // 404 Not Found
      if (response.status === 404) {
        throw new AuthApiError({
          code: 'NOT_FOUND',
          message: '요청한 리소스를 찾을 수 없습니다.',
        });
      }

      // 500 Internal Server Error
      if (response.status >= 500) {
        throw new NetworkError(response.status, '서버 오류가 발생했습니다.');
      }

      // 기타 에러
      const errorData = await response.json().catch(() => ({
        error: {
          code: 'UNKNOWN_ERROR',
          message: '알 수 없는 오류가 발생했습니다.',
        }
      }));
      throw new AuthApiError(errorData.error);
    }

    // 성공 응답 처리
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    // JSON이 아닌 응답의 경우 빈 객체 반환
    return {} as T;
  }

  // 요청 인터셉터 - 모든 요청에 공통 헤더 및 설정 적용
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);
      return this.handleResponse<T>(response);
    } catch (error) {
      // 네트워크 연결 오류
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(0, '네트워크 연결을 확인해주세요.');
      }
      throw error;
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await this.makeRequest<void>('/api/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (error) {
        // 로그아웃 API 실패해도 클라이언트 토큰은 삭제
        console.warn('Logout API failed:', error);
      }
    }
  }

  async getProfile(): Promise<{ user: User; profile: UserProfile }> {
    return this.makeRequest<{ user: User; profile: UserProfile }>('/api/auth/profile/', {
      method: 'GET',
    });
  }

  async updateProfile(data: ProfileUpdateData): Promise<UserProfile> {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'profile_image' && value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/api/auth/profile/`, {
      method: 'PUT',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    return this.handleResponse<UserProfile>(response);
  }

  async changePassword(data: PasswordChangeData): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/password/change/`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<void>(response);
  }

  async requestPasswordReset(data: PasswordResetData): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/password/reset/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<void>(response);
  }

  async confirmPasswordReset(data: PasswordResetConfirmData): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/password/reset/confirm/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<void>(response);
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new AuthApiError({
        code: 'NO_REFRESH_TOKEN',
        message: 'Refresh token not found',
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    return this.handleResponse<AuthResponse>(response);
  }

  // 토큰 저장 및 관리
  saveTokens(tokens: { access_token: string; refresh_token: string }): void {
    try {
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
    } catch (error) {
      console.error('Failed to save tokens to localStorage:', error);
      throw new TokenError('토큰 저장에 실패했습니다.');
    }
  }

  clearTokens(): void {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } catch (error) {
      console.error('Failed to clear tokens from localStorage:', error);
    }
  }

  getAccessToken(): string | null {
    try {
      return localStorage.getItem('access_token');
    } catch (error) {
      console.error('Failed to get access token from localStorage:', error);
      return null;
    }
  }

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem('refresh_token');
    } catch (error) {
      console.error('Failed to get refresh token from localStorage:', error);
      return null;
    }
  }

  // 토큰 유효성 검사 (간단한 JWT 디코딩)
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return true; // 디코딩 실패 시 만료된 것으로 간주
    }
  }

  // 현재 액세스 토큰이 만료되었는지 확인
  isAccessTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    return this.isTokenExpired(token);
  }

  // 관리자 기능 API
  async getUsers(page: number = 1, limit: number = 20): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.makeRequest<{
      users: User[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/admin/users/?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  }

  async getUserById(userId: number): Promise<{ user: User; profile: UserProfile }> {
    return this.makeRequest<{ user: User; profile: UserProfile }>(`/api/admin/users/${userId}/`, {
      method: 'GET',
    });
  }

  async updateUserStatus(userId: number, isActive: boolean): Promise<User> {
    return this.makeRequest<User>(`/api/admin/users/${userId}/`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async resetUserPassword(userId: number): Promise<void> {
    return this.makeRequest<void>(`/api/admin/users/${userId}/reset-password/`, {
      method: 'POST',
    });
  }
}

export const authApi = new AuthApi();