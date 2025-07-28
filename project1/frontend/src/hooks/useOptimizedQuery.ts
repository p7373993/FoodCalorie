/**
 * 최적화된 React Query 훅
 */

import { useQuery, useInfiniteQuery, UseQueryOptions, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';

// 캐시 시간 상수
export const CACHE_TIMES = {
  SHORT: 1000 * 60 * 1,      // 1분
  MEDIUM: 1000 * 60 * 5,     // 5분
  LONG: 1000 * 60 * 30,      // 30분
  VERY_LONG: 1000 * 60 * 60, // 1시간
} as const;

// Stale 시간 상수
export const STALE_TIMES = {
  SHORT: 1000 * 30,          // 30초
  MEDIUM: 1000 * 60 * 2,     // 2분
  LONG: 1000 * 60 * 10,      // 10분
  VERY_LONG: 1000 * 60 * 30, // 30분
} as const;

/**
 * 최적화된 쿼리 훅
 */
export function useOptimizedQuery<TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError> & {
    cacheTime?: keyof typeof CACHE_TIMES;
    staleTime?: keyof typeof STALE_TIMES;
  }
) {
  const optimizedOptions = useMemo(() => ({
    ...options,
    cacheTime: options.cacheTime ? CACHE_TIMES[options.cacheTime] : CACHE_TIMES.MEDIUM,
    staleTime: options.staleTime ? STALE_TIMES[options.staleTime] : STALE_TIMES.SHORT,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount: number, error: any) => {
      // 4xx 에러는 재시도하지 않음
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  }), [options]);

  return useQuery(optimizedOptions);
}

/**
 * 무한 스크롤을 위한 최적화된 쿼리 훅
 */
export function useOptimizedInfiniteQuery<TData = unknown, TError = unknown>(
  options: UseInfiniteQueryOptions<TData, TError> & {
    cacheTime?: keyof typeof CACHE_TIMES;
    staleTime?: keyof typeof STALE_TIMES;
  }
) {
  const optimizedOptions = useMemo(() => ({
    ...options,
    cacheTime: options.cacheTime ? CACHE_TIMES[options.cacheTime] : CACHE_TIMES.LONG,
    staleTime: options.staleTime ? STALE_TIMES[options.staleTime] : STALE_TIMES.MEDIUM,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  }), [options]);

  return useInfiniteQuery(optimizedOptions);
}

/**
 * 리더보드용 최적화된 쿼리 훅
 */
export function useLeaderboardQuery(roomId: number, limit: number = 50) {
  return useOptimizedQuery({
    queryKey: ['leaderboard', roomId, limit],
    queryFn: async () => {
      const response = await fetch(`/api/challenges/leaderboard/${roomId}/?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    },
    cacheTime: 'MEDIUM',
    staleTime: 'SHORT',
    enabled: !!roomId,
  });
}

/**
 * 사용자 통계용 최적화된 쿼리 훅
 */
export function useUserStatsQuery(challengeId?: number) {
  return useOptimizedQuery({
    queryKey: ['userStats', challengeId],
    queryFn: async () => {
      const url = challengeId 
        ? `/api/challenges/stats/?challenge_id=${challengeId}`
        : '/api/challenges/stats/';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return response.json();
    },
    cacheTime: 'LONG',
    staleTime: 'MEDIUM',
  });
}

/**
 * 챌린지 방 목록용 최적화된 쿼리 훅
 */
export function useChallengeRoomsQuery() {
  return useOptimizedQuery({
    queryKey: ['challengeRooms'],
    queryFn: async () => {
      const response = await fetch('/api/challenges/rooms/');
      if (!response.ok) throw new Error('Failed to fetch challenge rooms');
      return response.json();
    },
    cacheTime: 'VERY_LONG',
    staleTime: 'LONG',
  });
}

/**
 * 디바운스된 검색 쿼리 훅
 */
export function useDebouncedQuery<TData = unknown>(
  queryKey: any[],
  queryFn: () => Promise<TData>,
  searchTerm: string,
  delay: number = 300
) {
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  return useOptimizedQuery({
    queryKey: [...queryKey, debouncedSearchTerm],
    queryFn,
    enabled: debouncedSearchTerm.length >= 2,
    cacheTime: 'SHORT',
    staleTime: 'SHORT',
  });
}

/**
 * 디바운스 훅
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 쿼리 무효화 헬퍼
 */
export function useQueryInvalidation() {
  const queryClient = useQueryClient();

  const invalidateUserData = useCallback((userId?: number) => {
    queryClient.invalidateQueries({ queryKey: ['userStats'] });
    queryClient.invalidateQueries({ queryKey: ['myChallenge'] });
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
    }
  }, [queryClient]);

  const invalidateLeaderboard = useCallback((roomId?: number) => {
    if (roomId) {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', roomId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  }, [queryClient]);

  const invalidateChallengeRooms = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['challengeRooms'] });
  }, [queryClient]);

  return {
    invalidateUserData,
    invalidateLeaderboard,
    invalidateChallengeRooms,
  };
}

/**
 * 프리페치 헬퍼
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchLeaderboard = useCallback(async (roomId: number) => {
    await queryClient.prefetchQuery({
      queryKey: ['leaderboard', roomId],
      queryFn: async () => {
        const response = await fetch(`/api/challenges/leaderboard/${roomId}/`);
        return response.json();
      },
      staleTime: STALE_TIMES.SHORT,
    });
  }, [queryClient]);

  const prefetchUserStats = useCallback(async (challengeId?: number) => {
    await queryClient.prefetchQuery({
      queryKey: ['userStats', challengeId],
      queryFn: async () => {
        const url = challengeId 
          ? `/api/challenges/stats/?challenge_id=${challengeId}`
          : '/api/challenges/stats/';
        const response = await fetch(url);
        return response.json();
      },
      staleTime: STALE_TIMES.MEDIUM,
    });
  }, [queryClient]);

  return {
    prefetchLeaderboard,
    prefetchUserStats,
  };
}