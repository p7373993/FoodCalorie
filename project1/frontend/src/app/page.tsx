'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthState();
  
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // 로그인된 사용자 → 이미지 업로드 화면 (핵심 기능)
        router.replace('/upload');
      } else {
        // 비로그인 사용자 → 로그인 페이지
        router.replace('/login');
      }
    }
  }, [router, isAuthenticated, isLoading]);

  // 리다이렉트 중 표시할 로딩 화면
  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-400 mx-auto mb-4"></div>
        <p className="text-gray-400">페이지로 이동 중...</p>
      </div>
    </div>
  );
}