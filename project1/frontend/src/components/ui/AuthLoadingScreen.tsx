'use client';

import React from 'react';

interface AuthLoadingScreenProps {
  message?: string;
}

export default function AuthLoadingScreen({ 
  message = '인증 상태를 확인하고 있습니다...' 
}: AuthLoadingScreenProps) {
  return (
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        {/* 로딩 스피너 */}
        <div className="flex justify-center">
          <div className="spinner"></div>
        </div>
        
        {/* 로딩 메시지 */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[var(--point-green)]">
            잠시만 기다려주세요
          </h2>
          <p className="text-gray-400 text-sm">
            {message}
          </p>
        </div>
        
        {/* 로딩 바 애니메이션 */}
        <div className="w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--point-green)] rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}