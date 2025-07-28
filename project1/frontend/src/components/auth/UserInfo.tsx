'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserData {
  username: string;
  email: string;
}

interface ProfileData {
  nickname: string;
}

export default function UserInfo() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const userData = localStorage.getItem('user');
    const profileData = localStorage.getItem('profile');
    
    if (userData) {
      setUser(JSON.parse(userData));
    }
    if (profileData) {
      setProfile(JSON.parse(profileData));
    }
  }, []);

  const handleLogout = () => {
    // localStorage 정리
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    
    // 로그인 페이지로 이동
    router.push('/login');
  };

  const handleDashboard = () => {
    router.push('/dashboard');
  };

  if (!user) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        {/* 사용자 정보 버튼 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-3 bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-full px-4 py-2 hover:border-green-400/50 transition-all duration-200"
        >
          {/* 아바타 */}
          <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-black font-bold text-sm">
            {(profile?.nickname || user.username).charAt(0).toUpperCase()}
          </div>
          
          {/* 사용자명 */}
          <span className="text-white text-sm font-medium">
            {profile?.nickname || user.username}
          </span>
          
          {/* 드롭다운 아이콘 */}
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 드롭다운 메뉴 */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <p className="text-white font-medium text-sm">{profile?.nickname || user.username}</p>
              <p className="text-gray-400 text-xs">{user.email}</p>
            </div>
            
            <div className="py-1">
              <button
                onClick={() => router.push('/profile')}
                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm">프로필</span>
              </button>
              
              <button
                onClick={() => router.push('/upload')}
                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm">업로드</span>
              </button>
              
              <button
                onClick={handleDashboard}
                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                <span className="text-sm">대시보드</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-red-900/20 hover:text-red-400 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm">로그아웃</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* 클릭 외부 영역으로 드롭다운 닫기 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[-1]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 