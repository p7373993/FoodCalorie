'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KakaoLoginButton } from '@/components/auth/KakaoLoginButton';
import { LoginForm } from '@/components/auth/LoginForm';
import { HelperLinks } from '@/components/auth/HelperLinks';
import AuthLoadingScreen from '@/components/ui/AuthLoadingScreen';
import { useRequireGuest } from '@/hooks/useAuthGuard';

function LoginContent() {
  const searchParams = useSearchParams();
  const { canRender, isLoading } = useRequireGuest('/upload');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  useEffect(() => {
    // 회원가입 성공 메시지 표시
    if (searchParams.get('registered') === 'true') {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000); // 5초 후 자동 숨김
    }
  }, [searchParams]);

  // 인증 확인 중이거나 이미 로그인된 사용자면 로딩 화면 표시
  if (isLoading || !canRender) {
    return <AuthLoadingScreen message="로그인 상태를 확인하고 있습니다..." />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 회원가입 성공 메시지 */}
        {showSuccessMessage && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 mb-4">
            <p className="text-sm text-green-400 text-center font-medium">
              🎉 회원가입이 완료되었습니다! 로그인해주세요.
            </p>
          </div>
        )}

        {/* 로고 및 앱 이름 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-green-400 mb-4">체감</h1>
          <p className="text-lg text-gray-300">오로지 한 장으로 변화한!</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-8">
          <LoginForm />
        </div>

        {/* 헬퍼 링크 */}
        <div className="text-center">
          <HelperLinks />
        </div>

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gray-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-black text-gray-400">또는</span>
          </div>
        </div>

        {/* 카카오 로그인 버튼 */}
        <KakaoLoginButton />

        {/* 저작권 */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">© 2024 Chegam. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen message="로그인 페이지를 불러오고 있습니다..." />}>
      <LoginContent />
    </Suspense>
  );
}