'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ChallengeProvider } from '@/contexts/ChallengeContext';
import ConditionalNavigation from '@/components/layout/ConditionalNavigation';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // QueryClient를 useState로 생성하여 컴포넌트 리렌더링 시에도 동일한 인스턴스 유지
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 기본 캐시 시간: 5분
        staleTime: 5 * 60 * 1000,
        // 가비지 컬렉션 시간: 10분  
        gcTime: 10 * 60 * 1000,
        // 백그라운드에서 자동 새로고침 활성화
        refetchOnWindowFocus: true,
        // 네트워크 재연결 시 자동 새로고침
        refetchOnReconnect: true,
        // 재시도 설정
        retry: (failureCount, error: any) => {
          // 4xx 클라이언트 에러는 재시도하지 않음
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          // 최대 3번까지 재시도
          return failureCount < 3;
        },
        // 재시도 지연 시간 (지수 백오프)
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // 뮤테이션 재시도: 1번만
        retry: 1,
        // 뮤테이션 실패 시 즉시 에러 표시
        retryDelay: 1000,
      },
    },
  }));

  return (
    <html lang="ko">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <ChallengeProvider>
            <div className="min-h-screen bg-[var(--main-bg)]">
              <ConditionalNavigation />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
            </div>
          </ChallengeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}