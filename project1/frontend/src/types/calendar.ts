// 캘린더 관련 타입 정의
export interface CalendarUserProfile {
  name: string;
  avatar_url?: string;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
}

export interface CalendarBadge {
  id: number;
  name: string;
  icon: string;
  description: string;
}

export interface CalendarMealNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutriScore: string;
}

export interface CalendarMeal {
  id: number;
  foodName: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  photo_url: string;
  nutrients: CalendarMealNutrients;
  ai_comment: string;
  date: string;
  time?: string;
}

export interface CalendarDailyLog {
  date: string;
  meals: CalendarMeal[];
  mission: string;
  emotion: string;
  memo: string;
  daily_goal?: string;
}

export interface CalendarWeeklyAnalysis {
  week_start: string;
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
  calorie_achievement_rate: number;
  protein_achievement_rate: number;
  carbs_achievement_rate: number;
  fat_achievement_rate: number;
  ai_advice: string;
}

export interface CalendarData {
  user_profile: CalendarUserProfile;
  badges: CalendarBadge[];
  daily_logs: CalendarDailyLog[];
  weekly_analysis?: CalendarWeeklyAnalysis;
}