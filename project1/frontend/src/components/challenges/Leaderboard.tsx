'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LeaderboardEntry } from '@/types';
import { apiClient } from '@/lib/api';

interface LeaderboardProps {
  roomId: number;
  currentUserId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  roomId,
  currentUserId,
  autoRefresh = true,
  refreshInterval = 15000, // 15초마다 업데이트
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);

  const itemsPerPage = 20;

  useEffect(() => {
    loadLeaderboard();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshLeaderboard();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [roomId, currentPage, autoRefresh, refreshInterval]);

  const loadLeaderboard = async () => {
    try {
      console.log(`Loading leaderboard for room ${roomId}`);
      setLoading(true);
      setError(null);

      const response = await apiClient.getLeaderboard(roomId);
      console.log('Leaderboard API response:', response);
      
      // 응답 구조 확인 및 처리
      if (response && response.data && response.data.leaderboard) {
        // 백엔드 API 응답 구조에 맞게 처리
        const leaderboardData = response.data.leaderboard || [];
        console.log('Raw leaderboard data:', leaderboardData);
        
        // 프론트엔드에서 필요한 필드명으로 매핑
        const mappedData = leaderboardData.map((entry: any) => ({
          ...entry,
          current_streak: entry.current_streak,
          total_success: entry.total_success_days,
          start_date: entry.challenge_start_date,
          is_me: currentUserId ? entry.user_id === currentUserId : false
        }));

        console.log('Mapped leaderboard data:', mappedData);
        setLeaderboard(mappedData);
        setMyRank(response.data.my_rank || null);
        setTotalParticipants(response.data.total_participants || 0);
        setTotalPages(Math.ceil(mappedData.length / itemsPerPage));
        console.log('Leaderboard state updated successfully');
      } else if (response && response.success === false) {
        console.error('API response not successful:', response);
        setError(response.message || '리더보드를 불러올 수 없습니다.');
      } else {
        console.error('Unexpected response structure:', response);
        setError('리더보드 데이터 형식이 올바르지 않습니다.');
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('리더보드를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const refreshLeaderboard = async () => {
    try {
      setRefreshing(true);
      await loadLeaderboard();
    } catch (err) {
      console.warn('자동 새로고침 실패:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return leaderboard.slice(startIndex, endIndex);
  };

  const getRankChangeIcon = (entry: LeaderboardEntry) => {
    if (entry.current_streak >= 7) return '🔥';
    if (entry.current_streak >= 3) return '⚡';
    if (entry.current_streak >= 1) return '💪';
    return '😴';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'text-yellow-400' };
    if (rank === 2) return { emoji: '🥈', color: 'text-gray-300' };
    if (rank === 3) return { emoji: '🥉', color: 'text-yellow-600' };
    if (rank <= 10) return { emoji: '🏆', color: 'text-[var(--point-green)]' };
    return { emoji: '🎯', color: 'text-gray-400' };
  };

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--point-green)] mb-4"></div>
          <p className="text-gray-400">리더보드를 불러오는 중...</p>
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
          <h3 className="text-xl font-bold text-white mb-2">리더보드 로드 실패</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadLeaderboard}
            className="bg-[var(--point-green)] text-black font-bold py-2 px-4 rounded-lg hover:bg-green-400 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const currentPageData = getCurrentPageData();

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'NanumGothic' }}>
            리더보드
          </h2>
          <p className="text-gray-400">
            실시간 순위 • 총 {totalParticipants}명 참여
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 실시간 업데이트 상태 */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-400 animate-pulse' : 'bg-[var(--point-green)]'}`}></div>
            {refreshing ? '업데이트 중...' : '실시간 연결'}
          </div>
          
          <button
            onClick={refreshLeaderboard}
            className="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors"
            disabled={refreshing}
          >
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 내 순위 요약 (상위에 표시) */}
      {myRank && (
        <div className="bg-gradient-to-r from-[var(--point-green)]/20 to-blue-500/20 rounded-xl p-6 border border-[var(--point-green)]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{getRankBadge(myRank).emoji}</div>
              <div>
                <h3 className="text-xl font-bold text-white">내 현재 순위</h3>
                <p className="text-gray-300">
                  <span className={`text-2xl font-bold ${getRankBadge(myRank).color}`}>
                    {myRank}위
                  </span>
                  <span className="text-gray-400 ml-2">/ {totalParticipants}명</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">상위</p>
              <p className="text-lg font-bold text-white">
                {Math.round(((totalParticipants - myRank + 1) / totalParticipants) * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 리더보드 테이블 */}
      <div className="bg-[var(--card-bg)] rounded-2xl border border-gray-600 overflow-hidden">
        <div className="p-6 border-b border-gray-600">
          <h3 className="text-xl font-bold text-white">순위표</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">순위</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">사용자</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">연속 성공</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">총 성공</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">참여 기간</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {currentPageData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    아직 참여자가 없습니다.
                  </td>
                </tr>
              ) : (
                currentPageData.map((entry) => {
                  const badge = getRankBadge(entry.rank);
                  const isMe = entry.is_me;
                  
                  return (
                    <tr
                      key={entry.user_id}
                      className={`hover:bg-gray-700/30 transition-colors ${
                        isMe ? 'bg-[var(--point-green)]/10 border-l-4 border-[var(--point-green)]' : ''
                      }`}
                    >
                      {/* 순위 */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{badge.emoji}</span>
                          <span className={`text-lg font-bold ${badge.color}`}>
                            {entry.rank}
                          </span>
                          {isMe && (
                            <span className="bg-[var(--point-green)] text-black text-xs font-bold px-2 py-1 rounded-full">
                              ME
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* 사용자 */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {entry.username?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className={`font-medium ${isMe ? 'text-[var(--point-green)]' : 'text-white'}`}>
                              {entry.username || `User ${entry.user_id}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(entry.start_date).toLocaleDateString('ko-KR')} 시작
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      {/* 연속 성공 */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl">{getRankChangeIcon(entry)}</span>
                          <span className="text-lg font-bold text-white">
                            {entry.current_streak}일
                          </span>
                        </div>
                      </td>
                      
                      {/* 총 성공 */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-[var(--point-green)]">
                          {entry.total_success}일
                        </span>
                      </td>
                      
                      {/* 참여 기간 */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-300">
                          {Math.floor(
                            (new Date().getTime() - new Date(entry.start_date).getTime()) / (1000 * 60 * 60 * 24)
                          )}일째
                        </span>
                      </td>
                      
                      {/* 상태 */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          entry.current_streak >= 7
                            ? 'bg-[var(--point-green)]/20 text-[var(--point-green)]'
                            : entry.current_streak >= 3
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : entry.current_streak >= 1
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-600/20 text-gray-400'
                        }`}>
                          {entry.current_streak >= 7 ? '🔥 연승' : 
                           entry.current_streak >= 1 ? '💪 활발' : '😴 휴식'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalParticipants)} / {totalParticipants}명
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  이전
                </button>
                
                {/* 페이지 번호들 */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded transition-colors ${
                          pageNum === currentPage
                            ? 'bg-[var(--point-green)] text-black font-bold'
                            : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard; 