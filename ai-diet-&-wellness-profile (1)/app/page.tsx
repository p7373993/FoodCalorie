
'use client';

import { useAuth } from "../contexts/AuthContext";
import ProfileDashboard from "@/app/components/profile-dashboard";
import { createMockData } from "@/app/lib/data";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function Home() {
  const { isAuthenticated, isLoading, user, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Diet & Wellness에 오신 것을 환영합니다</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            개인 맞춤형 식단 관리와 건강 챌린지를 통해 더 건강한 라이프스타일을 만들어보세요.
          </p>
          <div className="space-x-4">
            <a
              href="/login"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              로그인
            </a>
            <a
              href="/register"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              회원가입
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Data is fetched on the server
  const { userProfile, badges, dailyLogs } = createMockData();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          안녕하세요, {profile?.nickname || user?.email}님!
        </h1>
        <p className="text-gray-600">
          오늘도 건강한 하루를 위한 여정을 시작해보세요.
        </p>
      </div>
      
      <ProfileDashboard
        userProfile={userProfile}
        badges={badges}
        dailyLogs={dailyLogs}
      />
    </div>
  );
}
