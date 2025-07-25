'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMyActiveChallenge, useLeaderboard, useCheatDayStatus } from '@/hooks/useChallengeQueries';
import { useActiveChallengeData, useChallengeAuth } from '@/contexts/ChallengeContext';
import CheatDayModal from '@/components/challenges/CheatDayModal';
import ChallengeCompletionReport from '@/components/challenges/ChallengeCompletionReport';

interface PersonalDashboardProps {
  onNavigateToChallenge?: () => void;
}

const PersonalDashboard: React.FC<PersonalDashboardProps> = ({ 
  onNavigateToChallenge = () => {} 
}) => {
  const router = useRouter();
  const { isAuthenticated } = useChallengeAuth();
  const { activeChallenge, activeChallengeRoom } = useActiveChallengeData();
  
  // React Query 훅들로 데이터 관리
  const { 
    data: challengeResponse, 
    isLoading: challengeLoading, 
    error: challengeError,
    refetch: refetchChallenge 
  } = useMyActiveChallenge();

  const { 
    data: leaderboardResponse, 
    isLoading: leaderboardLoading 
  } = useLeaderboard(
    challengeResponse?.data?.room || 0,
    { limit: 10 }
  );

  const { 
    data: cheatStatusResponse 
  } = useCheatDayStatus(challengeResponse?.data?.id);

  // 로컬 상태
  const [isCheatModalOpen, setIsCheatModalOpen] = useState(false);
  const [isCompletionReportOpen, setIsCompletionReportOpen] = useState(false);

  // 현재 챌린지 데이터 (React Query 우선, Context 백업)
  const currentChallenge = challengeResponse?.data || activeChallenge;
  const currentRoom = activeChallengeRoom;

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600">
        <div className="text-center">
          <div className="text-6xl mb-6">🔐</div>
          <h3 className="text-2xl font-bold text-white mb-4">로그인이 필요합니다</h3>
          <p className="text-gray-400 mb-8">
            챌린지 현황을 확인하려면 먼저 로그인해주세요.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="bg-[var(--point-green)] text-black font-bold py-4 px-8 rounded-lg text-lg hover:bg-green-400 transition-all duration-300 transform hover:scale-105"
          >
            🚀 로그인하기
          </button>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (challengeLoading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--point-green)] mx-auto mb-4"></div>
          <p className="text-gray-400">챌린지 현황을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (challengeError) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">데이터 로드 실패</h3>
          <p className="text-gray-400 mb-4">
            {challengeError?.message || '알 수 없는 오류가 발생했습니다.'}
          </p>
          <button
            onClick={() => refetchChallenge()}
            className="bg-[var(--point-green)] text-black font-bold py-2 px-4 rounded-lg hover:bg-green-400 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 참여 중인 챌린지가 없는 경우
  if (!currentChallenge) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600">
        <div className="text-center">
          <div className="text-6xl mb-6">🎯</div>
          <h3 className="text-2xl font-bold text-white mb-4">참여 중인 챌린지가 없습니다</h3>
          <p className="text-gray-400 mb-8">
            새로운 챌린지에 참여하여 건강한 식습관을 시작해보세요!
          </p>
          <button
            onClick={onNavigateToChallenge}
            className="bg-[var(--point-green)] text-black font-bold py-4 px-8 rounded-lg text-lg hover:bg-green-400 transition-all duration-300 transform hover:scale-105"
          >
            🚀 챌린지 찾기
          </button>
        </div>
      </div>
    );
  }

  // 내 순위 찾기
  const myRank = leaderboardResponse?.data?.leaderboard?.find(
    (entry: any) => entry.is_me || entry.user_id === currentChallenge.user
  )?.rank || leaderboardResponse?.data?.my_rank;

  // 진행률 계산
  const getProgressPercentage = () => {
    const totalDays = currentChallenge.user_challenge_duration_days || 1;
    const passedDays = totalDays - currentChallenge.remaining_duration_days;
    return Math.min((passedDays / totalDays) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'NanumGothic' }}>
          🏆 나의 챌린지
        </h2>
        {!challengeLoading && (
          <button
            onClick={() => refetchChallenge()}
            className="text-gray-400 hover:text-white transition-colors"
            title="새로고침"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* 메인 대시보드 카드 */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 챌린지 정보 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 챌린지 제목 및 기본 정보 */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {currentRoom?.name || '챌린지'}
              </h3>
              <p className="text-gray-400">
                목표 칼로리: <span className="text-[var(--point-green)] font-bold">{currentChallenge.target_calorie}kcal</span>
              </p>
            </div>

            {/* 주요 지표들 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--point-green)]">
                  {currentChallenge.current_streak_days}
                </div>
                <div className="text-sm text-gray-400">연속 성공</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {currentChallenge.max_streak_days}
                </div>
                <div className="text-sm text-gray-400">최고 기록</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {myRank || '-'}
                </div>
                <div className="text-sm text-gray-400">내 순위</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {currentChallenge.remaining_duration_days}
                </div>
                <div className="text-sm text-gray-400">남은 일수</div>
              </div>
            </div>

            {/* 진행률 바 */}
            <div>
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>챌린지 진행률</span>
                <span>{Math.round(getProgressPercentage())}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-[var(--point-green)] to-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>

            {/* 치팅 현황 */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-bold text-white">이번 주 치팅</h4>
                  <p className="text-gray-400 text-sm">
                    {currentChallenge.current_weekly_cheat_count} / {currentChallenge.user_weekly_cheat_limit} 사용
                  </p>
                </div>
                <div className="text-3xl">
                  {currentChallenge.current_weekly_cheat_count >= currentChallenge.user_weekly_cheat_limit ? '🚫' : '🍕'}
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 액션 버튼들 */}
          <div className="space-y-4">
            <button
              onClick={() => router.push(`/challenges/leaderboard/${currentChallenge.room}`)}
              className="w-full bg-[var(--point-green)] text-black font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-colors"
            >
              🏆 순위 보기
            </button>
            
            <button
              onClick={() => router.push('/challenges/my')}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors"
            >
              📊 상세 통계
            </button>
            
            {currentChallenge.remaining_duration_days <= 0 ? (
              <button
                onClick={() => setIsCompletionReportOpen(true)}
                className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-500 transition-colors"
              >
                🏆 완료 리포트 보기
              </button>
            ) : (
              <button
                onClick={() => setIsCheatModalOpen(true)}
                className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-500 transition-colors"
                disabled={currentChallenge.current_weekly_cheat_count >= currentChallenge.user_weekly_cheat_limit}
              >
                🍕 치팅 사용 {currentChallenge.current_weekly_cheat_count >= currentChallenge.user_weekly_cheat_limit && '(한도 초과)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 하단 정보 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 챌린지 기간 정보 */}
        <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-gray-600">
          <h4 className="text-lg font-bold text-white mb-4">📅 기간 정보</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">시작일:</span>
              <span className="text-white">{new Date(currentChallenge.challenge_start_date).toLocaleDateString('ko-KR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">종료 예정:</span>
              <span className="text-white">{new Date(currentChallenge.challenge_end_date).toLocaleDateString('ko-KR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">마감 시간:</span>
              <span className="text-white">{currentChallenge.challenge_cutoff_time}</span>
            </div>
          </div>
        </div>

        {/* 성과 요약 */}
        <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-gray-600">
          <h4 className="text-lg font-bold text-white mb-4">📈 성과 요약</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">총 성공:</span>
              <span className="text-[var(--point-green)]">{currentChallenge.total_success_days}일</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">총 실패:</span>
              <span className="text-red-400">{currentChallenge.total_failure_days}일</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">성공률:</span>
              <span className="text-white">
                {currentChallenge.total_success_days + currentChallenge.total_failure_days > 0 
                  ? Math.round((currentChallenge.total_success_days / (currentChallenge.total_success_days + currentChallenge.total_failure_days)) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* 실시간 순위 (간단 버전) */}
        <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-gray-600">
          <h4 className="text-lg font-bold text-white mb-4">🏆 실시간 순위</h4>
          {leaderboardLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--point-green)] mx-auto"></div>
            </div>
          ) : leaderboardResponse?.data?.leaderboard ? (
            <div className="space-y-2 text-sm">
              {leaderboardResponse.data.leaderboard.slice(0, 3).map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className={entry.is_me ? 'text-[var(--point-green)] font-bold' : 'text-white'}>
                      {entry.is_me ? '나' : `사용자${entry.rank}`}
                    </span>
                  </div>
                  <span className="text-gray-400">{entry.current_streak}일</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">순위 정보를 불러올 수 없습니다.</p>
          )}
        </div>
      </div>

      {/* 치팅 모달 */}
      {currentChallenge && (
        <CheatDayModal
          isOpen={isCheatModalOpen}
          onClose={() => setIsCheatModalOpen(false)}
          challenge={currentChallenge}
          onCheatUsed={() => {
            // 치팅 사용 후 현황 새로고침
            refetchChallenge();
          }}
        />
      )}

      {/* 완료 리포트 모달 */}
      {currentChallenge && (
        <ChallengeCompletionReport
          isOpen={isCompletionReportOpen}
          onClose={() => setIsCompletionReportOpen(false)}
          challenge={currentChallenge}
          onActionComplete={(action) => {
            // 행동 완료 후 현황 새로고침
            refetchChallenge();
            if (action === 'new_challenge') {
              router.push('/challenges');
            }
          }}
        />
      )}
    </div>
  );
};

export default PersonalDashboard; 