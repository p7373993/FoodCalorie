'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { User, UserProfile } from '@/types';

// 인증 상태 타입 정의
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

// 액션 타입 정의
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_AUTH'; payload: { user: User; profile: UserProfile } }
  | { type: 'CLEAR_AUTH' }
  | { type: 'UPDATE_PROFILE'; payload: UserProfile };

// 초기 상태
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  profile: null,
  isLoading: true, // 초기 로딩 상태
  error: null,
};

// 리듀서 함수
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_AUTH':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        profile: action.payload.profile,
        error: null,
        isLoading: false,
      };
    
    case 'CLEAR_AUTH':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        profile: null,
        error: null,
        isLoading: false,
      };
    
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: action.payload,
      };
    
    default:
      return state;
  }
};

// Context 타입 정의
interface AuthContextType {
  state: AuthState;
  
  // 인증 액션
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  
  // 프로필 액션
  updateProfile: (profile: UserProfile) => void;
  
  // UI 액션
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Context 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider 컴포넌트
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [authCheckAttempted, setAuthCheckAttempted] = React.useState(false);

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    if (!authCheckAttempted) {
      checkAuthStatus();
    }

    // 인증 관련 이벤트 리스너 등록
    const handleSessionExpired = (event: CustomEvent) => {
      console.log('Session expired:', event.detail);
      dispatch({ type: 'CLEAR_AUTH' });
      dispatch({ 
        type: 'SET_ERROR', 
        payload: event.detail.message || '세션이 만료되었습니다. 다시 로그인해주세요.' 
      });
      
      // 세션 만료 시 추가 정리 작업
      if (typeof window !== 'undefined') {
        // 세션 스토리지 정리
        sessionStorage.removeItem('auth_temp_data');
        
        // 현재 페이지 정보 저장 (로그인 후 돌아가기 위해)
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          sessionStorage.setItem('redirect_after_login', currentPath);
        }
        
        // 로그인 페이지로 리다이렉트 (지연 없이 즉시)
        const redirectUrl = event.detail.redirectUrl || '/login';
        window.location.href = redirectUrl;
      }
    };

    const handleCSRFError = (event: CustomEvent) => {
      console.log('CSRF error:', event.detail);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: event.detail.message || 'CSRF 토큰 오류가 발생했습니다.' 
      });
      
      // CSRF 에러 처리 개선
      if (typeof window !== 'undefined') {
        // 자동 새로고침이 권장되는 경우
        if (event.detail.shouldRefresh) {
          // 사용자에게 알림 후 자동 새로고침 (3초 후)
          console.warn('CSRF 토큰 오류로 인해 3초 후 페이지를 새로고침합니다.');
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
        
        // CSRF 에러 상세 정보 로깅
        console.error('CSRF Error Details:', {
          reason: event.detail.reason,
          suggestion: event.detail.suggestion,
          errorCode: event.detail.errorCode,
          timestamp: event.detail.timestamp
        });
      }
    };

    const handleManualLogout = () => {
      console.log('Manual logout requested');
      logout(); // 수동 로그아웃 처리
    };

    // 이벤트 리스너 등록
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:session-expired', handleSessionExpired as EventListener);
      window.addEventListener('auth:csrf-error', handleCSRFError as EventListener);
      window.addEventListener('auth:manual-logout', handleManualLogout as EventListener);
    }

    // 클린업
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:session-expired', handleSessionExpired as EventListener);
        window.removeEventListener('auth:csrf-error', handleCSRFError as EventListener);
        window.removeEventListener('auth:manual-logout', handleManualLogout as EventListener);
      }
    };
  }, [authCheckAttempted]);

  // 인증 상태 확인
  const checkAuthStatus = async () => {
    // 이미 인증 확인을 시도했다면 중복 호출 방지
    if (authCheckAttempted) {
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      setAuthCheckAttempted(true);
      
      const response = await apiClient.checkAuthStatus();
      
      if (response.success && response.data) {
        dispatch({ 
          type: 'SET_AUTH', 
          payload: { 
            user: response.data.user || response.data, 
            profile: response.data.profile || null 
          } 
        });
      } else {
        dispatch({ type: 'CLEAR_AUTH' });
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      
      // 인증 상태 확인 실패 시 특별한 처리는 하지 않음
      // (세션 만료 등은 이미 이벤트 리스너에서 처리됨)
      dispatch({ type: 'CLEAR_AUTH' });
      
      // 403 에러는 정상적인 인증 실패이므로 에러 메시지 표시하지 않음
      if (error instanceof Error && 
          error.name !== 'AuthenticationError' && 
          !error.message.includes('403')) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: '인증 상태 확인 중 오류가 발생했습니다.' 
        });
      }
    }
  };

  // 로그인
  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await apiClient.login(email, password);
      
      if (response.success) {
        setAuthCheckAttempted(false); // 로그인 성공 시 인증 확인 플래그 리셋
        dispatch({ 
          type: 'SET_AUTH', 
          payload: { 
            user: response.user || response.data?.user, 
            profile: response.profile || response.data?.profile 
          } 
        });
        return { success: true, message: '로그인에 성공했습니다.' };
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message || '로그인에 실패했습니다.' });
        return { success: false, message: response.message || '로그인에 실패했습니다.' };
      }
    } catch (error) {
      let errorMessage = '네트워크 오류가 발생했습니다.';
      
      // 커스텀 에러 타입에 따른 처리
      if (error instanceof Error) {
        if (error.name === 'AuthenticationError') {
          errorMessage = error.message || '인증에 실패했습니다.';
        } else if (error.name === 'CSRFError') {
          errorMessage = 'CSRF 토큰 오류가 발생했습니다. 페이지를 새로고침해주세요.';
        } else if (error.name === 'PermissionError') {
          errorMessage = error.message || '권한이 부족합니다.';
        } else {
          errorMessage = error.message;
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, message: errorMessage };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // 로그아웃 API 실패해도 클라이언트 상태는 정리
      // 단, 사용자에게는 알림 제공
      if (error instanceof Error && error.name === 'CSRFError') {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: 'CSRF 토큰 오류로 인해 로그아웃 처리에 문제가 있었지만, 로컬 세션은 정리되었습니다.' 
        });
      }
    } finally {
      setAuthCheckAttempted(false); // 로그아웃 시 인증 확인 플래그 리셋
      dispatch({ type: 'CLEAR_AUTH' });
      
      // 로그아웃 후 로그인 페이지로 리다이렉트
      if (typeof window !== 'undefined') {
        // 세션 스토리지 정리
        sessionStorage.removeItem('auth_temp_data');
        sessionStorage.removeItem('redirect_after_login');
        
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
      }
    }
  };

  // 프로필 업데이트
  const updateProfile = (profile: UserProfile) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: profile });
  };

  // 에러 설정
  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  // 에러 클리어
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    checkAuthStatus,
    updateProfile,
    setError,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 편의 훅들
export const useAuthState = () => {
  const { state } = useAuth();
  return {
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    profile: state.profile,
    isLoading: state.isLoading,
    error: state.error,
  };
};

export const useAuthActions = () => {
  const { login, logout, checkAuthStatus, updateProfile, setError, clearError } = useAuth();
  return {
    login,
    logout,
    checkAuthStatus,
    updateProfile,
    setError,
    clearError,
  };
};

export default AuthContext;