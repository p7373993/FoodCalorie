/**
 * 성능 최적화된 리더보드 컴포넌트
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { useLeaderboardQuery, usePrefetch } from '../../hooks/useOptimizedQuery';
import { useVirtualizer } from '@tanstack/react-virtual';

interface LeaderboardEntry {
  rank: number;
  username: string;
  user_id: number;
  current_streak: number;
  max_streak: number;
  total_success_days: number;
  challenge_start_date: string;
  last_activity: string;
}

interface OptimizedLeaderboardProps {
  roomId: number;
  currentUserId?: number;
  limit?: number;
}

// 개별 리더보드 항목 컴포넌트 (메모화)
const LeaderboardItem = memo<{
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  onUserClick?: (userId: number) => void;
}>(({ entry, isCurrentUser, onUserClick }) => {
  const handleClick = useCallback(() => {
    onUserClick?.(entry.user_id);
  }, [entry.user_id, onUserClick]);

  return (
    <div
      className={`
        flex items-center justify-between p-4 border-b border-gray-200
        hover:bg-gray-50 transition-colors cursor-pointer
        ${isCurrentUser ? 'bg-blue-50 border-blue-200' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-4">
        <div className={`
          flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
          ${entry.rank <= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}
        `}>
          {entry.rank}
        </div>
        
        <div>
          <div className={`font-medium ${isCurrentUser ? 'text-blue-600' : 'text-gray-900'}`}>
            {entry.username}
            {isCurrentUser && <span className="ml-2 text-xs text-blue-500">(나)</span>}
          </div>
          <div className="text-sm text-gray-500">
            시작일: {new Date(entry.challenge_start_date).toLocaleDateString()}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="text-lg font-bold text-gray-900">
          {entry.current_streak}일 연속
        </div>
        <div className="text-sm text-gray-500">
          최고 {entry.max_streak}일 | 총 {entry.total_success_days}일
        </div>
      </div>
    </div>
  );
});

LeaderboardItem.displayName = 'LeaderboardItem';

// 가상화된 리더보드 컴포넌트
const VirtualizedLeaderboard = memo<{
  entries: LeaderboardEntry[];
  currentUserId?: number;
  onUserClick?: (userId: number) => void;
}>(({ entries, currentUserId, onUserClick }) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 각 항목의 예상 높이
    overscan: 5, // 화면 밖 렌더링할 항목 수
  });

  return (
    <div
      ref={parentRef}
      className="h-96 overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const entry = entries[virtualItem.index];
          const isCurrentUser = currentUserId === entry.user_id;

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <LeaderboardItem
                entry={entry}
                isCurrentUser={isCurrentUser}
                onUserClick={onUserClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedLeaderboard.displayName = 'VirtualizedLeaderboard';

// 메인 리더보드 컴포넌트
export const OptimizedLeaderboard: React.FC<OptimizedLeaderboardProps> = memo(({
  roomId,
  currentUserId,
  limit = 100,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { prefetchUserStats } = usePrefetch();

  const {
    data: leaderboardData,
    isLoading,
    error,
    refetch,
  } = useLeaderboardQuery(roomId, limit);

  // 리더보드 데이터 메모화
  const leaderboard = useMemo(() => {
    return leaderboardData?.data?.leaderboard || [];
  }, [leaderboardData]);

  // 내 순위 정보 메모화
  const myRankInfo = useMemo(() => {
    if (!currentUserId || !leaderboard.length) return null;
    
    const myEntry = leaderboard.find((entry: LeaderboardEntry) => entry.user_id === currentUserId);
    return myEntry ? {
      rank: myEntry.rank,
      streak: myEntry.current_streak,
    } : null;
  }, [leaderboard, currentUserId]);

  // 사용자 클릭 핸들러 (프리페치 포함)
  const handleUserClick = useCallback(async (userId: number) => {
    setSelectedUserId(userId);
    
    // 사용자 통계 프리페치
    try {
      await prefetchUserStats();
    } catch (error) {
      console.warn('Failed to prefetch user stats:', error);
    }
  }, [prefetchUserStats]);

  // 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">리더보드를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">리더보드를 불러오는데 실패했습니다.</div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!leaderboard.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        아직 참여자가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {leaderboardData?.data?.room_name} 리더보드
          </h2>
          <div className="flex items-center space-x-4">
            {myRankInfo && (
              <div className="text-sm text-gray-600">
                내 순위: <span className="font-bold text-blue-600">{myRankInfo.rank}위</span>
                ({myRankInfo.streak}일 연속)
              </div>
            )}
            <button
              onClick={handleRefresh}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              새로고침
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          총 {leaderboardData?.data?.total_participants || 0}명 참여
        </div>
      </div>

      {/* 리더보드 목록 */}
      {leaderboard.length > 20 ? (
        <VirtualizedLeaderboard
          entries={leaderboard}
          currentUserId={currentUserId}
          onUserClick={handleUserClick}
        />
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {leaderboard.map((entry: LeaderboardEntry) => (
            <LeaderboardItem
              key={entry.user_id}
              entry={entry}
              isCurrentUser={currentUserId === entry.user_id}
              onUserClick={handleUserClick}
            />
          ))}
        </div>
      )}

      {/* 푸터 */}
      <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 text-center">
        실시간으로 업데이트됩니다 • 마지막 업데이트: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
});

OptimizedLeaderboard.displayName = 'OptimizedLeaderboard';

export default OptimizedLeaderboard;