'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // 헤더를 보여줄 페이지들만 명시적으로 지정 (현재는 없음)
  const showNavPages: string[] = [
    // '/some-admin-page', // 필요시 추가
  ];
  
  // 대부분의 페이지에서 헤더 숨김
  const shouldShowNav = showNavPages.some(page => pathname.startsWith(page));
  
  if (!shouldShowNav) return null;
  return <Navigation />;
} 