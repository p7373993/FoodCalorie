'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/contexts/AuthContext';

interface UseAuthGuardOptions {
  redirectTo?: string;
  requireAuth?: boolean;
  requireGuest?: boolean;
}

/**
 * 인증 상태에 따른 라우트 보호 훅
 * 
 * @param options - 보호 옵션
 * @param options.redirectTo - 리다이렉트할 경로 (기본: '/login' 또는 '/dashboard')
 * @param options.requireAuth - 인증이 필요한 페이지인지 여부 (기본: true)
 * @param options.requireGuest - 비인증 사용자만 접근 가능한 페이지인지 여부 (기본: false)
 */
export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const {
    redirectTo,
    requireAuth = true,
    requireGuest = false
  } = options;

  const router = useRouter();
  const { isAuthenticated, isLoading, error } = useAuthState();

  useEffect(() => {
    // 로딩 중이면 대기
    if (isLoading) {
      return;
    }

    // 인증이 필요한 페이지인데 인증되지 않은 경우
    if (requireAuth && !isAuthenticated) {
      const loginUrl = redirectTo || '/login';
      console.log('Authentication required, redirecting to:', loginUrl);
      
      // 현재 페이지 정보를 저장하여 로그인 후 돌아올 수 있도록 함
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== '/login' && currentPath !== '/register') {
          sessionStorage.setItem('redirect_after_login', currentPath);
        }
      }
      
      router.push(loginUrl);
      return;
    }

    // 비인증 사용자만 접근 가능한 페이지인데 인증된 경우
    if (requireGuest && isAuthenticated) {
      const dashboardUrl = redirectTo || '/dashboard';
      console.log('Already authenticated, redirecting to:', dashboardUrl);
      
      // 로그인 후 리다이렉트 처리
      if (typeof window !== 'undefined') {
        const redirectAfterLogin = sessionStorage.getItem('redirect_after_login');
        if (redirectAfterLogin) {
          sessionStorage.removeItem('redirect_after_login');
          router.push(redirectAfterLogin);
          return;
        }
      }
      
      router.push(dashboardUrl);
      return;
    }
  }, [isAuthenticated, isLoading, requireAuth, requireGuest, redirectTo, router]);

  return {
    isAuthenticated,
    isLoading,
    error,
    // 페이지를 렌더링해도 되는지 여부
    canRender: !isLoading && (
      (requireAuth && isAuthenticated) ||
      (requireGuest && !isAuthenticated) ||
      (!requireAuth && !requireGuest)
    ),
    // 에러 상태 정보
    hasAuthError: !!error,
    authError: error
  };
}

/**
 * 인증이 필요한 페이지를 보호하는 훅
 */
export function useRequireAuth(redirectTo?: string) {
  return useAuthGuard({
    requireAuth: true,
    redirectTo
  });
}

/**
 * 비인증 사용자만 접근 가능한 페이지를 보호하는 훅 (로그인, 회원가입 페이지 등)
 */
export function useRequireGuest(redirectTo?: string) {
  return useAuthGuard({
    requireAuth: false,
    requireGuest: true,
    redirectTo
  });
}

/**
 * 선택적 인증 페이지를 위한 훅 (인증 여부와 관계없이 접근 가능)
 */
export function useOptionalAuth() {
  return useAuthGuard({
    requireAuth: false,
    requireGuest: false
  });
}