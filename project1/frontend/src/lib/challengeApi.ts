import { 
  ApiResponse, 
  PaginatedResponse,
  ChallengeRoom, 
  UserChallenge, 
  ChallengeJoinRequest,
  DailyChallengeRecord,
  CheatDayRequest,
  CheatDayStatus,
  LeaderboardEntry,
  ChallengeStatistics,
  ChallengeReportData,
  ChallengeAction
} from '@/types';

// API 기본 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 에러 타입 정의
export interface ChallengeApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}

// API 응답 래퍼
export interface ChallengeApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ChallengeApiError;
  message?: string;
}

class ChallengeApiClient {
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
      this.csrfToken = data.csrf_token;
      return this.csrfToken;
    } catch (error) {
      console.error('Error getting CSRF token:', error);
      throw error;
    }
  }

  // CSRF 토큰 초기화
  private clearCSRFToken(): void {
    this.csrfToken = null;
  }

  // 기본 요청 메서드
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ChallengeApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // POST, PUT, DELETE 요청에 CSRF 토큰 추가
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
        try {
          const csrfToken = await this.getCSRFToken();
          headers['X-CSRFToken'] = csrfToken;
        } catch (error) {
          console.error('Failed to get CSRF token for request:', error);
        }
      }

      const response = await fetch(url, {
        ...options,
        credentials: 'include', // 쿠키 기반 인증을 위해 credentials 포함
        headers,
      });

      // 401 또는 403 응답 시 CSRF 토큰 초기화
      if (response.status === 401 || response.status === 403) {
        this.clearCSRFToken();
      }

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: responseData.message || responseData.detail || 'API 요청 실패',
            status: response.status,
            details: responseData,
          },
        };
      }

      return {
        success: true,
        data: responseData,
        message: responseData.message,
      };
    } catch (error) {
      console.error('Challenge API Error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.',
        },
      };
    }
  }

  // ===========================================
  // 챌린지 방 관리 API
  // ===========================================

  async getChallengeRooms(
    params?: {
      page?: number;
      limit?: number;
      difficulty?: string;
      search?: string;
    }
  ): Promise<ChallengeApiResponse<PaginatedResponse<ChallengeRoom>>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = `/api/challenges/rooms/${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<PaginatedResponse<ChallengeRoom>>(endpoint);
  }

  async getChallengeRoom(id: number): Promise<ChallengeApiResponse<ChallengeRoom>> {
    return this.request<ChallengeRoom>(`/api/challenges/rooms/${id}/`);
  }

  // ===========================================
  // 챌린지 참여 관리 API
  // ===========================================

  async joinChallengeRoom(joinData: ChallengeJoinRequest): Promise<ChallengeApiResponse<UserChallenge>> {
    return this.request<UserChallenge>('/api/challenges/join/', {
      method: 'POST',
      body: JSON.stringify(joinData),
    });
  }

  async getMyChallenges(): Promise<ChallengeApiResponse<UserChallenge[]>> {
    return this.request<UserChallenge[]>('/api/challenges/my/');
  }

  async getMyActiveChallenge(): Promise<ChallengeApiResponse<UserChallenge | null>> {
    const response = await this.getMyChallenges();
    if (response.success && response.data) {
      const activeChallenge = response.data.find(challenge => 
        challenge.status === 'active' || challenge.remaining_duration_days > 0
      );
      return {
        success: true,
        data: activeChallenge || null,
      };
    }
    return response as ChallengeApiResponse<UserChallenge | null>;
  }

  async extendChallenge(challengeId: number, extensionDays: number): Promise<ChallengeApiResponse<UserChallenge>> {
    return this.request<UserChallenge>(`/api/challenges/${challengeId}/extend/`, {
      method: 'PUT',
      body: JSON.stringify({ extension_days: extensionDays }),
    });
  }

  async leaveChallenge(challengeId: number): Promise<ChallengeApiResponse<void>> {
    return this.request<void>(`/api/challenges/${challengeId}/leave/`, {
      method: 'DELETE',
    });
  }

  // ===========================================
  // 일일 챌린지 기록 API
  // ===========================================

  async getDailyChallengeRecords(
    challengeId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<ChallengeApiResponse<DailyChallengeRecord[]>> {
    const params = new URLSearchParams();
    if (challengeId) params.append('challenge_id', challengeId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const endpoint = `/api/challenges/records/${params.toString() ? `?${params}` : ''}`;
    return this.request<DailyChallengeRecord[]>(endpoint);
  }

  async getDailyChallengeRecord(date: string, challengeId?: number): Promise<ChallengeApiResponse<DailyChallengeRecord>> {
    const params = challengeId ? `?challenge_id=${challengeId}` : '';
    return this.request<DailyChallengeRecord>(`/api/challenges/records/${date}/${params}`);
  }

  // ===========================================
  // 치팅 기능 API
  // ===========================================

  async requestCheatDay(date: string, challengeId?: number): Promise<ChallengeApiResponse<CheatDayRequest>> {
    return this.request<CheatDayRequest>('/api/challenges/cheat/', {
      method: 'POST',
      body: JSON.stringify({
        date,
        challenge_id: challengeId,
      }),
    });
  }

  async getCheatDayStatus(challengeId?: number): Promise<ChallengeApiResponse<{
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

  async getCheatDayRequests(challengeId?: number): Promise<ChallengeApiResponse<CheatDayRequest[]>> {
    const params = challengeId ? `?challenge_id=${challengeId}` : '';
    return this.request<CheatDayRequest[]>(`/api/challenges/cheat/requests/${params}`);
  }

  // ===========================================
  // 리더보드 및 순위 API
  // ===========================================

  async getLeaderboard(
    roomId: number,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ChallengeApiResponse<{
    room_id: number;
    room_name: string;
    leaderboard: LeaderboardEntry[];
    my_rank: number | null;
    total_participants: number;
  }>> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const endpoint = `/api/challenges/leaderboard/${roomId}/${params.toString() ? `?${params}` : ''}`;
    return this.request(endpoint);
  }

  async getMyRank(roomId: number): Promise<ChallengeApiResponse<{ rank: number; total: number }>> {
    return this.request<{ rank: number; total: number }>(`/api/challenges/leaderboard/${roomId}/my-rank/`);
  }

  // ===========================================
  // 개인 통계 및 리포트 API
  // ===========================================

  async getPersonalStats(challengeId?: number): Promise<ChallengeApiResponse<{
    challenge_id: number;
    room_name: string;
    statistics: ChallengeStatistics;
    badges: any[];
    badge_count: number;
  }>> {
    const params = challengeId ? `?challenge_id=${challengeId}` : '';
    return this.request(`/api/challenges/stats/${params}`);
  }

  async getChallengeReport(challengeId?: number): Promise<ChallengeApiResponse<any>> {
    const params = challengeId ? `?challenge_id=${challengeId}` : '';
    return this.request(`/api/challenges/report/${params}`);
  }

  async getChallengeCompletionReport(challengeId?: number): Promise<ChallengeApiResponse<ChallengeReportData>> {
    const params = challengeId ? `?challenge_id=${challengeId}` : '';
    return this.request<ChallengeReportData>(`/api/challenges/completion/report/${params}`);
  }

  // ===========================================
  // 챌린지 완료 액션 API
  // ===========================================

  async completeChallengeAction(action: ChallengeAction): Promise<ChallengeApiResponse<any>> {
    return this.request('/api/challenges/completion/action/', {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  async shareChallengeReport(challengeId: number, platform: string): Promise<ChallengeApiResponse<any>> {
    return this.request('/api/challenges/completion/share/', {
      method: 'POST',
      body: JSON.stringify({
        challenge_id: challengeId,
        platform,
      }),
    });
  }

  // ===========================================
  // 배지 관리 API
  // ===========================================

  async getAvailableBadges(): Promise<ChallengeApiResponse<any[]>> {
    return this.request<any[]>('/api/challenges/badges/');
  }

  async getUserBadges(userId?: number): Promise<ChallengeApiResponse<any[]>> {
    const params = userId ? `?user_id=${userId}` : '';
    return this.request<any[]>(`/api/challenges/badges/user/${params}`);
  }

  // ===========================================
  // 실시간 데이터 API
  // ===========================================

  async refreshChallengeData(challengeId?: number): Promise<ChallengeApiResponse<{
    challenge: UserChallenge;
    todayRecord: DailyChallengeRecord | null;
    weeklyStats: any;
  }>> {
    const params = challengeId ? `?challenge_id=${challengeId}` : '';
    return this.request(`/api/challenges/refresh/${params}`);
  }

  // ===========================================
  // 헬스체크 API
  // ===========================================

  async healthCheck(): Promise<ChallengeApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('/api/challenges/health/');
  }
}

// 싱글톤 인스턴스 생성
export const challengeApi = new ChallengeApiClient(API_BASE_URL);

// 기본 export
export default challengeApi;

// 편의 함수들 (세션 기반 인증으로 변경되어 토큰 관련 함수 제거) 