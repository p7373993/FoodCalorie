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