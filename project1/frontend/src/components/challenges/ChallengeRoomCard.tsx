'use client';

import React, { useState } from 'react';
import { ChallengeRoom } from '@/types';

interface ChallengeRoomCardProps {
  room: ChallengeRoom;
  onSelect: () => void;
  showJoinButton?: boolean;
  className?: string;
}

const ChallengeRoomCard: React.FC<ChallengeRoomCardProps> = ({
  room,
  onSelect,
  showJoinButton = true,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // 칼로리 범위에 따른 색상 결정
  const getCalorieRangeColor = (targetCalorie: number) => {
    if (targetCalorie <= 1500) return 'text-blue-400';
    if (targetCalorie <= 2000) return 'text-[var(--point-green)]';
    return 'text-orange-400';
  };

  // 칼로리 범위 라벨
  const getCalorieRangeLabel = (targetCalorie: number) => {
    if (targetCalorie <= 1500) return '저칼로리';
    if (targetCalorie <= 2000) return '표준';
    return '고칼로리';
  };

  // 난이도 표시
  const getDifficultyLevel = (targetCalorie: number) => {
    if (targetCalorie <= 1200) return { label: '매우 어려움', color: 'text-red-500', dots: 5 };
    if (targetCalorie <= 1500) return { label: '어려움', color: 'text-orange-500', dots: 4 };
    if (targetCalorie <= 1800) return { label: '보통', color: 'text-[var(--point-green)]', dots: 3 };
    if (targetCalorie <= 2200) return { label: '쉬움', color: 'text-blue-400', dots: 2 };
    return { label: '매우 쉬움', color: 'text-gray-400', dots: 1 };
  };

  const difficulty = getDifficultyLevel(room.target_calorie);

  // 참여자 수 상태 아이콘
  const getParticipantStatus = (count: number) => {
    if (count >= 100) return { icon: '🔥', label: '인기' };
    if (count >= 50) return { icon: '👥', label: '활발' };
    if (count >= 10) return { icon: '🌱', label: '성장중' };
    return { icon: '⭐', label: '새로운' };
  };

  const participantStatus = getParticipantStatus(room.participant_count);

  return (
    <div
      className={`relative bg-[var(--card-bg)] rounded-2xl border transition-all duration-300 cursor-pointer group ${
        isHovered 
          ? 'border-[var(--point-green)] shadow-lg shadow-[var(--point-green)]/20 transform -translate-y-1' 
          : 'border-gray-600 hover:border-gray-500'
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {/* 상태 배지 */}
      <div className="absolute top-4 right-4 flex gap-2">
        <span className="bg-gray-800/80 text-xs px-2 py-1 rounded-full text-gray-300">
          {participantStatus.icon} {participantStatus.label}
        </span>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="p-6">
        {/* 헤더 */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--point-green)] transition-colors">
            {room.name}
          </h3>
          <p className="text-gray-400 text-sm line-clamp-2">
            {room.description}
          </p>
        </div>

        {/* 칼로리 정보 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">
                {room.target_calorie.toLocaleString()}
              </span>
              <span className="text-gray-400 text-sm">kcal</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getCalorieRangeColor(room.target_calorie)} bg-opacity-20`}>
                {getCalorieRangeLabel(room.target_calorie)}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            허용 오차: ±{room.tolerance}kcal
          </div>
        </div>

        {/* 난이도 표시 */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">난이도</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < difficulty.dots ? difficulty.color.replace('text-', 'bg-') : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-xs font-medium ${difficulty.color}`}>
                {difficulty.label}
              </span>
            </div>
          </div>
        </div>

        {/* 참여자 정보 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{room.participant_count}명 참여 중</span>
          </div>
          
          <div className="text-xs text-gray-500">
            {new Date(room.created_at).toLocaleDateString('ko-KR')} 생성
          </div>
        </div>

        {/* 참여 버튼 */}
        {showJoinButton && (
          <button
            className={`w-full py-3 rounded-lg font-bold transition-all duration-300 ${
              isHovered
                ? 'bg-[var(--point-green)] text-black shadow-lg'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {isHovered ? '🚀 지금 참여하기' : '참여하기'}
          </button>
        )}
      </div>

      {/* 호버 이펙트 */}
      <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--point-green)]/5 to-transparent" />
      </div>

      {/* 새로운 방 표시 */}
      {new Date(room.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
        <div className="absolute top-0 left-6 transform -translate-y-1/2">
          <span className="bg-[var(--point-green)] text-black text-xs font-bold px-3 py-1 rounded-full">
            NEW
          </span>
        </div>
      )}
    </div>
  );
};

export default ChallengeRoomCard; 