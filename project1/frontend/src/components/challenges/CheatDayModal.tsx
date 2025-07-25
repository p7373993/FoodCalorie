'use client';

import React, { useState, useEffect } from 'react';
import { UserChallenge, CheatDayStatus } from '@/types';
import { apiClient } from '@/lib/api';

interface CheatDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: UserChallenge;
  onCheatUsed?: () => void;
}

const CheatDayModal: React.FC<CheatDayModalProps> = ({
  isOpen,
  onClose,
  challenge,
  onCheatUsed,
}) => {
  const [cheatStatus, setCheatStatus] = useState<CheatDayStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCheatStatus();
    }
  }, [isOpen]);

  const loadCheatStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getCheatStatus();
      
      if (response.success && response.data?.weekly_cheat_status) {
        setCheatStatus(response.data.weekly_cheat_status);
      } else {
        setError(response.message || '치팅 현황을 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Error loading cheat status:', err);
      setError('치팅 현황을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCheat = async () => {
    try {
      setRequesting(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const response = await apiClient.requestCheatDay(today);
      
      if (response.success) {
        setConfirmStep(false);
        onCheatUsed?.();
        onClose();
        // 성공 메시지 표시 (선택사항)
      } else {
        setError(response.message || '치팅 요청 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Error requesting cheat day:', err);
      setError('치팅 요청 중 오류가 발생했습니다.');
    } finally {
      setRequesting(false);
    }
  };

  // 현재 시간이 마감 시간 이후인지 확인
  const isAfterCutoff = () => {
    const now = new Date();
    const today = now.toDateString();
    const cutoffTime = new Date(`${today} ${challenge.challenge_cutoff_time}`);
    return now > cutoffTime;
  };

  // 주의 시작일 계산 (월요일)
  const getWeekStart = () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // 다음 주 월요일까지 남은 시간 계산
  const getTimeUntilWeekReset = () => {
    const now = new Date();
    const nextMonday = new Date(getWeekStart());
    nextMonday.setDate(nextMonday.getDate() + 7);
    
    const diff = nextMonday.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { days, hours };
  };

  const canUseCheat = () => {
    if (!cheatStatus) return false;
    if (cheatStatus.used_count >= cheatStatus.weekly_limit) return false;
    if (isAfterCutoff()) return false;
    if (!cheatStatus.can_use_today) return false;
    return true;
  };

  const getRemainingTime = () => {
    const now = new Date();
    const today = now.toDateString();
    const cutoffTime = new Date(`${today} ${challenge.challenge_cutoff_time}`);
    
    if (now > cutoffTime) {
      return '오늘 마감 시간이 지났습니다';
    }
    
    const diff = cutoffTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}시간 ${minutes}분 남음`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 max-w-md w-full border border-gray-600 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'NanumGothic' }}>
            🍕 치팅 사용
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--point-green)] mx-auto mb-4"></div>
            <p className="text-gray-400">치팅 현황을 불러오는 중...</p>
          </div>
        ) : confirmStep ? (
          /* 확인 단계 */
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🤔</div>
              <h3 className="text-xl font-bold text-white mb-2">정말 치팅을 사용하시겠어요?</h3>
              <p className="text-gray-400 text-sm">
                치팅을 사용하면 오늘 칼로리 제한 없이 드실 수 있어요
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-400 mb-2">치팅 사용 시 주의사항</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• 연속 성공 일수는 증가하지 않지만 끊어지지도 않아요</li>
                <li>• 이번 주 남은 치팅 횟수가 1회 줄어들어요</li>
                <li>• 사용 후에는 취소할 수 없어요</li>
                <li>• 내일부터는 다시 목표 칼로리를 지켜야 해요</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStep(false)}
                className="flex-1 bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                disabled={requesting}
              >
                취소
              </button>
              <button
                onClick={handleRequestCheat}
                className="flex-1 bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
                disabled={requesting}
              >
                {requesting ? '처리 중...' : '🍕 치팅 사용!'}
              </button>
            </div>
          </div>
        ) : (
          /* 메인 내용 */
          <div className="space-y-6">
            {/* 현재 치팅 현황 */}
            {cheatStatus && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">📊 이번 주 치팅 현황</h3>
                
                {/* 진행률 바 */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>사용한 치팅</span>
                    <span>{cheatStatus.used_count} / {cheatStatus.weekly_limit}회</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        cheatStatus.used_count >= cheatStatus.weekly_limit 
                          ? 'bg-red-500' 
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min((cheatStatus.used_count / cheatStatus.weekly_limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">남은 횟수:</span>
                    <span className="text-white ml-2 font-bold">
                      {cheatStatus.remaining_count}회
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">초기화까지:</span>
                    <span className="text-white ml-2 font-bold">
                      {(() => {
                        const { days, hours } = getTimeUntilWeekReset();
                        return `${days}일 ${hours}시간`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* 사용한 날짜들 */}
                {cheatStatus.used_dates.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">이미 사용한 날:</p>
                    <div className="flex flex-wrap gap-2">
                      {cheatStatus.used_dates.map((date, index) => (
                        <span
                          key={index}
                          className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded"
                        >
                          {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 오늘 치팅 사용 가능 여부 */}
            <div className={`rounded-lg p-6 border ${
              canUseCheat() 
                ? 'bg-[var(--point-green)]/10 border-[var(--point-green)]/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">
                  {canUseCheat() ? '✅' : '❌'}
                </span>
                <h3 className={`text-lg font-bold ${
                  canUseCheat() ? 'text-[var(--point-green)]' : 'text-red-400'
                }`}>
                  {canUseCheat() ? '오늘 치팅 사용 가능!' : '오늘 치팅 사용 불가'}
                </h3>
              </div>

              {!canUseCheat() && (
                                 <div className="space-y-2 text-sm text-gray-300">
                   {cheatStatus?.used_count !== undefined && cheatStatus?.weekly_limit !== undefined && 
                    cheatStatus.used_count >= cheatStatus.weekly_limit && (
                     <p>• 이번 주 치팅 한도를 모두 사용했어요</p>
                   )}
                  {isAfterCutoff() && (
                    <p>• 오늘 마감 시간({challenge.challenge_cutoff_time})이 지났어요</p>
                  )}
                  {cheatStatus && !cheatStatus.can_use_today && (
                    <p>• 오늘은 이미 치팅을 사용했어요</p>
                  )}
                </div>
              )}

              {canUseCheat() && (
                <div className="space-y-2 text-sm text-gray-300">
                  <p>• 마감 시간: {getRemainingTime()}</p>
                  <p>• 사용 후 연속 기록은 유지돼요</p>
                </div>
              )}
            </div>

            {/* 치팅 설명 */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">💡 치팅이란?</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• <strong>칼로리 제한 없음:</strong> 오늘은 목표 칼로리를 신경쓰지 않고 드실 수 있어요</p>
                <p>• <strong>연속 기록 보호:</strong> 연속 성공 일수가 끊어지지 않아요</p>
                <p>• <strong>주간 제한:</strong> 일주일에 {challenge.user_weekly_cheat_limit}회까지만 사용 가능해요</p>
                <p>• <strong>자동 초기화:</strong> 매주 월요일 0시에 횟수가 초기화돼요</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => setConfirmStep(true)}
                className="flex-1 bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canUseCheat()}
              >
                {canUseCheat() ? '🍕 치팅 사용하기' : '사용 불가'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheatDayModal; 