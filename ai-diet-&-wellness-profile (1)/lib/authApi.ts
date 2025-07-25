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

class AuthApiError extends Error {
  constructor(public error: ApiError) {
    super(error.message);
    this.name = 'AuthApiError';
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
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: {
          code: 'UNKNOWN_ERROR',
          message: '알 수 없는 오류가 발생했습니다.',
        }
      }));
      throw new AuthApiError(errorData.error);
    }
    return response.json();
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<AuthResponse>(response);
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<AuthResponse>(response);
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout/`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (error) {
        // 로그아웃 API 실패해도 클라이언트 토큰은 삭제
        console.warn('Logout API failed:', error);
      }
    }
  }

  async getProfile(): Promise<{ user: User; profile: UserProfile }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile/`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ user: User; profile: UserProfile }>(response);
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
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }
}

export const authApi = new AuthApi();
export { AuthApiError };