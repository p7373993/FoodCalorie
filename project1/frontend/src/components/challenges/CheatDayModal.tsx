'use client';

import React, { useState, useEffect } from 'react';
import { UserChallenge } from '@/types';
import challengeApi from '@/lib/challengeApi';

interface CheatDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: UserChallenge;
  onCheatUsed: () => void;
}

const CheatDayModal: React.FC<CheatDayModalProps> = ({
  isOpen,
  onClose,
  challenge,
  onCheatUsed,
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cheatStatus, setCheatStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 현재 날짜로 초기화
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      loadCheatStatus();
    }
  }, [isOpen]);

  const loadCheatStatus = async () => {
    try {
      setLoadingStatus(true);
      const response = await challengeApi.getCheatDayStatus(challenge.id);

      if (response.success && response.data) {
        setCheatStatus(response.data);
      }
    } catch (err) {
      console.error('Error loading cheat status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleCheatRequest = async () => {
    if (!selectedDate) {
      setError('날짜를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await challengeApi.requestCheatDay(selectedDate, challenge.id);

      if (response.success) {
        onCheatUsed();
        onClose();
        // 성공 메시지 표시 (선택적)
        alert(`${selectedDate}에 치팅이 적용되었습니다!`);
      } else {
        setError(response.error?.message || '치팅 요청에 실패했습니다.');
      }
    } catch (err) {
      console.error('Error requesting cheat day:', err);
      setError('치팅 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getDateLimits = () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    return {
      min: weekAgo.toISOString().split('T')[0],
      max: today.toISOString().split('T')[0]
    };
  };

  const isDateUsed = (date: string) => {
    return cheatStatus?.used_dates?.includes(date) || false;
  };

  const canUseCheat = () => {
    if (!cheatStatus) return false;
    return cheatStatus.weekly_cheat_status.remaining_cheats > 0;
  };

  if (!isOpen) return null;

  const dateLimits = getDateLimits();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-600">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🍕</div>
          <h3 className="text-2xl font-bold text-white mb-2">치팅 데이 사용</h3>
          <p className="text-gray-400">
            "{challenge.room_name}" 챌린지에서 치팅을 사용하시겠습니까?
          </p>
        </div>

        {/* 치팅 현황 */}
        {loadingStatus ? (
          <div className="bg-gray-800/30 rounded-lg p-4 mb-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--point-green)] mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">치팅 현황을 불러오는 중...</p>
          </div>
        ) : cheatStatus ? (
          <div className="bg-gray-800/30 rounded-lg p-4 mb-6">
            <h4 className="text-white font-semibold mb-3">이번 주 치팅 현황</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">사용 가능:</span>
                <span className="text-[var(--point-green)] ml-2 font-bold">
                  {cheatStatus.weekly_cheat_status.remaining_cheats}회
                </span>
              </div>
              <div>
                <span className="text-gray-400">이미 사용:</span>
                <span className="text-white ml-2 font-bold">
                  {cheatStatus.weekly_cheat_status.used_cheats}회
                </span>
              </div>
            </div>

            {cheatStatus.used_dates.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-gray-400 mb-1">사용한 날짜:</div>
                <div className="flex flex-wrap gap-1">
                  {cheatStatus.used_dates.map((date: string) => (
                    <span key={date} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                      {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 날짜 선택 */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">치팅을 적용할 날짜</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={dateLimits.min}
            max={dateLimits.max}
            className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            최근 7일 내의 날짜만 선택 가능합니다
          </p>

          {selectedDate && isDateUsed(selectedDate) && (
            <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                ⚠️ 이미 치팅이 적용된 날짜입니다.
              </p>
            </div>
          )}
        </div>

        {/* 치팅 설명 */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-blue-400 font-semibold mb-2">💡 치팅 데이란?</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• 목표 칼로리를 초과해도 실패로 계산되지 않습니다</li>
            <li>• 연속 성공 기록이 유지됩니다</li>
            <li>• 주간 제한 횟수 내에서만 사용 가능합니다</li>
            <li>• 사용 후에는 취소할 수 없습니다</li>
          </ul>
        </div>

        {/* 버튼 */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleCheatRequest}
            disabled={loading || !canUseCheat() || !selectedDate || isDateUsed(selectedDate)}
            className="flex-1 bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                처리 중...
              </div>
            ) : (
              '🍕 치팅 사용하기'
            )}
          </button>
        </div>

        {/* 사용 불가 안내 */}
        {!canUseCheat() && cheatStatus && (
          <div className="mt-4 text-center">
            <p className="text-red-400 text-sm">
              이번 주 치팅을 모두 사용했습니다. 다음 주에 다시 사용할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheatDayModal;