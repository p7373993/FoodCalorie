'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserChallenge } from '@/types';
import { apiClient } from '@/lib/api';
import CheatDayModal from '@/components/challenges/CheatDayModal';

export default function MyChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheatModalOpen, setIsCheatModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<UserChallenge | null>(null);

  useEffect(() => {
    loadMyChallenges();
  }, []);

  const loadMyChallenges = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMyChallenges();
      
      if (response.success && response.data) {
        setChallenges(response.data.active_challenges);
        setError(null);
      } else {
        setError(response.message || '챌린지 정보를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Error loading my challenges:', err);
      setError('챌린지 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    router.push('/challenges');
  };

  const handleViewLeaderboard = (challenge: UserChallenge) => {
    router.push(`/challenges/leaderboard/${challenge.room}`);
  };

  const handleCheatRequest = (challenge: UserChallenge) => {
    setSelectedChallenge(challenge);
    setIsCheatModalOpen(true);
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

  if (loading) {
    return (
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--point-green)] mb-4"></div>
          <p className="text-xl text-gray-400">내 챌린지 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grid-pattern text-white min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <header className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'NanumGothic', color: 'var(--point-green)' }}>
              내 챌린지
            </h1>
            <p className="text-gray-400">
              현재 참여 중인 챌린지 현황을 확인하세요
            </p>
          </div>
          <button
            onClick={handleBackToList}
            className="bg-[var(--point-green)] text-black font-bold py-3 px-6 rounded-lg hover:bg-green-400 transition-colors"
            style={{ fontFamily: 'NanumGothic' }}
          >
            새 챌린지 찾기
          </button>
        </header>

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* 챌린지 목록 */}
        {challenges.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-4">아직 참여한 챌린지가 없습니다</h2>
            <p className="text-gray-400 mb-8">
              새로운 챌린지에 참여하여 건강한 식습관을 만들어보세요!
            </p>
            <button
              onClick={handleBackToList}
              className="bg-[var(--point-green)] text-black font-bold py-4 px-8 rounded-lg text-lg hover:bg-green-400 transition-all duration-300 transform hover:scale-105"
            >
              🚀 첫 번째 챌린지 찾기
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600 hover:border-[var(--point-green)]/50 transition-colors"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* 왼쪽: 기본 정보 */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-white">{challenge.room_name}</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        challenge.status === 'active' 
                          ? 'bg-[var(--point-green)]/20 text-[var(--point-green)]' 
                          : 'bg-gray-600/20 text-gray-400'
                      }`}>
                        {challenge.status === 'active' ? '진행 중' : challenge.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{challenge.target_calorie}</div>
                        <div className="text-sm text-gray-400">목표 칼로리</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getStatusColor(challenge)}`}>
                          {challenge.current_streak_days}
                        </div>
                        <div className="text-sm text-gray-400">연속 성공</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{challenge.max_streak_days}</div>
                        <div className="text-sm text-gray-400">최고 기록</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{challenge.remaining_duration_days}</div>
                        <div className="text-sm text-gray-400">남은 일수</div>
                      </div>
                    </div>

                    {/* 진행률 바 */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>챌린지 진행률</span>
                        <span>{Math.round(getProgressPercentage(challenge))}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-[var(--point-green)] to-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(challenge)}%` }}
                        />
                      </div>
                    </div>

                    {/* 치팅 정보 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">이번 주 치팅</div>
                        <div className="text-lg font-bold text-white">
                          {challenge.current_weekly_cheat_count} / {challenge.user_weekly_cheat_limit}
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">총 성공률</div>
                        <div className="text-lg font-bold text-white">
                          {challenge.total_success_days + challenge.total_failure_days > 0 
                            ? Math.round((challenge.total_success_days / (challenge.total_success_days + challenge.total_failure_days)) * 100)
                            : 0}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 오른쪽: 액션 버튼들 */}
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => handleViewLeaderboard(challenge)}
                      className="w-full bg-[var(--point-green)] text-black font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-colors"
                    >
                      🏆 순위 보기
                    </button>
                    
                    <button
                      onClick={() => router.push('/challenges/stats')}
                      className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors"
                    >
                      📊 상세 통계
                    </button>
                    
                    <button
                      onClick={() => handleCheatRequest(challenge)}
                      className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-500 transition-colors"
                      disabled={challenge.current_weekly_cheat_count >= challenge.user_weekly_cheat_limit}
                    >
                      🍕 치팅 사용
                    </button>

                    {challenge.remaining_duration_days <= 0 && (
                      <button
                        onClick={() => router.push('/challenges/report')}
                        className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-500 transition-colors"
                      >
                        📋 완료 리포트
                      </button>
                    )}
                  </div>
                </div>

                {/* 하단: 추가 정보 */}
                <div className="mt-6 pt-6 border-t border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">시작일:</span>
                      <span className="text-white">{new Date(challenge.challenge_start_date).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">종료 예정:</span>
                      <span className="text-white">{new Date(challenge.challenge_end_date).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">마감 시간:</span>
                      <span className="text-white">{challenge.challenge_cutoff_time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 푸터 */}
        <footer className="text-center py-8 text-gray-500 text-sm">
          <p>꾸준한 챌린지 참여로 건강한 식습관을 만들어보세요! 💪</p>
        </footer>
      </div>

      {/* 치팅 모달 */}
      {selectedChallenge && (
        <CheatDayModal
          isOpen={isCheatModalOpen}
          onClose={() => {
            setIsCheatModalOpen(false);
            setSelectedChallenge(null);
          }}
          challenge={selectedChallenge}
          onCheatUsed={() => {
            // 치팅 사용 후 현황 새로고침
            loadMyChallenges();
          }}
        />
      )}
    </div>
  );
} 