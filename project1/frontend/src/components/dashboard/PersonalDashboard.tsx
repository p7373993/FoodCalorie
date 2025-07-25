'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserChallenge, LeaderboardEntry } from '@/types';
import { apiClient } from '@/lib/api';

interface PersonalDashboardProps {
  onNavigateToChallenge?: () => void;
  onNavigateToLeaderboard?: () => void;
}

const PersonalDashboard: React.FC<PersonalDashboardProps> = ({
  onNavigateToChallenge,
  onNavigateToLeaderboard,
}) => {
  const router = useRouter();
  const [currentChallenge, setCurrentChallenge] = useState<UserChallenge | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPersonalData();
    
    // 10초마다 자동 새로고침 (실시간 업데이트)
    const interval = setInterval(() => {
      refreshData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadPersonalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 내 챌린지 정보 조회
      const challengeResponse = await apiClient.getMyChallenges();
      
      if (challengeResponse.success && challengeResponse.data && 
          challengeResponse.data.active_challenges && 
          challengeResponse.data.active_challenges.length > 0) {
        const activeChallenge = challengeResponse.data.active_challenges[0]; // 첫 번째 활성 챌린지
        setCurrentChallenge(activeChallenge);

        // 순위 정보 조회
        try {
          const leaderboardResponse = await apiClient.getLeaderboard(activeChallenge.room);
          if (leaderboardResponse.success && leaderboardResponse.data) {
            // 리더보드 응답 구조에 따라 적절히 처리
            if (Array.isArray(leaderboardResponse.data)) {
              // 배열 형태의 응답
              const myRankData = leaderboardResponse.data.find((entry: LeaderboardEntry) => 
                entry.user_id === activeChallenge.user || entry.is_me === true
              );
              setMyRank(myRankData?.rank || null);
            } else if (leaderboardResponse.data.my_rank) {
              // 객체 형태의 응답에서 my_rank 속성 사용
              setMyRank(leaderboardResponse.data.my_rank);
            }
          }
        } catch (rankError) {
          console.warn('순위 정보 로드 실패:', rankError);
          setMyRank(null);
        }
      } else {
        setCurrentChallenge(null);
        setMyRank(null);
      }
    } catch (err) {
      console.error('개인 현황 로드 오류:', err);
      setError('개인 현황을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await loadPersonalData();
    } catch (err) {
      console.warn('자동 새로고침 실패:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (challenge: UserChallenge) => {
    if (challenge.remaining_duration_days <= 0) return 'text-red-400';
    if (challenge.current_streak_days >= 7) return 'text-[var(--point-green)]';
    if (challenge.current_streak_days >= 3) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getProgressPercentage = (challenge: UserChallenge) => {
    const totalDays = challenge.user_challenge_duration_days;
    const passedDays = totalDays - challenge.remaining_duration_days;
    return Math.min((passedDays / totalDays) * 100, 100);
  };

  const getStreakEmoji = (streakDays: number) => {
    if (streakDays >= 30) return '🔥🔥🔥🔥🔥';
    if (streakDays >= 14) return '🔥🔥🔥🔥';
    if (streakDays >= 7) return '🔥🔥🔥';
    if (streakDays >= 3) return '🔥🔥';
    if (streakDays >= 1) return '🔥';
    return '😴';
  };

  const getSuccessRate = (challenge: UserChallenge) => {
    const totalDays = challenge.total_success_days + challenge.total_failure_days;
    if (totalDays === 0) return 0;
    return Math.round((challenge.total_success_days / totalDays) * 100);
  };

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--point-green)] mb-4"></div>
          <p className="text-gray-400">개인 현황을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-red-500/30">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">데이터 로드 실패</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadPersonalData}
            className="bg-[var(--point-green)] text-black font-bold py-2 px-4 rounded-lg hover:bg-green-400 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'NanumGothic' }}>
            내 챌린지 현황
          </h2>
          <p className="text-gray-400">실시간으로 업데이트되는 내 챌린지 진행 상황</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 실시간 업데이트 상태 */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-400 animate-pulse' : 'bg-[var(--point-green)]'}`}></div>
            {refreshing ? '업데이트 중...' : '실시간 연결'}
          </div>
          
          <button
            onClick={refreshData}
            className="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors"
            disabled={refreshing}
          >
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 메인 현황 카드 */}
      <div className="bg-gradient-to-br from-[var(--card-bg)] to-gray-800/50 rounded-2xl p-8 border border-[var(--point-green)]/30">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 챌린지 정보 */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">{currentChallenge.room_name}</h3>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                currentChallenge.status === 'active' 
                  ? 'bg-[var(--point-green)]/20 text-[var(--point-green)]' 
                  : 'bg-gray-600/20 text-gray-400'
              }`}>
                {currentChallenge.status === 'active' ? '진행 중' : currentChallenge.status}
              </div>
            </div>

            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">
                  {currentChallenge.target_calorie.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">목표 칼로리</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold mb-1 ${getStatusColor(currentChallenge)}`}>
                  {currentChallenge.current_streak_days}
                </div>
                <div className="text-sm text-gray-400">연속 성공</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">
                  {currentChallenge.max_streak_days}
                </div>
                <div className="text-sm text-gray-400">최고 기록</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">
                  {currentChallenge.remaining_duration_days}
                </div>
                <div className="text-sm text-gray-400">남은 일수</div>
              </div>
            </div>

            {/* 진행률 바 */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>챌린지 진행률</span>
                <span>{Math.round(getProgressPercentage(currentChallenge))}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-[var(--point-green)] to-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage(currentChallenge)}%` }}
                />
              </div>
            </div>

            {/* 추가 통계 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-lg font-bold text-white">{getSuccessRate(currentChallenge)}%</div>
                <div className="text-xs text-gray-400">총 성공률</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-lg font-bold text-white">
                  {currentChallenge.current_weekly_cheat_count} / {currentChallenge.user_weekly_cheat_limit}
                </div>
                <div className="text-xs text-gray-400">이번 주 치팅</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-lg font-bold text-white">
                  {myRank || '순위 미확인'}
                </div>
                <div className="text-xs text-gray-400">현재 순위</div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 동기부여 섹션 */}
          <div className="flex flex-col justify-between">
            {/* 연속 기록 표시 */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">
                {getStreakEmoji(currentChallenge.current_streak_days)}
              </div>
              <h4 className="text-xl font-bold text-white mb-2">
                {currentChallenge.current_streak_days}일 연속 성공!
              </h4>
              <p className="text-gray-400 text-sm">
                {currentChallenge.current_streak_days >= 7 
                  ? '🎉 정말 대단해요! 계속 유지하세요!'
                  : currentChallenge.current_streak_days >= 3 
                  ? '💪 좋은 페이스입니다!'
                  : '🔥 시작이 반이에요!'}
              </p>
            </div>

            {/* 액션 버튼들 */}
                         <div className="space-y-3">
               <button
                 onClick={() => {
                   if (currentChallenge) {
                     // 특정 챌린지 방의 리더보드로 이동
                     router.push(`/challenges/leaderboard/${currentChallenge.room}`);
                   } else if (onNavigateToLeaderboard) {
                     onNavigateToLeaderboard();
                   }
                 }}
                 className="w-full bg-[var(--point-green)] text-black font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-colors"
               >
                 🏆 순위표 보기
               </button>
              
              <button
                onClick={() => {/* TODO: 통계 페이지로 이동 */}}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors"
              >
                📊 상세 통계
              </button>
              
              <button
                onClick={() => {/* TODO: 치팅 모달 열기 */}}
                className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-500 transition-colors"
                disabled={currentChallenge.current_weekly_cheat_count >= currentChallenge.user_weekly_cheat_limit}
              >
                🍕 치팅 사용 {currentChallenge.current_weekly_cheat_count >= currentChallenge.user_weekly_cheat_limit && '(한도 초과)'}
              </button>
            </div>
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

        {/* 개인 목표 정보 */}
        <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-gray-600">
          <h4 className="text-lg font-bold text-white mb-4">🎯 개인 목표</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">현재 체중:</span>
              <span className="text-white">{currentChallenge.user_weight}kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">목표 체중:</span>
              <span className="text-white">{currentChallenge.user_target_weight}kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">변화 목표:</span>
              <span className="text-white">
                {currentChallenge.user_weight - currentChallenge.user_target_weight > 0 ? '-' : '+'}
                {Math.abs(currentChallenge.user_weight - currentChallenge.user_target_weight)}kg
              </span>
            </div>
          </div>
        </div>

        {/* 성과 요약 */}
        <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-gray-600">
          <h4 className="text-lg font-bold text-white mb-4">🏅 성과 요약</h4>
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
              <span className="text-gray-400">평균 성공률:</span>
              <span className="text-white">{getSuccessRate(currentChallenge)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalDashboard; 