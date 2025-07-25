// 사용자 인증 관련 타입 정의
export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  date_joined: string;
}

export interface UserProfile {
  id: number;
  user: number;
  nickname: string;
  height?: number;
  weight?: number;
  age?: number;
  gender?: 'male' | 'female';
  profile_image?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  profile: UserProfile;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm: string;
  nickname: string;
}

export interface LoginData {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface ProfileUpdateData {
  nickname?: string;
  height?: number;
  weight?: number;
  age?: number;
  gender?: 'male' | 'female';
  profile_image?: File;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface PasswordResetData {
  email: string;
}

export interface PasswordResetConfirmData {
  token: string;
  new_password: string;
  new_password_confirm: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  changePassword: (data: PasswordChangeData) => Promise<void>;
  requestPasswordReset: (data: PasswordResetData) => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}