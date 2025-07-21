import axios from 'axios';
import { 
  ApiResponse, 
  DailyNutrition, 
  MonthlyCalendar, 
  Challenge, 
  Badge, 
  AICoachTip,
  MealLog 
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  // Content-Type 헤더 제거 (FormData 전송을 위해)
});

// 인터셉터 설정 (토큰 인증 등)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// API 함수들
export const apiClient = {
  // 달력 관련 API
  getMonthlyLogs: async (year: number, month: number): Promise<MonthlyCalendar> => {
    const response = await api.get<ApiResponse<MonthlyCalendar>>(`/api/logs/monthly?year=${year}&month=${month}`);
    return response.data.data;
  },

  getDailyReport: async (date: string): Promise<DailyNutrition> => {
    const response = await api.get<ApiResponse<DailyNutrition>>(`/api/logs/daily?date=${date}`);
    return response.data.data;
  },

  // 식사 로그 관련 API
  analyzeImageGemini: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('method', 'gemini_only'); // Gemini만 사용하도록 지시
    const token = localStorage.getItem('authToken');
    const response = await api.post(
      '/api/logs/analyze-image/', // 반드시 슬래시 포함
      formData,
      {
        headers: {
          ...(token ? { 'Authorization': `Token ${token}` } : {})
          // Content-Type을 지정하지 않음! (axios가 자동 처리)
        },
      }
    );
    return response.data.data;
  },

  // MLServer 방식 이미지 분석
  analyzeImageMLServer: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('authToken');
    const response = await api.post(
      '/mlserver/api/upload/',
      formData,
      {
        headers: {
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        },
      }
    );
    return response.data;
  },

  createMealLog: async (mealData: Omit<MealLog, 'id'>): Promise<MealLog> => {
    const response = await api.post<ApiResponse<MealLog>>('/api/logs/', mealData);
    return response.data.data;
  },

  // 챌린지 관련 API
  getRecommendedChallenges: async (): Promise<Challenge[]> => {
    const response = await api.get<ApiResponse<Challenge[]>>('/api/challenge-main/challenges/');
    return response.data.data;
  },

  getMyChallenges: async (): Promise<Challenge[]> => {
    const response = await api.get<ApiResponse<Challenge[]>>('/api/challenge-main/challenges/my_challenges/');
    return response.data.data;
  },

  getChallengeDetails: async (challengeId: string): Promise<Challenge> => {
    const response = await api.get<ApiResponse<Challenge>>(`/api/challenge-main/challenges/${challengeId}/`);
    return response.data.data;
  },

  leaveChallenge: async (challengeId: string) => {
    const response = await api.post(`/api/challenge-main/challenges/${challengeId}/leave/`);
    return response.data;
  },

  createChallenge: async (challengeData: any) => {
    const response = await api.post('/api/challenge-main/challenges/', challengeData);
    return response.data;
  },

  joinChallenge: async (challengeId: string) => {
    const response = await api.post(`/api/challenge-main/challenges/${challengeId}/join/`);
    return response.data;
  },

  // 챌린지 진행상황(Progress) 조회 API 추가
  getChallengeProgress: async (challengeId: string) => {
    const response = await api.get(`/api/challenge-main/progress/challenge_progress/?challenge_id=${challengeId}`);
    return response.data;
  },

  // AI 코치 관련 API
  getCoachingTip: async (): Promise<AICoachTip> => {
    const response = await api.get<ApiResponse<AICoachTip>>('/api/ai/coaching-tip');
    return response.data.data;
  },

  // 프로필 관련 API
  getUserBadges: async (username: string): Promise<Badge[]> => {
    const response = await api.get<ApiResponse<Badge[]>>(`/api/users/${username}/badges`);
    return response.data.data;
  },

  // 사용자 통계 API
  getUserStatistics: async (): Promise<any> => {
    const response = await api.get('/api/users/statistics');
    return response.data.data;
  },

  // 사용자 프로필 통계 API
  getUserProfileStats: async (username: string): Promise<any> => {
    const response = await api.get(`/api/users/profile/stats`, { params: { username } });
    return response.data.data;
  },

  // 내 식사 기록 API
  getMyMealLogs: async (): Promise<any[]> => {
    const response = await api.get('/api/logs/');
    return response.data.data;
  },

  // 식사 기록 삭제 API
  deleteMealLog: async (id: string | number): Promise<void> => {
    await api.delete(`/api/logs/${id}/`);
  },
};

export default api; 