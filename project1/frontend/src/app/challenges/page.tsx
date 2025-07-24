'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChallengeRoom } from '@/types';
import ChallengeRoomList from '@/components/challenges/ChallengeRoomList';

export default function ChallengeListPage() {
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState<ChallengeRoom | null>(null);

  const handleRoomSelect = (room: ChallengeRoom) => {
    setSelectedRoom(room);
    // 챌린지 참여 페이지로 이동하거나 모달을 열 수 있습니다
    router.push(`/challenges/${room.id}`);
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleGoToMyChallenges = () => {
    router.push('/challenges/my');
  };

  return (
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center p-4">
      <div className="w-full max-w-7xl flex flex-col space-y-6 animate-fade-in">
        {/* 헤더 */}
        <header className="w-full flex justify-between items-center py-6">
          <div>
            <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'NanumGothic', color: 'var(--point-green)' }}>
              챌린지 참여하기
            </h1>
            <p className="text-gray-400">
              칼로리 목표를 달성하고 다른 사용자들과 경쟁해보세요
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleGoToMyChallenges} 
              className="bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
              style={{ fontFamily: 'NanumGothic' }}
            >
              내 챌린지
            </button>
            <button 
              onClick={handleGoToDashboard} 
              className="bg-[var(--point-green)] text-black font-bold py-3 px-6 rounded-lg hover:bg-green-400 transition-colors"
              style={{ fontFamily: 'NanumGothic' }}
            >
              대시보드로
            </button>
          </div>
        </header>

        {/* 안내 섹션 */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🎯</div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'NanumGothic' }}>
                챌린지 시스템이란?
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI 기반 식단 분석을 통해 자동으로 칼로리를 계산하고, 목표 달성 여부를 판정합니다. 
                다른 사용자들과 실시간으로 순위를 경쟁하며 건강한 식습관을 만들어보세요.
              </p>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span>• 실시간 순위 시스템</span>
                <span>• 주간 치팅 기능</span>
                <span>• 개인 맞춤 목표 설정</span>
                <span>• 배지 획득 시스템</span>
              </div>
            </div>
          </div>
        </div>

        {/* 챌린지 방 목록 */}
        <div className="flex-1">
          <ChallengeRoomList 
            onRoomSelect={handleRoomSelect}
            showJoinButton={true}
          />
        </div>

        {/* 푸터 */}
        <footer className="text-center py-6 text-gray-500 text-sm">
          <p>새로운 챌린지 방은 관리자가 주기적으로 추가합니다.</p>
          <p>궁금한 점이 있으시면 설정에서 문의해주세요.</p>
        </footer>
      </div>
    </div>
  );
}