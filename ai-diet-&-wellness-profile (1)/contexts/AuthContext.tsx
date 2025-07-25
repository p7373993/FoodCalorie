'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  AuthContextType,
  User,
  UserProfile,
  LoginData,
  RegisterData,
  ProfileUpdateData,
  PasswordChangeData,
  PasswordResetData,
} from '../types';
import { authApi, AuthApiError } from '../lib/authApi';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenRefreshTimer, setTokenRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  const isAuthenticated = !!user && !!profile;

  // JWT 토큰 자동 갱신 설정
  const setupTokenRefresh = useCallback(() => {
    if (tokenRefreshTimer) {
      clearInterval(tokenRefreshTimer);
    }

    const timer = setInterval(async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.warn('Token refresh failed:', error);
        logout();
      }
    }, 50 * 60 * 1000); // 50분마다 갱신 (토큰 만료 1시간 전)

    setTokenRefreshTimer(timer);
  }, [tokenRefreshTimer]);

  // 토큰 갱신
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authApi.refreshToken();
      authApi.saveTokens({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      });
      setUser(response.user);
      setProfile(response.profile);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      authApi.clearTokens();
      setUser(null);
      setProfile(null);
      return false;
    }
  }, []);

  // 로그인
  const login = useCallback(async (data: LoginData): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authApi.login(data);
      
      authApi.saveTokens({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      });
      
      setUser(response.user);
      setProfile(response.profile);
      setupTokenRefresh();
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }
      throw new AuthApiError({
        code: 'LOGIN_FAILED',
        message: '로그인 중 오류가 발생했습니다.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [setupTokenRefresh]);

  // 회원가입
  const register = useCallback(async (data: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authApi.register(data);
      
      authApi.saveTokens({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      });
      
      setUser(response.user);
      setProfile(response.profile);
      setupTokenRefresh();
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }
      throw new AuthApiError({
        code: 'REGISTER_FAILED',
        message: '회원가입 중 오류가 발생했습니다.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [setupTokenRefresh]);

  // 로그아웃
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn('Logout API failed:', error);
    } finally {
      authApi.clearTokens();
      setUser(null);
      setProfile(null);
      
      if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
        setTokenRefreshTimer(null);
      }
    }
  }, [tokenRefreshTimer]);

  // 프로필 업데이트
  const updateProfile = useCallback(async (data: ProfileUpdateData): Promise<void> => {
    try {
      const updatedProfile = await authApi.updateProfile(data);
      setProfile(updatedProfile);
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }
      throw new AuthApiError({
        code: 'PROFILE_UPDATE_FAILED',
        message: '프로필 업데이트 중 오류가 발생했습니다.',
      });
    }
  }, []);

  // 비밀번호 변경
  const changePassword = useCallback(async (data: PasswordChangeData): Promise<void> => {
    try {
      await authApi.changePassword(data);
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }
      throw new AuthApiError({
        code: 'PASSWORD_CHANGE_FAILED',
        message: '비밀번호 변경 중 오류가 발생했습니다.',
      });
    }
  }, []);

  // 비밀번호 재설정 요청
  const requestPasswordReset = useCallback(async (data: PasswordResetData): Promise<void> => {
    try {
      await authApi.requestPasswordReset(data);
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }
      throw new AuthApiError({
        code: 'PASSWORD_RESET_REQUEST_FAILED',
        message: '비밀번호 재설정 요청 중 오류가 발생했습니다.',
      });
    }
  }, []);

  // 초기 인증 상태 확인
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = authApi.getAccessToken();
      const refreshTokenValue = authApi.getRefreshToken();

      if (!accessToken || !refreshTokenValue) {
        setIsLoading(false);
        return;
      }

      try {
        // 현재 토큰으로 프로필 정보 가져오기 시도
        const profileData = await authApi.getProfile();
        setUser(profileData.user);
        setProfile(profileData.profile);
        setupTokenRefresh();
      } catch (error) {
        // 토큰이 만료된 경우 갱신 시도
        try {
          const success = await refreshToken();
          if (success) {
            setupTokenRefresh();
          }
        } catch (refreshError) {
          console.warn('Initial token refresh failed:', refreshError);
          authApi.clearTokens();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
      }
    };
  }, [refreshToken, setupTokenRefresh]);

  const contextValue: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}