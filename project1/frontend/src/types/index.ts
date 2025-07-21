// 기본 타입 정의
export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string; // 백엔드에 없을 수 있음
  nickname?: string; // 백엔드에 없을 수 있음
}

export interface MealLog {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  nutriScore: 'A' | 'B' | 'C' | 'D' | 'E';
  imageUrl?: string;
  time?: string;
}

export interface DailyNutrition {
  date: string;
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  meals: MealLog[];
}

export interface MonthlyCalendar {
  year: number;
  month: number;
  days: {
    [date: string]: {
      meals: Array<{
        type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
        hasLog: boolean;
      }>;
    };
  };
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  targetType: 'weight' | 'calorie' | 'macro';
  targetValue: number;
  isActive: boolean;
  participants: ChallengeParticipant[];
  maxParticipants?: number;
  currentParticipantsCount?: number;
  isFull?: boolean;
  createdAt?: string;
  updatedAt?: string;
  userParticipation?: ChallengeParticipant;
}

export interface ChallengeParticipant {
  id: string;
  user?: User; // user가 undefined일 수 있음
  status: 'survived' | 'eliminated';
  eliminationDate?: string;
  currentStreak: number;
  maxStreak?: number;
  joinedAt?: string;
  updatedAt?: string;
  challengeId?: string;
}

export interface ChallengeProgress {
  id: string;
  participant: ChallengeParticipant;
  date: string;
  target_achieved: boolean;
  actual_value: number;
  notes?: string;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  isAcquired: boolean;
  acquiredDate?: string;
  user?: User;
  challenge?: Challenge;
  createdAt?: string;
}

export interface UserBadge {
  id: string;
  user: string; // User ID
  badge: Badge; // Badge 객체
  acquiredDate: string;
}

export interface AICoachTip {
  id: string;
  message: string;
  type: 'warning' | 'suggestion' | 'encouragement';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}