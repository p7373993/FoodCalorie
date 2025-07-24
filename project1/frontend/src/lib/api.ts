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

// API 클라이언트 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // 인증 토큰이 있으면 추가
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Token ${token}`,
      };
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // 식단 관련 API
  async getMeals() {
    return this.request('/api/meals/');
  }

  async createMeal(mealData: {
    image_url: string;
    calories: number;
    analysis_data?: any;
    ml_task_id?: string;
    estimated_mass?: number;
    confidence_score?: number;
  }) {
    return this.request('/api/meals/', {
      method: 'POST',
      body: JSON.stringify(mealData),
    });
  }

  async getCalendarMeals(year: number, month: number) {
    return this.request(`/api/meals/calendar/?year=${year}&month=${month}`);
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

  // 게임화 관련 API
  async getGamificationProfile() {
    return this.request('/api/gamification/');
  }

  async updateGamification(action: string) {
    return this.request('/api/gamification/update/', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
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
    return this.request('/api/challenges/rooms/');
  }

  async getChallengeRoom(roomId: number): Promise<ApiResponse<ChallengeRoom>> {
    return this.request(`/api/challenges/rooms/${roomId}/`);
  }

  // 챌린지 참여 관리
  async joinChallengeRoom(joinData: ChallengeJoinRequest): Promise<ApiResponse<UserChallenge>> {
    return this.request('/api/challenges/join/', {
      method: 'POST',
      body: JSON.stringify(joinData),
    });
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

  async leaveChallenge(challengeId: number): Promise<ApiResponse<any>> {
    return this.request('/api/challenges/my/leave/', {
      method: 'DELETE',
      body: JSON.stringify({
        challenge_id: challengeId,
      }),
    });
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

    const response = await fetch(`${this.baseURL}/mlserver/api/upload/`, {
      method: 'POST',
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
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;