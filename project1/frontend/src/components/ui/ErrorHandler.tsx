'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ErrorNotification {
  id: string;
  type: 'session-expired' | 'csrf-error' | 'permission-error' | 'general-error';
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  autoClose?: boolean;
  duration?: number;
}

export default function ErrorHandler() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

  useEffect(() => {
    // 세션 만료 처리
    const handleSessionExpired = (event: CustomEvent) => {
      const notification: ErrorNotification = {
        id: `session-expired-${Date.now()}`,
        type: 'session-expired',
        message: event.detail.message || '세션이 만료되었습니다. 다시 로그인해주세요.',
        action: {
          label: '로그인하기',
          handler: () => {
            const redirectUrl = event.detail.redirectUrl || '/login';
            // 현재 페이지 정보를 쿼리 파라미터로 전달하여 로그인 후 돌아올 수 있도록 함
            const currentPath = window.location.pathname;
            const loginUrl = currentPath !== '/login' ? `${redirectUrl}?redirect=${encodeURIComponent(currentPath)}` : redirectUrl;
            router.push(loginUrl);
          }
        },
        autoClose: false
      };
      
      setNotifications(prev => [...prev, notification]);
      
      // 세션 만료 시 추가 처리
      if (event.detail.sessionExpired) {
        // 로컬 스토리지 정리 (필요시)
        if (typeof window !== 'undefined') {
          // 임시 데이터나 캐시 정리
          sessionStorage.clear();
        }
      }
    };

    // CSRF 에러 처리
    const handleCSRFError = (event: CustomEvent) => {
      const notification: ErrorNotification = {
        id: `csrf-error-${Date.now()}`,
        type: 'csrf-error',
        message: event.detail.message || 'CSRF 토큰 오류가 발생했습니다.',
        action: event.detail.shouldRefresh ? {
          label: '새로고침',
          handler: () => {
            window.location.reload();
          }
        } : {
          label: '다시 시도',
          handler: () => {
            // CSRF 토큰을 다시 가져오기 위해 페이지 새로고침
            window.location.reload();
          }
        },
        autoClose: !event.detail.shouldRefresh, // 새로고침이 필요한 경우 자동 닫기 안함
        duration: event.detail.shouldRefresh ? undefined : 10000
      };
      
      setNotifications(prev => [...prev, notification]);
      
      // CSRF 에러 발생 시 추가 처리
      console.warn('CSRF Error Details:', {
        reason: event.detail.reason,
        suggestion: event.detail.suggestion,
        timestamp: event.detail.timestamp
      });
    };

    // 권한 에러 처리
    const handlePermissionError = (event: CustomEvent) => {
      const notification: ErrorNotification = {
        id: `permission-error-${Date.now()}`,
        type: 'permission-error',
        message: event.detail.message || '권한이 부족합니다.',
        action: event.detail.requiredPermission === 'admin' ? {
          label: '대시보드로',
          handler: () => {
            router.push('/dashboard');
          }
        } : undefined,
        autoClose: true,
        duration: 7000
      };
      
      setNotifications(prev => [...prev, notification]);
      
      // 권한 에러 발생 시 추가 처리
      console.warn('Permission Error Details:', {
        errorCode: event.detail.errorCode,
        requiredPermission: event.detail.requiredPermission,
        suggestion: event.detail.suggestion,
        timestamp: event.detail.timestamp
      });
    };

    // 이벤트 리스너 등록
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:session-expired', handleSessionExpired as EventListener);
      window.addEventListener('auth:csrf-error', handleCSRFError as EventListener);
      window.addEventListener('auth:permission-error', handlePermissionError as EventListener);
    }

    // 클린업
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:session-expired', handleSessionExpired as EventListener);
        window.removeEventListener('auth:csrf-error', handleCSRFError as EventListener);
        window.removeEventListener('auth:permission-error', handlePermissionError as EventListener);
      }
    };
  }, [router]);

  // 자동 닫기 처리
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.autoClose && notification.duration) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationStyles = (type: ErrorNotification['type']) => {
    switch (type) {
      case 'session-expired':
        return 'bg-red-500 border-red-600';
      case 'csrf-error':
        return 'bg-orange-500 border-orange-600';
      case 'permission-error':
        return 'bg-yellow-500 border-yellow-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  const getNotificationIcon = (type: ErrorNotification['type']) => {
    switch (type) {
      case 'session-expired':
        return '🔒';
      case 'csrf-error':
        return '⚠️';
      case 'permission-error':
        return '🚫';
      default:
        return 'ℹ️';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`
            ${getNotificationStyles(notification.type)}
            text-white p-4 rounded-lg shadow-lg border-l-4 max-w-sm
            animate-slide-in-right
          `}
        >
          <div className="flex items-start space-x-3">
            <span className="text-xl flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </span>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-5">
                {notification.message}
              </p>
              
              {notification.action && (
                <div className="mt-3">
                  <button
                    onClick={notification.action.handler}
                    className="
                      bg-white bg-opacity-20 hover:bg-opacity-30
                      text-white text-xs font-medium px-3 py-1 rounded
                      transition-colors duration-200
                    "
                  >
                    {notification.action.label}
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className="
                text-white hover:text-gray-200 flex-shrink-0
                transition-colors duration-200
              "
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}