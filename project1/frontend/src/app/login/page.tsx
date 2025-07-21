'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KakaoLoginButton } from '@/components/auth/KakaoLoginButton';
import { LoginForm } from '@/components/auth/LoginForm';
import { HelperLinks } from '@/components/auth/HelperLinks';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  
  useEffect(() => {
    // 이미 로그인한 사용자는 대시보드로 리다이렉트
    const token = localStorage.getItem('authToken');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#011936] to-[#233a50] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-6 animate-fade-in">
        {/* 로고 및 앱 이름 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#011936]">체감</h1>
          <p className="text-sm text-gray-500 mt-2">다이어트 생존 게임</p>
        </div>

        {/* 로그인 폼 */}
        <LoginForm />

        {/* 헬퍼 링크 */}
        <HelperLinks />

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">또는</span>
          </div>
        </div>

        {/* 카카오 로그인 버튼 */}
        <KakaoLoginButton />
      </div>
    </div>
  );
}