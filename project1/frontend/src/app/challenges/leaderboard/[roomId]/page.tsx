'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChallengeRoom } from '@/types';
import { apiClient } from '@/lib/api';
import Leaderboard from '@/components/challenges/Leaderboard';

export default function LeaderboardPage() {
  const router = useRouter();
  const params = useParams();
  const [room, setRoom] = useState<ChallengeRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoomInfo = async () => {
      try {
        setLoading(true);
        const roomId = Number(params.roomId);
        
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
        console.error('Error loading room info:', err);
        setError('챌린지 방 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (params.roomId) {
      loadRoomInfo();
    }
  }, [params.roomId]);

  const handleBackToRoom = () => {
    if (room) {
      router.push(`/challenges/${room.id}`);
    } else {
      router.push('/challenges');
    }
  };

  const handleBackToList = () => {
    router.push('/challenges');
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

  return (
    <div className="bg-grid-pattern text-white min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <header className="flex justify-between items-center py-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-black" style={{ fontFamily: 'NanumGothic', color: 'var(--point-green)' }}>
                리더보드
              </h1>
              <div className="bg-[var(--card-bg)] px-4 py-2 rounded-lg border border-gray-600">
                <span className="text-white font-medium">{room.name}</span>
              </div>
            </div>
            <p className="text-gray-400">
              {room.target_calorie.toLocaleString()}kcal 챌린지 • {room.participant_count}명 참여 중
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleBackToRoom}
              className="bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
              style={{ fontFamily: 'NanumGothic' }}
            >
              챌린지 상세
            </button>
            <button
              onClick={handleBackToList}
              className="bg-[var(--point-green)] text-black font-bold py-3 px-6 rounded-lg hover:bg-green-400 transition-colors"
              style={{ fontFamily: 'NanumGothic' }}
            >
              목록으로
            </button>
          </div>
        </header>

        {/* 챌린지 방 정보 */}
        <div className="mb-8">
          <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {room.target_calorie.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">목표 칼로리</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  ±{room.tolerance}
                </div>
                <div className="text-sm text-gray-400">허용 오차</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--point-green)] mb-1">
                  {room.participant_count}
                </div>
                <div className="text-sm text-gray-400">총 참여자</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {new Date(room.created_at).toLocaleDateString('ko-KR')}
                </div>
                <div className="text-sm text-gray-400">생성일</div>
              </div>
            </div>
          </div>
        </div>

        {/* 리더보드 컴포넌트 */}
        <Leaderboard 
          roomId={room.id}
          currentUserId={undefined} // TODO: 현재 사용자 ID 연동
          autoRefresh={true}
          refreshInterval={15000}
        />

        {/* 하단 안내 */}
        <div className="mt-8 text-center">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">💡 순위 산정 방식</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                <div className="font-semibold text-white mb-1">1차: 연속 성공 일수</div>
                <div>연속으로 목표를 달성한 일수가 높을수록 상위 순위</div>
              </div>
              <div>
                <div className="font-semibold text-white mb-1">2차: 총 성공 일수</div>
                <div>연속 일수가 같을 경우 총 성공 일수로 순위 결정</div>
              </div>
              <div>
                <div className="font-semibold text-white mb-1">3차: 참여 시작일</div>
                <div>총 성공도 같을 경우 먼저 시작한 사용자가 상위</div>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <footer className="text-center py-8 text-gray-500 text-sm">
          <p>리더보드는 15초마다 자동으로 업데이트됩니다 🏆</p>
        </footer>
      </div>
    </div>
  );
} 