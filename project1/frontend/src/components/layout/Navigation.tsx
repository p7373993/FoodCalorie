'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Camera, 
  Trophy, 
  User,
  BarChart2,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const navigationItems = [
  { href: '/dashboard', label: '대시보드', icon: Home },
  { href: '/log', label: '식사 기록', icon: Camera },
  { href: '/challenges', label: '챌린지', icon: Trophy },
  { href: '/statistics', label: '통계', icon: BarChart2 },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined') {
      setUsername(localStorage.getItem('username'));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    router.push('/login');
  };

  return (
    <nav className="bg-[#011936] sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link href="/dashboard" className="flex items-center">
            <span className="text-xl font-extrabold text-white">체감</span>
          </Link>

          {/* 데스크탑 네비게이션 */}
          <div className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors
                    ${isActive
                      ? 'bg-white text-[#011936]'
                      : 'text-white hover:bg-[#233a50] hover:text-white'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* 사용자 메뉴 */}
          <div className="hidden md:flex items-center space-x-4">
            {username && (
              <Link
                href={`/profile/${username}`}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors
                  ${pathname.startsWith(`/profile/${username}`)
                    ? 'bg-white text-[#011936]'
                    : 'text-white hover:bg-[#233a50] hover:text-white'}
                `}
              >
                <User className="w-4 h-4" />
                <span>{username}</span>
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-bold text-white hover:bg-[#233a50] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white p-2"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 space-y-1 animate-fade-in">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors
                    ${isActive
                      ? 'bg-white text-[#011936]'
                      : 'text-white hover:bg-[#233a50] hover:text-white'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {username && (
              <Link
                href={`/profile/${username}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors
                  ${pathname.startsWith(`/profile/${username}`)
                    ? 'bg-white text-[#011936]'
                    : 'text-white hover:bg-[#233a50] hover:text-white'}
                `}
              >
                <User className="w-5 h-5" />
                <span>프로필</span>
              </Link>
            )}
            
            <button 
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center space-x-3 px-4 py-3 w-full text-left rounded-xl text-sm font-bold text-white hover:bg-[#233a50] transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}