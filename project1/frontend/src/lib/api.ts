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
    // 캐시된 토큰이 있으면 사용
    if (this.csrfToken) {
      return this.csrfToken;
    }

    try {
      console.log('🔐 CSRF 토큰 요청 중...');
      const response = await fetch(`${this.baseURL}/api/auth/csrf-token/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`CSRF 토큰 요청 실패: ${response.status}`);
        throw new Error(`Failed to get CSRF token: ${response.status}`);
      }

      const data = await response.json();
      this.csrfToken = data.csrf_token || '';
      console.log('✅ CSRF 토큰 획득 성공:', this.csrfToken ? '토큰 있음' : '토큰 없음');
      return this.csrfToken || '';
    } catch (error) {
      console.error('❌ CSRF 토큰 획득 실패:', error);
      // CSRF 토큰 획득 실패 시 쿠키에서 직접 읽기 시도
      const cookieToken = this.getCSRFTokenFromCookie();
      if (cookieToken) {
        console.log('🍪 쿠키에서 CSRF 토큰 사용');
        this.csrfToken = cookieToken;
        return cookieToken;
      }
      throw error;
    }
  }

  // 쿠키에서 CSRF 토큰 직접 읽기
  private getCSRFTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    
    const name = 'csrftoken';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  // CSRF 토큰 초기화 (로그아웃 시 사용)
  private clearCSRFToken(): void {
    this.csrfToken = null;
  }

  // 인증 관련 API
  async login(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.request<ApiResponse<any>>('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return response as ApiResponse<any>;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<ApiResponse<any>> {
    try {
      // 로그아웃은 CSRF 토큰 없이 직접 요청
      const url = `${this.baseURL}/api/auth/logout/`;
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Logout failed: ${response.status}`);
      }

      const data = await response.json() as ApiResponse<any>;
      this.clearCSRFToken(); // 로그아웃 후 CSRF 토큰 초기화
      return data as ApiResponse<any>;
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
      const response = await this.request<ApiResponse<any>>('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response as ApiResponse<any>;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async checkAuthStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await this.request<any>('/api/auth/profile/');
      return {
        success: true,
        data: response,
        message: 'Authentication status retrieved successfully'
      } as ApiResponse<any>;
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
        console.log(`🔐 ${options.method} 요청에 CSRF 토큰 추가 중...`);
        const csrfToken = await this.getCSRFToken();
        config.headers = {
          ...config.headers,
          'X-CSRFToken': csrfToken,
        };
        console.log(`✅ CSRF 토큰 헤더 추가 완료: ${csrfToken ? '토큰 있음' : '토큰 없음'}`);
      } catch (error) {
        console.error('❌ CSRF 토큰 획득 실패:', error);
        // CSRF 토큰을 가져올 수 없어도 요청을 계속 진행
      }
    }

    console.log(`🌐 API 요청: ${options.method || 'GET'} ${url}`);
    console.log('📋 요청 헤더:', config.headers);
    
    const response = await fetch(url, config);
    
    console.log(`📡 응답 상태: ${response.status} ${response.statusText}`);

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
      // 챌린지 방 목록은 인증 없이 접근
      const url = `${this.baseURL}/api/challenges/rooms/`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching challenge rooms:', error);
      throw error;
    }
  }

  async getChallengeRoom(roomId: number): Promise<ChallengeRoom> {
    try {
      // 챌린지 방 상세 정보도 인증 없이 접근
      const url = `${this.baseURL}/api/challenges/rooms/${roomId}/`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching challenge room:', error);
      throw error;
    }
  }

  // 챌린지 참여 관리
  async joinChallengeRoom(joinData: ChallengeJoinRequest): Promise<ApiResponse<UserChallenge>> {
    try {
      // 챌린지 참여도 인증 없이 접근 (테스트용)
      const url = `${this.baseURL}/api/challenges/join/`;
      
      // 디버깅을 위한 로그
      console.log('Joining challenge with data:', joinData);
      console.log('Request URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',  // 세션 쿠키 포함
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(joinData),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Success response:', data);
      return {
        success: true,
        data: data,
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
    try {
      // 내 챌린지 정보 조회 (세션 기반 인증)
      const url = `${this.baseURL}/api/challenges/my/`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',  // 세션 쿠키 포함
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching my challenges:', error);
      // 오류 발생 시 빈 데이터 반환
      return {
        success: true,
        data: {
          active_challenges: [],
          has_active_challenge: false,
          total_active_count: 0
        },
        message: '챌린지 정보를 불러올 수 없습니다.'
      };
    }
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
    try {
      console.log(`Fetching leaderboard for room ${roomId} with limit ${limit}`);
      const url = `/api/challenges/leaderboard/${roomId}/?limit=${limit}`;
      console.log(`Request URL: ${this.baseURL}${url}`);
      
      const response = await this.request<ApiResponse<{
        room_id: number;
        room_name: string;
        leaderboard: LeaderboardEntry[];
        my_rank: number | null;
        total_participants: number;
      }>>(url);
      console.log('Leaderboard response:', response);
      
      // 백엔드 응답이 이미 올바른 구조를 가지고 있으므로 그대로 반환
      return response as ApiResponse<{
        room_id: number;
        room_name: string;
        leaderboard: LeaderboardEntry[];
        my_rank: number | null;
        total_participants: number;
      }>;
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      // 오류 발생 시 ApiResponse 형태로 반환
      return {
        success: false,
        message: error instanceof Error ? error.message : '리더보드를 불러오는 중 오류가 발생했습니다.'
      } as ApiResponse<{
        room_id: number;
        room_name: string;
        leaderboard: LeaderboardEntry[];
        my_rank: number | null;
        total_participants: number;
      }>;
    }
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

  // 캘린더 관련 API
  async getCalendarData() {
    return this.request('/api/calendar/data/');
  }

  async updateCalendarProfile(profileData: {
    calorie_goal?: number;
    protein_goal?: number;
    carbs_goal?: number;
    fat_goal?: number;
  }) {
    return this.request('/api/calendar/profile/', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async getMealsByDate(date: string) {
    return this.request(`/api/calendar/meals/?date=${date}`);
  }

  async setDailyGoal(date: string, goalText: string) {
    return this.request('/api/calendar/daily-goal/', {
      method: 'POST',
      body: JSON.stringify({
        date,
        goal_text: goalText,
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