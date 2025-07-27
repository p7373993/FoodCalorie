'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // 헤더를 숨길 페이지들 (로그인, 회원가입 등)
  const hideNavPages: string[] = [
    '/login',
    '/signup',
    '/auth',
  ];
  
  // 대부분의 페이지에서 헤더 표시, 특정 페이지에서만 숨김
  const shouldShowNav = !hideNavPages.some(page => pathname.startsWith(page));
  
  if (!shouldShowNav) return null;
  return <Navigation />;
} 