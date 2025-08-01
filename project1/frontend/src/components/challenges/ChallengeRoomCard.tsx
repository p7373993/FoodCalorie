'use client';

import React from 'react';
import { ChallengeRoom } from '@/types';

interface ChallengeRoomCardProps {
  room: ChallengeRoom;
  onSelect: () => void;
  showJoinButton?: boolean;
}

const ChallengeRoomCard: React.FC<ChallengeRoomCardProps> = ({
  room,
  onSelect,
  showJoinButton = true,
}) => {
  const getDifficultyInfo = (targetCalorie: number) => {
    if (targetCalorie <= 1200) return { label: '매우 어려움', color: 'text-red-500', bgColor: 'bg-red-500/10', emoji: '🔥🔥🔥🔥🔥' };
    if (targetCalorie <= 1500) return { label: '어려움', color: 'text-orange-500', bgColor: 'bg-orange-500/10', emoji: '🔥🔥🔥🔥' };
    if (targetCalorie <= 1800) return { label: '보통', color: 'text-[var(--point-green)]', bgColor: 'bg-[var(--point-green)]/10', emoji: '🔥🔥🔥' };
    if (targetCalorie <= 2200) return { label: '쉬움', color: 'text-blue-400', bgColor: 'bg-blue-400/10', emoji: '🔥🔥' };
    return { label: '매우 쉬움', color: 'text-gray-400', bgColor: 'bg-gray-400/10', emoji: '🔥' };
  };

  const difficulty = getDifficultyInfo(room.target_calorie);
  const participantCount = room.dummy_users_count || 0;

  return (
    <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600 hover:border-[var(--point-green)]/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white truncate">{room.name}</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${difficulty.bgColor} ${difficulty.color}`}>
          {difficulty.label}
        </div>
      </div>

      {/* 설명 */}
      <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
        {room.description}
      </p>

      {/* 주요 정보 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">목표 칼로리</div>
          <div className="text-lg font-bold text-white">
            {room.target_calorie.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">±{room.tolerance}kcal</div>
        </div>
        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">참여자</div>
          <div className="text-lg font-bold text-white">
            {participantCount}명
          </div>
          <div className="text-xs text-gray-500">활성 사용자</div>
        </div>
      </div>

      {/* 난이도 표시 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">난이도:</span>
          <span className={`text-sm font-medium ${difficulty.color}`}>
            {difficulty.label}
          </span>
        </div>
        <div className="text-lg">{difficulty.emoji}</div>
      </div>

      {/* 추천 대상 */}
      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-2">추천 대상:</div>
        <div className="flex flex-wrap gap-1">
          {room.target_calorie <= 1500 && (
            <>
              <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">다이어트</span>
              <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">체중감량</span>
            </>
          )}
          {room.target_calorie > 1500 && room.target_calorie <= 1800 && (
            <>
              <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">체중유지</span>
              <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">균형식단</span>
            </>
          )}
          {room.target_calorie > 1800 && (
            <>
              <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">체중증량</span>
              <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">근육증가</span>
            </>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      {showJoinButton && (
        <button
          onClick={onSelect}
          className="w-full bg-[var(--point-green)] text-black font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-all duration-300 transform hover:scale-[1.02]"
          style={{ fontFamily: 'NanumGothic' }}
        >
          🚀 참여하기
        </button>
      )}

      {/* 생성일 */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 text-center">
          📅 {new Date(room.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })} 생성
        </div>
      </div>
    </div>
  );
};

export default ChallengeRoomCard;