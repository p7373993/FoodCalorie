'use client';

import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function AuthNavigation() {
  const { user, profile, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-gray-600">로딩 중...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-4">
        <a
          href="/login"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          로그인
        </a>
        <a
          href="/register"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          회원가입
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        {profile?.profile_image && (
          <img
            src={profile.profile_image}
            alt="프로필"
            className="w-8 h-8 rounded-full object-cover"
          />
        )}
        <span className="text-sm font-medium text-gray-700">
          {profile?.nickname || user?.email}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <a
          href="/profile"
          className="text-gray-600 hover:text-gray-800 text-sm"
        >
          프로필
        </a>
        <button
          onClick={logout}
          className="text-gray-600 hover:text-gray-800 text-sm"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}