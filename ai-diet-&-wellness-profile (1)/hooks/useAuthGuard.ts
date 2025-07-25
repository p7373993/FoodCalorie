'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface UseAuthGuardOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { redirectTo = '/login', requireAuth = true } = options;
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
    } else if (!requireAuth && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router]);

  return { isAuthenticated, isLoading };
}