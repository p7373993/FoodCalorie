'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import ResetPasswordForm from '../components/auth/ResetPasswordForm';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ResetPasswordPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    setToken(tokenParam);

    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // 리다이렉트 중
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              유효하지 않은 링크
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.
            </p>
            <div className="mt-4">
              <a
                href="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                새로운 재설정 링크 요청하기
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            새 비밀번호 설정
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            새로운 비밀번호를 입력해주세요.
          </p>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}