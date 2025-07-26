'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

const SocialChallengeCard: React.FC = () => {
  const router = useRouter();

  return (
    <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
      <h3 className="text-xl font-bold text-white mb-4">👥 소셜 챌린지</h3>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-gray-400 text-sm mb-4">
            다른 사용자들과 함께 목표를 달성해보세요!
          </p>
        </div>

        <div className="space-y-3">
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">진행 중인 챌린지</span>
              <span className="text-white font-bold">12개</span>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">참여자 수</span>
              <span className="text-white font-bold">156명</span>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">내 순위</span>
              <span className="text-[var(--point-green)] font-bold">3위</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push('/challenges')}
          className="w-full bg-[var(--point-green)] text-black font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-colors"
        >
          🚀 챌린지 찾기
        </button>
      </div>
    </div>
  );
};

export default SocialChallengeCard; 