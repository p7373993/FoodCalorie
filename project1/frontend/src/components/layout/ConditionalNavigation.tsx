'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

export function ConditionalNavigation() {
  const pathname = usePathname();
  const hideNav = pathname.startsWith('/login') || pathname.startsWith('/auth');
  if (hideNav) return null;
  return <Navigation />;
} 