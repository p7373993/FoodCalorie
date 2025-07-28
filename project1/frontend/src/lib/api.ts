import type {
  ApiResponse,
  PaginatedResponse,
  ChallengeRoom,
  UserChallenge,
  ChallengeJoinRequest,
  CheatDayStatus,
  LeaderboardEntry,
  ChallengeStatistics,
  UserChallengeBadge
} from '@/types';

// 커스텀 에러 클래스들
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string, status: number, data?: any) {
    super(message, status, data);
    this.name = 'AuthenticationError';
  }
}

export class CSRFError extends APIError {
  constructor(message: string, status: number, data?: any) {
    super(message, status, data);
    this.name = 'CSRFError';
  }
}

export class PermissionError extends APIError {
  constructor(message: string, status: number, data?: any) {
    super(message, status, data);
    this.name = 'PermissionError';
  }
}

// API 클라이언트 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseURL: string;
  private csrfToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // CSRF 토큰 가져오기
  private async getCSRFToken(): Promise<string> {
    if (this.csrfToken) {
      return this.csrfToken;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/auth/csrf-token/`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to get CSRF token: ${response.status}`);
      }

      const data = await response.json();
      this.csrfToken = data.csrf_token || '';
      return this.csrfToken;
    } catch (error) {
      console.error('Error getting CSRF token:', error);
      throw error;
    }
  }

  // CSRF 토큰 초기화 (로그아웃 시 사용)
  private clearCSRFToken(): void {
    this.csrfToken = null;
  }

  // 인증 관련 API
  async login(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.request('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<ApiResponse<any>> {
    try {
      const response = await this.request('/api/auth/logout/', {
        method: 'POST',
      });
      this.clearCSRFToken(); // 로그아웃 후 CSRF 토큰 초기화
      return response;
    } catch (error) {
      console.error('Logout error:', error);
      this.clearCSRFToken(); // 오류가 발생해도 CSRF 토큰 초기화
      throw error;
    }
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.request('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async checkAuthStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await this.request('/api/auth/profile/');
      return {
        success: true,
        data: response,
        message: 'Authentication status retrieved successfully'
      };
    } catch (error) {
      console.error('Auth status check error:', error);
      return {
        success: false,
        message: 'Not authenticated',
        error: error instanceof Error ? error.message : 'Authentication check failed'
      };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.request('/api/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      return response;
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      credentials: 'include', // 쿠키 기반 인증을 위해 credentials 포함
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // POST, PUT, DELETE 요청에 CSRF 토큰 추가
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
      try {
        const csrfToken = await this.getCSRFToken();
        config.headers = {
          ...config.headers,
          'X-CSRFToken': csrfToken,
        };
      } catch (error) {
        console.error('Failed to get CSRF token for request:', error);
        // CSRF 토큰을 가져올 수 없어도 요청을 계속 진행
      }
    }

    const response = await fetch(url, config);

    // 401 또는 403 응답 시 CSRF 토큰 초기화
    if (response.status === 401 || response.status === 403) {
      this.clearCSRFToken();
    }

    if (!response.ok) {
      // 에러 응답 처리
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP error! status: ${response.status}` };
      }

      // 인증 관련 에러 처리
      if (response.status === 401) {
        // 401 Unauthorized - 세션 만료 또는 인증 필요
        this.handleAuthenticationError(errorData);
        throw new AuthenticationError(errorData.message || '인증이 필요합니다.', response.status, errorData);
      }

      if (response.status === 403) {
        // 403 Forbidden - CSRF 오류 또는 권한 부족
        const isCSRFError = errorData.error_code === 'CSRF_FAILED' || 
                           errorData.error_code === 'CSRF_TOKEN_GENERATION_FAILED' ||
                           endpoint.includes('csrf') ||
                           (errorData.message && errorData.message.toLowerCase().includes('csrf'));
        
        if (isCSRFError) {
          this.handleCSRFError(errorData);
          throw new CSRFError(errorData.message || 'CSRF 토큰이 유효하지 않습니다.', response.status, errorData);
        } else {
          this.handlePermissionError(errorData);
          throw new PermissionError(errorData.message || '권한이 부족합니다.', response.status, errorData);
        }
      }

      // 기타 HTTP 에러
      throw new APIError(errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData);
    }

    return response.json();
  }

  // 인증 에러 처리
  private handleAuthenticationError(errorData: any): void {
    // 세션 만료 이벤트 발생
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:session-expired', {
        detail: {
          message: errorData.message || '세션이 만료되었습니다. 다시 로그인해주세요.',
          redirectUrl: errorData.redirect_url || '/login',
          sessionExpired: errorData.session_expired || errorData.session_info?.session_expired || true,
          errorCode: errorData.error_code || 'AUTHENTICATION_REQUIRED',
          timestamp: new Date().toISOString()
        }
      }));
    }
  }

  // CSRF 에러 처리
  private handleCSRFError(errorData: any): void {
    // CSRF 토큰 초기화 후 재시도를 위한 이벤트 발생
    this.clearCSRFToken();
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:csrf-error', {
        detail: {
          message: errorData.message || 'CSRF 토큰 오류가 발생했습니다. 페이지를 새로고침해주세요.',
          shouldRefresh: errorData.csrf_info?.should_refresh || errorData.should_refresh || true,
          suggestion: errorData.suggestion || '페이지를 새로고침하고 다시 시도해주세요.',
          errorCode: errorData.error_code || 'CSRF_FAILED',
          reason: errorData.reason,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }

  // 권한 에러 처리
  private handlePermissionError(errorData: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:permission-error', {
        detail: {
          message: errorData.message || '권한이 부족합니다.',
          errorCode: errorData.error_code || 'PERMISSION_DENIED',
          requiredPermission: errorData.required_permission,
          suggestion: errorData.suggestion || '관리자에게 문의하거나 필요한 권한을 확인해주세요.',
          timestamp: new Date().toISOString()
        }
      }));
    }
  }

  // 식단 관련 API (MealLog)
  async getMeals() {
    return this.request('/api/logs/');
  }

  async createMeal(mealData: {
    date: string;
    mealType: string;
    foodName: string;
    calories: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    nutriScore?: string;
    imageUrl?: string;
    time?: string;
  }) {
    return this.request('/api/logs/', {
      method: 'POST',
      body: JSON.stringify(mealData),
    });
  }

  async updateMeal(mealId: number, mealData: any) {
    return this.request(`/api/logs/${mealId}/`, {
      method: 'PUT',
      body: JSON.stringify(mealData),
    });
  }

  async deleteMeal(mealId: number) {
    return this.request(`/api/logs/${mealId}/`, {
      method: 'DELETE',
    });
  }

  async getMeal(mealId: number) {
    return this.request(`/api/logs/${mealId}/`);
  }

  async getCalendarMeals(year: number, month: number) {
    return this.request(`/api/logs/monthly?year=${year}&month=${month}`);
  }

  // 체중 관련 API
  async getWeightEntries() {
    return this.request('/api/weight/');
  }

  async createWeightEntry(weight: number) {
    return this.request('/api/weight/', {
      method: 'POST',
      body: JSON.stringify({ weight }),
    });
  }

  // 게임화 관련 API (임시 비활성화 - 404 에러 방지)
  async getGamificationProfile() {
    // 임시로 빈 데이터 반환
    return Promise.resolve({
      level: 1,
      experience: 0,
      badges: [],
      streak: 0
    });
  }

  async updateGamification(action: string) {
    // 임시로 성공 응답 반환
    return Promise.resolve({ success: true });
  }

  // 기존 챌린지 관련 API (레거시)
  async getChallenges() {
    return this.request('/api/challenges/');
  }

  async createChallenge(challengeData: {
    title: string;
    description: string;
    type: 'CALORIE_LIMIT' | 'PROTEIN_MINIMUM';
    goal: number;
  }) {
    return this.request('/api/challenges/', {
      method: 'POST',
      body: JSON.stringify(challengeData),
    });
  }

  async joinChallenge(challengeId: number) {
    return this.request(`/api/challenges/${challengeId}/join/`, {
      method: 'POST',
    });
  }

  // 새로운 챌린지 시스템 API
  // 챌린지 방 관리
  async getChallengeRooms(): Promise<PaginatedResponse<ChallengeRoom>> {
    try {
      const response = await this.request('/api/challenges/rooms/');
      return response;
    } catch (error) {
      console.error('Error fetching challenge rooms:', error);
      throw error;
    }
  }

  async getChallengeRoom(roomId: number): Promise<ChallengeRoom> {
    try {
      const response = await this.request(`/api/challenges/rooms/${roomId}/`);
      return response;
    } catch (error) {
      console.error('Error fetching challenge room:', error);
      throw error;
    }
  }

  // 챌린지 참여 관리
  async joinChallengeRoom(joinData: ChallengeJoinRequest): Promise<ApiResponse<UserChallenge>> {
    try {
      const response = await this.request('/api/challenges/join/', {
        method: 'POST',
        body: JSON.stringify(joinData),
      });
      return {
        success: true,
        data: response,
        message: '챌린지 참여가 완료되었습니다.'
      };
    } catch (error) {
      console.error('Error joining challenge room:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '챌린지 참여 중 오류가 발생했습니다.'
      };
    }
  }

  async getMyChallenges(): Promise<ApiResponse<{
    active_challenges: UserChallenge[];
    has_active_challenge: boolean;
    total_active_count: number;
  }>> {
    return this.request('/api/challenges/my/');
  }

  async extendChallenge(challengeId: number, extendDays: number = 7): Promise<ApiResponse<UserChallenge>> {
    return this.request('/api/challenges/my/extend/', {
      method: 'PUT',
      body: JSON.stringify({
        challenge_id: challengeId,
        extend_days: extendDays,
      }),
    });
  }

  async leaveChallenge(challengeId: number, reason?: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.request('/api/challenges/leave/', {
        method: 'POST',
        body: JSON.stringify({
          challenge_id: challengeId,
          reason: reason || '사용자 요청'
        }),
      });
      return {
        success: true,
        data: response,
        message: '챌린지를 포기했습니다.'
      };
    } catch (error) {
      console.error('Error leaving challenge:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '챌린지 포기 중 오류가 발생했습니다.'
      };
    }
  }

  // 치팅 기능
  async requestCheatDay(date: string, challengeId?: number): Promise<ApiResponse<any>> {
    return this.request('/api/challenges/cheat/', {
      method: 'POST',
      body: JSON.stringify({
        date,
        challenge_id: challengeId,
      }),
    });
  }

  async getCheatStatus(challengeId?: number): Promise<ApiResponse<{
    challenge_id: number;
    room_name: string;
    weekly_cheat_status: CheatDayStatus;
    used_dates: string[];
    week_start: string;
    current_date: string;
  }>> {
    const params = challengeId ? `?challenge_id=${challengeId}` : '';
    return this.request(`/api/challenges/cheat/status/${params}`);
  }

  // 순위 및 통계
  async getLeaderboard(roomId: number, limit: number = 50): Promise<ApiResponse<{
    room_id: number;
    room_name: string;
    leaderboard: LeaderboardEntry[];
    my_rank: number | null;
    total_participants: number;
  }>> {
    return this.request(`/api/challenges/leaderboard/${roomId}/?limit=${limit}`);
  }

  async getPersonalStats(challengeId?: number): Promise<ApiResponse<{
    challenge_id: number;
    room_name: string;
    statistics: ChallengeStatistics;
    badges: UserChallengeBadge[];
    badge_count: number;
  }>> {
    const params = challengeId ? `?challenge_id=${challengeId}` : '';
    return this.request(`/api/challenges/stats/${params}`);
  }

  async getChallengeReport(challengeId?: number): Promise<ApiResponse<any>> {
    const params = challengeId ? `?challenge_id=${challengeId}` : '';
    return this.request(`/api/challenges/report/${params}`);
  }

  // 챌린지 완료 관련 API
  async getChallengeCompletionReport(challengeId?: number): Promise<ApiResponse<any>> {
    const params = challengeId ? `?challenge_id=${challengeId}` : '';
    return this.request(`/api/challenges/completion/report/${params}`);
  }

  async completeChallengeAction(action: any): Promise<ApiResponse<any>> {
    return this.request('/api/challenges/completion/action/', {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  async shareChallengeReport(challengeId: number, platform: string): Promise<ApiResponse<any>> {
    return this.request('/api/challenges/completion/share/', {
      method: 'POST',
      body: JSON.stringify({
        challenge_id: challengeId,
        platform,
      }),
    });
  }

  // AI 코칭 관련 API
  async getAICoaching(type: 'meal_feedback' | 'weekly_report' | 'insights', data?: any) {
    return this.request('/api/ai/coaching/', {
      method: 'POST',
      body: JSON.stringify({
        type,
        meal_data: data,
      }),
    });
  }

  // MLServer 연동 API
  async uploadImageToMLServer(file: File): Promise<ApiResponse<{ task_id: string }>> {
    const formData = new FormData();
    formData.append('image', file);

    // CSRF 토큰 가져오기
    const csrfToken = await this.getCSRFToken();

    const response = await fetch(`${this.baseURL}/mlserver/api/upload/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  }

  async getMLServerTaskStatus(taskId: string) {
    return this.request(`/mlserver/api/tasks/${taskId}/`);
  }

  // WebSocket 연결을 위한 URL 생성
  getWebSocketURL(taskId: string): string {
    const wsBaseURL = this.baseURL.replace('http', 'ws');
    return `${wsBaseURL}/mlserver/ws/task/${taskId}/`;
  }

  // 테스트용 request 메서드 노출
  async testRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request(endpoint, options);
  }

  // 이미지 파일 업로드 (실제 파일 저장용)
  async uploadImageFile(file: File): Promise<{ image_url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    // CSRF 토큰 가져오기
    const csrfToken = await this.getCSRFToken();

    const response = await fetch(`${this.baseURL}/api/upload-image/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Image upload failed: ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;