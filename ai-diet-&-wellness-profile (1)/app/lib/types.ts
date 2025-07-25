
export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutriScore: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface Meal {
  id: string;
  name: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  photoUrl: string;
  nutrients: Nutrients;
  aiComment: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  mission: string;
  emotion: string; // Emoji
  memo: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string; // Emoji
  description: string;
}

export interface UserProfile {
    name: string;
    avatarUrl: string;
    calorieGoal: number;
    nutrientGoals: {
        protein: number;
        carbs: number;
        fat: number;
    };
}
