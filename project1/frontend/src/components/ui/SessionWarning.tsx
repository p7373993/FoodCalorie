'use client';

import React, { useState, useEffect } from 'react';
import { useAuthActions } from '@/contexts/AuthContext';

interface SessionWarningProps {
  warningThreshold?: number; // 세션 만료 몇 분 전에 경고할지 (기본: 5분)
  checkInterval?: number; // 세션 상태 확인 간격 (기본: 30초)
}

export default function SessionWarning({ 
  warningThreshold = 5 * 60 * 1000, // 5분 (밀리초)
  checkInterval = 30 * 1000 // 30초 (밀리초)
}: SessionWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { checkAuthStatus } = useAuthActions();

  useEffect(() => {
    let warningTimer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;

    const checkSessionExpiry = async () => {
      try {
        // 세션 상태 확인
        await checkAuthStatus();
        
        // 세션 만료 시간 확인 (서버에서 제공하는 경우)
        // 현재는 클라이언트 측에서 대략적인 시간 계산
        const sessionData = sessionStorage.getItem('session_expiry');
        if (sessionData) {
          const expiryTime = new Date(sessionData).getTime();
          const currentTime = new Date().getTime();
          const timeUntilExpiry = expiryTime - currentTime;

          if (timeUntilExpiry <= warningThreshold && timeUntilExpiry > 0) {
            setTimeLeft(timeUntilExpiry);
            setShowWarning(true);
            
            // 카운트다운 시작
            countdownTimer = setInterval(() => {
              setTimeLeft(prev => {
                const newTime = prev - 1000;
                if (newTime <= 0) {
                  setShowWarning(false);
                  return 0;
                }
                return newTime;
              });
            }, 1000);
          }
        }
      } catch (error) {
        console.error('세션 상태 확인 중 오류:', error);
      }
    };

    // 주기적으로 세션 상태 확인
    warningTimer = setInterval(checkSessionExpiry, checkInterval);
    
    // 초기 확인
    checkSessionExpiry();

    return () => {
      if (warningTimer) clearInterval(warningTimer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [warningThreshold, checkInterval, checkAuthStatus]);

  const handleExtendSession = async () => {
    try {
      // 세션 연장을 위해 인증 상태 재확인
      await checkAuthStatus();
      setShowWarning(false);
      
      // 세션 만료 시간 업데이트 (예시)
      const newExpiryTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2시간 연장
      sessionStorage.setItem('session_expiry', newExpiryTime.toISOString());
    } catch (error) {
      console.error('세션 연장 중 오류:', error);
    }
  };

  const handleLogout = () => {
    setShowWarning(false);
    // 로그아웃 처리는 AuthContext에서 처리
    window.dispatchEvent(new CustomEvent('auth:manual-logout'));
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              세션 만료 경고
            </h3>
            <p className="text-sm text-gray-500">
              세션이 곧 만료됩니다
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            세션이 <span className="font-bold text-red-600">{formatTime(timeLeft)}</span> 후에 만료됩니다.
          </p>
          <p className="text-sm text-gray-500">
            계속 사용하시려면 세션을 연장하거나, 작업을 저장한 후 다시 로그인해주세요.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleExtendSession}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            세션 연장
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
          >
            로그아웃
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            자동으로 로그아웃되기까지: {formatTime(timeLeft)}
          </p>
        </div>
      </div>
    </div>
  );
}