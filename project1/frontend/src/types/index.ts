// Type definitions from provided Chegam prototype code

export type AppState = 'main' | 'loading' | 'result' | 'dashboard' | 'challengeList' | 'createChallenge' | 'challengeDetail' | 'calendar';

export type Challenge = { 
  id: string; 
  title: string; 
  description: string; 
  type: 'CALORIE_LIMIT' | 'PROTEIN_MINIMUM'; 
  goal: number; 
  creatorId: string; 
  participants: string[]; 
};

export type Meal = { 
  id: string; 
  imageUrl: string; 
  calories: number; 
  timestamp: Date | { seconds: number; nanoseconds: number; }; 
};

export type WeightEntry = { 
  id: string; 
  weight: number; 
  timestamp: { seconds: number; nanoseconds: number; }; 
};

export type GamificationData = { 
  points: number; 
  badges: string[]; 
};

export type ActionType = 'record_meal' | 'record_weight' | 'create_challenge' | 'join_challenge';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Django REST Framework 페이지네이션 응답
export interface PaginatedResponse<T = any> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MLServerTaskResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  result_data?: {
    estimated_mass: number;
    confidence_score: number;
    food_type: string;
    calories: number;
  };
}

// 새로운 챌린지 시스템 타입들
export interface ChallengeRoom {
  id: number;
  name: string;
  target_calorie: number;
  tolerance: number;
  description: string;
  is_active: boolean;
  created_at: string;
  dummy_users_count: number;
  participant_count: number;
}

export interface UserChallenge {
  id: number;
  user: number;
  room: number;
  room_name: string;
  target_calorie: number;
  user_height: number;
  user_weight: number;
  user_target_weight: number;
  user_challenge_duration_days: number;
  user_weekly_cheat_limit: number;
  min_daily_meals: number;
  challenge_cutoff_time: string;
  current_streak_days: number;
  max_streak_days: number;
  remaining_duration_days: number;
  current_weekly_cheat_count: number;
  total_success_days: number;
  total_failure_days: number;
  status: 'active' | 'inactive' | 'completed';
  challenge_start_date: string;
  challenge_end_date: string;
  is_active: boolean;
  last_activity_date: string | null;
  created_at: string;
}

export interface ChallengeJoinRequest {
  room_id: number;
  user_height: number;
  user_weight: number;
  user_target_weight: number;
  user_challenge_duration_days: number;
  user_weekly_cheat_limit: number;
  min_daily_meals: number;
  challenge_cutoff_time: string;
}

export interface DailyChallengeRecord {
  id: number;
  user_challenge: number;
  date: string;
  total_calories: number;
  target_calories: number;
  is_success: boolean;
  is_cheat_day: boolean;
  meal_count: number;
  created_at: string;
  updated_at: string;
}

export interface CheatDayRequest {
  id: number;
  user_challenge: number;
  date: string;
  requested_at: string;
  is_approved: boolean;
  reason?: string;
}

export interface ChallengeBadge {
  id: number;
  name: string;
  description: string;
  icon: string;
  condition_type: 'streak' | 'completion' | 'total_success' | 'perfect_week';
  condition_value: number;
  is_active: boolean;
  created_at: string;
}

export interface UserChallengeBadge {
  id: number;
  user: number;
  badge: ChallengeBadge;
  earned_at: string;
  user_challenge?: number;
}

export interface CheatDayStatus {
  weekly_limit: number;
  used_count: number;
  remaining_count: number;
  can_use_today: boolean;
  used_dates: string[];
  week_start: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  current_streak: number;
  total_success: number;
  start_date: string;
  is_me?: boolean;
}

export interface ChallengeStatistics {
  current_streak: number;
  max_streak: number;
  total_success_days: number;
  total_failure_days: number;
  success_rate: number;
  average_calories: number;
  remaining_days: number;
  days_since_start: number;
}

export interface ChallengeReportData {
  challenge_id: number;
  challenge_room: ChallengeRoom;
  completion_date: string;
  total_days: number;
  success_days: number;
  max_streak: number;
  current_streak: number;
  success_rate: number;
  average_calorie_intake: number;
  total_cheat_days_used: number;
  earned_badges: UserChallengeBadge[];
  weekly_breakdown: {
    week: number;
    success_count: number;
    total_count: number;
    cheat_used: number;
  }[];
  achievement_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  completion_message: string;
  recommendations: string[];
}

export interface ChallengeAction {
  action: 'extend' | 'new_challenge' | 'complete';
  extension_days?: number;
  new_challenge_room_id?: number;
}

export interface BadgeAnimation {
  badge: ChallengeBadge;
  isNew: boolean;
  animation: 'bounce' | 'glow' | 'shake' | 'none';
}

// Component Props types
export interface MainScreenProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGoToDashboard: () => void;
}

export interface LoadingScreenProps {
  onCancel: () => void;
}

export interface ResultScreenProps {
  imageUrl: string | null;
  onSaveAndGoToDashboard: (mealData: Omit<Meal, 'id' | 'timestamp'>) => void;
  onReset: () => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface WeightRecordModalProps extends ModalProps {
  onSave: (weight: string) => void;
}

export interface FormattedAiResponseProps {
  text: string;
}