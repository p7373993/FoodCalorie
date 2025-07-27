'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, ChevronDown, BarChart3, LogOut } from 'lucide-react';

interface UserData {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export function UserDropdown() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  const displayName = user.first_name && user.last_name 
    ? `${user.last_name}${user.first_name}` 
    : user.username;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 드롭다운 트리거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-gray-800 hover:bg-gray-700 rounded-full px-4 py-2 transition-colors duration-200 border border-gray-600"
      >
        {/* 프로필 아바타 */}
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
          {displayName.charAt(0).toUpperCase()}
        </div>
        
        {/* 사용자 이름 */}
        <span className="text-white font-medium">
          {displayName}
        </span>
        
        {/* 화살표 아이콘 */}
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-600 z-50">
          {/* 사용자 정보 헤더 */}
          <div className="px-4 py-3 border-b border-gray-600">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block text-white font-semibold hover:text-green-400 transition-colors cursor-pointer"
                >
                  {displayName} 님
                </Link>
                <p className="text-gray-400 text-sm">{user.email}</p>
              </div>
            </div>
          </div>

          {/* 메뉴 항목들 */}
          <div className="py-2">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span>대시보드</span>
            </Link>
            
            <button
              onClick={() => {
                handleLogout();
                setIsOpen(false);
              }}
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors w-full text-left"
            >
              <LogOut className="w-5 h-5" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}