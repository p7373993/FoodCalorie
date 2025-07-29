'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserChallenge } from '@/types';
import { apiClient } from '@/lib/api';
import CheatDayModal from '@/components/challenges/CheatDayModal';
import ChallengeCompletionReport from '@/components/challenges/ChallengeCompletionReport';

export default function MyChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheatModalOpen, setIsCheatModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<UserChallenge | null>(null);
  const [isCompletionReportOpen, setIsCompletionReportOpen] = useState(false);
  const [completionChallenge, setCompletionChallenge] = useState<UserChallenge | null>(null);
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [quitChallenge, setQuitChallenge] = useState<UserChallenge | null>(null);

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

  const handleViewReport = (challenge: UserChallenge) => {
    setCompletionChallenge(challenge);
    setIsCompletionReportOpen(true);
  };

  const handleQuitChallenge = (challenge: UserChallenge) => {
    setQuitChallenge(challenge);
    setIsQuitModalOpen(true);
  };

  const handleConfirmQuit = async (reason: string) => {
    if (!quitChallenge) return;

    try {
      const response = await apiClient.leaveChallenge(quitChallenge.id);
      if (response.success) {
        // 성공 시 목록 새로고침
        loadMyChallenges();
        setIsQuitModalOpen(false);
        setQuitChallenge(null);
        
        // 성공 메시지 표시 (선택적)
        alert(`"${quitChallenge.room_name}" 챌린지를 포기했습니다.`);
      } else {
        alert(response.message || '챌린지 포기 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Error quitting challenge:', err);
      alert('챌린지 포기 중 오류가 발생했습니다.');
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
                      onClick={() => handleCheatRequest(challenge)}
                      className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-500 transition-colors"
                      disabled={challenge.current_weekly_cheat_count >= challenge.user_weekly_cheat_limit}
                    >
                      🍕 치팅 사용
                    </button>
                    
                    <button
                      onClick={() => handleQuitChallenge(challenge)}
                      className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-500 transition-colors"
                    >
                      🚪 챌린지 포기
                    </button>

                    {challenge.remaining_duration_days <= 0 && (
                      <button
                        onClick={() => handleViewReport(challenge)}
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

      {/* 완료 리포트 모달 */}
      {completionChallenge && (
        <ChallengeCompletionReport
          isOpen={isCompletionReportOpen}
          onClose={() => {
            setIsCompletionReportOpen(false);
            setCompletionChallenge(null);
          }}
          challenge={completionChallenge}
          onActionComplete={(action) => {
            // 행동 완료 후 현황 새로고침
            loadMyChallenges();
            if (action === 'new_challenge') {
              router.push('/challenges');
            }
          }}
        />
      )}

      {/* 챌린지 포기 확인 모달 */}
      {quitChallenge && (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${isQuitModalOpen ? 'block' : 'hidden'}`}>
          <div className="bg-[var(--card-bg)] rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-600">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-white mb-2">챌린지를 포기하시겠습니까?</h3>
              <p className="text-gray-400">
                "{quitChallenge.room_name}" 챌린지를 포기하면 현재까지의 기록이 저장되지만 더 이상 참여할 수 없습니다.
              </p>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">현재 연속 기록:</span>
                  <span className="text-white ml-2 font-bold">{quitChallenge.current_streak_days}일</span>
                </div>
                <div>
                  <span className="text-gray-400">총 성공 일수:</span>
                  <span className="text-white ml-2 font-bold">{quitChallenge.total_success_days}일</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsQuitModalOpen(false);
                  setQuitChallenge(null);
                }}
                className="flex-1 bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleConfirmQuit('사용자 요청')}
                className="flex-1 bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-500 transition-colors"
              >
                포기하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 