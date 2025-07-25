'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // 리다이렉트 중
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 헤더 섹션 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            계정에 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            또는{' '}
            <a
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              새 계정 만들기
            </a>
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          <LoginForm />
        </div>

        {/* 추가 정보 */}
        <div className="text-center text-xs text-gray-500">
          <p>
            로그인하면{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              서비스 약관
            </a>
            과{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              개인정보 처리방침
            </a>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}