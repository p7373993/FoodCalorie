'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChallengeRoom } from '@/types';
import { apiClient } from '@/lib/api';
import ChallengeJoinForm from '@/components/challenges/ChallengeJoinForm';

type PageMode = 'details' | 'join';

export default function ChallengeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [room, setRoom] = useState<ChallengeRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageMode, setPageMode] = useState<PageMode>('details');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const loadChallengeRoom = async () => {
      try {
        setLoading(true);
        const roomId = Number(params.id);
        
        if (isNaN(roomId)) {
          setError('잘못된 챌린지 방 ID입니다.');
          return;
        }

        const response = await apiClient.getChallengeRoom(roomId);
        
        if (response && response.id) {
          setRoom(response);
          setError(null);
        } else {
          setError('챌린지 방을 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('Error loading challenge room:', err);
        setError('챌린지 방 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadChallengeRoom();
    }
  }, [params.id]);

  const handleJoinClick = async () => {
    try {
      // 먼저 현재 참여 중인 챌린지가 있는지 확인
      const myChallengesResponse = await apiClient.getMyChallenges();
      const activeChallenge = myChallengesResponse?.data?.active_challenges?.find((challenge: any) => challenge.status === 'active');
      
      if (activeChallenge) {
        // 이미 참여 중인 경우 알림 표시
        setJoinError(`이미 "${activeChallenge.room_name}" 챌린지에 참여 중입니다. 새로운 챌린지에 참여하려면 기존 챌린지를 포기해야 합니다.`);
        return;
      }
      
      // 참여 중이 아닌 경우 참여 폼으로 이동
      setJoinError(null);
      setPageMode('join');
    } catch (err) {
      console.error('Error checking current challenges:', err);
      setJoinError('챌린지 참여 상태를 확인하는 중 오류가 발생했습니다.');
    }
  };

  const handleJoinSuccess = () => {
    // 참여 성공 시 내 챌린지 페이지로 이동
    router.push('/challenges/my');
  };

  const handleBackToDetails = () => {
    setPageMode('details');
  };

  const handleBackToList = () => {
    router.push('/challenges');
  };

  const handleLeaveAndJoin = async () => {
    try {
      // 현재 활성 챌린지 정보를 가져옴
      const myChallengesResponse = await apiClient.getMyChallenges();
      const activeChallenge = myChallengesResponse?.data?.active_challenges?.find((challenge: any) => challenge.status === 'active');
      
      if (activeChallenge) {
        // 기존 챌린지 포기
        await apiClient.leaveChallenge(activeChallenge.id);
        
        // 포기 성공 후 참여 폼으로 이동
        setJoinError(null);
        setPageMode('join');
      } else {
        setJoinError('활성 챌린지를 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error('Error leaving challenge:', err);
      setJoinError('기존 챌린지 포기 중 오류가 발생했습니다.');
    }
  };

  const getDifficultyInfo = (targetCalorie: number) => {
    if (targetCalorie <= 1200) return { label: '매우 어려움', color: 'text-red-500', emoji: '🔥🔥🔥🔥🔥' };
    if (targetCalorie <= 1500) return { label: '어려움', color: 'text-orange-500', emoji: '🔥🔥🔥🔥' };
    if (targetCalorie <= 1800) return { label: '보통', color: 'text-[var(--point-green)]', emoji: '🔥🔥🔥' };
    if (targetCalorie <= 2200) return { label: '쉬움', color: 'text-blue-400', emoji: '🔥🔥' };
    return { label: '매우 쉬움', color: 'text-gray-400', emoji: '🔥' };
  };

  if (loading) {
    return (
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--point-green)] mb-4"></div>
          <p className="text-xl text-gray-400">챌린지 방 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleBackToList}
            className="bg-[var(--point-green)] text-black font-bold py-3 px-6 rounded-lg hover:bg-green-400 transition-colors"
          >
            챌린지 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (pageMode === 'join') {
    return (
      <div className="bg-grid-pattern text-white min-h-screen p-4">
        <ChallengeJoinForm
          room={room}
          onSuccess={handleJoinSuccess}
          onCancel={handleBackToDetails}
        />
      </div>
    );
  }

  const difficulty = getDifficultyInfo(room.target_calorie);

  return (
    <div className="bg-grid-pattern text-white min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <header className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'NanumGothic', color: 'var(--point-green)' }}>
              챌린지 상세 정보
            </h1>
            <p className="text-gray-400">
              챌린지 정보를 확인하고 참여해보세요
            </p>
          </div>
          <button
            onClick={handleBackToList}
            className="bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
            style={{ fontFamily: 'NanumGothic' }}
          >
            목록으로
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 왼쪽: 챌린지 방 정보 */}
          <div className="space-y-6">
            {/* 메인 정보 카드 */}
            <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">{room.name}</h2>
                <div className="bg-gray-800/50 px-4 py-2 rounded-full">
                  <span className="text-[var(--point-green)] font-bold">활성</span>
                </div>
              </div>

              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                {room.description}
              </p>

              {/* 핵심 정보 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">목표 칼로리</div>
                  <div className="text-2xl font-bold text-white">
                    {room.target_calorie.toLocaleString()} kcal
                  </div>
                  <div className="text-xs text-gray-500">±{room.tolerance}kcal 허용</div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">현재 참여자</div>
                  <div className="text-2xl font-bold text-white">
                    {room.participant_count}명
                  </div>
                  <div className="text-xs text-gray-500">활발한 커뮤니티</div>
                </div>
              </div>

              {/* 난이도 */}
              <div className="bg-gray-800/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">난이도</div>
                    <div className={`text-xl font-bold ${difficulty.color}`}>
                      {difficulty.label}
                    </div>
                  </div>
                  <div className="text-3xl">{difficulty.emoji}</div>
                </div>
              </div>

              {/* 생성일 */}
              <div className="text-sm text-gray-500 text-center">
                📅 {new Date(room.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}에 생성됨
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
              <h3 className="text-xl font-bold text-white mb-4">💡 이런 분께 추천해요</h3>
              <ul className="space-y-3 text-gray-300">
                {room.target_calorie <= 1500 && (
                  <>
                    <li className="flex items-center gap-3">
                      <span className="text-[var(--point-green)]">✓</span>
                      체중 감량이 목표인 분
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-[var(--point-green)]">✓</span>
                      강한 의지력을 가진 분
                    </li>
                  </>
                )}
                {room.target_calorie > 1500 && room.target_calorie <= 1800 && (
                  <>
                    <li className="flex items-center gap-3">
                      <span className="text-[var(--point-green)]">✓</span>
                      체중 유지가 목표인 분
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-[var(--point-green)]">✓</span>
                      균형 잡힌 식습관을 원하는 분
                    </li>
                  </>
                )}
                {room.target_calorie > 1800 && (
                  <>
                    <li className="flex items-center gap-3">
                      <span className="text-[var(--point-green)]">✓</span>
                      체중 증량이나 근육량 증가가 목표인 분
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-[var(--point-green)]">✓</span>
                      활동량이 많은 분
                    </li>
                  </>
                )}
                <li className="flex items-center gap-3">
                  <span className="text-[var(--point-green)]">✓</span>
                  꾸준한 식단 관리를 하고 싶은 분
                </li>
              </ul>
            </div>
          </div>

          {/* 오른쪽: 참여 섹션 */}
          <div className="space-y-6">
            {/* 참여 안내 */}
            <div className="bg-gradient-to-br from-[var(--point-green)]/20 to-blue-500/20 rounded-2xl p-8 border border-[var(--point-green)]/30">
              <div className="text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  지금 바로 챌린지에 참여하세요!
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  AI 기반 식단 분석으로 자동 판정되며,<br />
                  다른 사용자들과 실시간으로 경쟁할 수 있습니다.
                </p>
                
                {/* 참여 에러 메시지 */}
                {joinError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <p className="text-red-400 text-sm mb-3 text-center">{joinError}</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          // 기존 챌린지 포기 후 새 챌린지 참여
                          handleLeaveAndJoin();
                        }}
                        className="px-4 py-2 bg-yellow-500 text-black text-sm font-medium rounded-lg hover:bg-yellow-400 transition-colors"
                      >
                        기존 챌린지 포기하고 참여
                      </button>
                      <button
                        onClick={() => setJoinError(null)}
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-500 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleJoinClick}
                  className="w-full bg-[var(--point-green)] text-black font-bold py-4 px-8 rounded-lg text-lg hover:bg-green-400 transition-all duration-300 transform hover:scale-105"
                >
                  🚀 챌린지 참여하기
                </button>
              </div>
            </div>

            {/* 챌린지 특징 */}
            <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
              <h3 className="text-xl font-bold text-white mb-4">🌟 챌린지 특징</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🤖</div>
                  <div>
                    <div className="font-semibold text-white">AI 자동 판정</div>
                    <div className="text-sm text-gray-400">식단 사진만 올리면 자동으로 칼로리 분석</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <div className="font-semibold text-white">실시간 순위</div>
                    <div className="text-sm text-gray-400">연속 성공 일수로 다른 사용자와 경쟁</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🍕</div>
                  <div>
                    <div className="font-semibold text-white">치팅 시스템</div>
                    <div className="text-sm text-gray-400">주간 치팅으로 부담 없는 챌린지</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🏅</div>
                  <div>
                    <div className="font-semibold text-white">배지 획득</div>
                    <div className="text-sm text-gray-400">성취에 따른 다양한 배지 시스템</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 주의사항 */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-3">⚠️ 참여 전 확인사항</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• 챌린지 참여 후에는 설정 변경이 제한됩니다</li>
                <li>• 하루에 최소 2회의 식사 기록이 필요합니다</li>
                <li>• 23시 이후의 식사는 다음 날로 계산됩니다</li>
                <li>• 연속 실패 시 순위가 초기화됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}