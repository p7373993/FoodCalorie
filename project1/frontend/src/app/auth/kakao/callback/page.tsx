'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function KakaoCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('카카오 로그인 처리 중...');

  useEffect(() => {
    const handleKakaoCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage('카카오 로그인에 실패했습니다.');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('인증 코드를 받지 못했습니다.');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          return;
        }

        // 카카오 토큰 교환 API 호출
        const response = await fetch('/api/auth/kakao/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (response.ok) {
          setStatus('success');
          setMessage('로그인 성공! 대시보드로 이동합니다.');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        } else {
          setStatus('error');
          setMessage('로그인 처리 중 오류가 발생했습니다.');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      } catch (error) {
        console.error('Kakao callback error:', error);
        setStatus('error');
        setMessage('네트워크 오류가 발생했습니다.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    };

    handleKakaoCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* 로딩 스피너 */}
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        )}

        {/* 성공 아이콘 */}
        {status === 'success' && (
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* 에러 아이콘 */}
        {status === 'error' && (
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}

        {/* 메시지 */}
        <div>
          <h2 className="text-xl font-nanum text-foreground mb-2">
            {status === 'loading' && '로그인 처리 중'}
            {status === 'success' && '로그인 성공'}
            {status === 'error' && '로그인 실패'}
          </h2>
          <p className="text-muted-foreground">{message}</p>
        </div>

        {/* 로딩 중일 때만 프로그레스 바 표시 */}
        {status === 'loading' && (
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        )}
      </div>
    </div>
  );
} 