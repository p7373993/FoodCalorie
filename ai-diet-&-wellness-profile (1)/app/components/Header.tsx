'use client';

import { useAuth } from '../../contexts/AuthContext';
import AuthNavigation from './AuthNavigation';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 및 브랜드 */}
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">AI Diet & Wellness</span>
            </a>
          </div>

          {/* 네비게이션 메뉴 */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              대시보드
            </a>
            <a href="/challenges" className="text-gray-700 hover:text-blue-600 transition-colors">
              챌린지
            </a>
            <a href="/meal-analysis" className="text-gray-700 hover:text-blue-600 transition-colors">
              식단 분석
            </a>
            <a href="/ai-coach" className="text-gray-700 hover:text-blue-600 transition-colors">
              AI 코치
            </a>
          </nav>

          {/* 인증 네비게이션 */}
          <div className="flex items-center">
            <AuthNavigation />
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 (필요시 확장) */}
      <div className="md:hidden">
        {/* 모바일 네비게이션은 추후 구현 */}
      </div>
    </header>
  );
}