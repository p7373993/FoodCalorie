import { QueryClient, DefaultOptions } from '@tanstack/react-query';

// React Query 기본 옵션 설정
const queryConfig: DefaultOptions = {
  queries: {
    // 기본 캐시 시간: 5분
    staleTime: 5 * 60 * 1000,
    // 가비지 컬렉션 시간: 10분
    gcTime: 10 * 60 * 1000,
    // 백그라운드에서 자동 새로고침 활성화
    refetchOnWindowFocus: true,
    // 네트워크 재연결 시 자동 새로고침
    refetchOnReconnect: true,
    // 재시도 설정
    retry: (failureCount, error: any) => {
      // 4xx 클라이언트 에러는 재시도하지 않음
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // 최대 3번까지 재시도
      return failureCount < 3;
    },
    // 재시도 지연 시간 (지수 백오프)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  mutations: {
    // 뮤테이션 재시도: 1번만
    retry: 1,
    // 뮤테이션 실패 시 즉시 에러 표시
    retryDelay: 1000,
  },
};

// React Query 클라이언트 생성
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

// 챌린지 관련 쿼리 키 팩토리
export const challengeKeys = {
  // 전체 챌린지 관련 키
  all: ['challenges'] as const,
  
  // 챌린지 방 관련
  rooms: () => [...challengeKeys.all, 'rooms'] as const,
  room: (id: number) => [...challengeKeys.rooms(), id] as const,
  roomsList: (filters?: any) => [...challengeKeys.rooms(), 'list', filters] as const,
  
  // 내 챌린지 관련
  myChallenges: () => [...challengeKeys.all, 'my'] as const,
  myActiveChallenge: () => [...challengeKeys.myChallenges(), 'active'] as const,
  
  // 일일 기록 관련
  records: () => [...challengeKeys.all, 'records'] as const,
  recordsByChallenge: (challengeId: number) => [...challengeKeys.records(), challengeId] as const,
  recordByDate: (date: string, challengeId?: number) => 
    [...challengeKeys.records(), 'date', date, challengeId] as const,
  
  // 치팅 관련
  cheat: () => [...challengeKeys.all, 'cheat'] as const,
  cheatStatus: (challengeId?: number) => [...challengeKeys.cheat(), 'status', challengeId] as const,
  cheatRequests: (challengeId?: number) => [...challengeKeys.cheat(), 'requests', challengeId] as const,
  
  // 리더보드 관련
  leaderboard: (roomId: number) => [...challengeKeys.all, 'leaderboard', roomId] as const,
  myRank: (roomId: number) => [...challengeKeys.leaderboard(roomId), 'my-rank'] as const,
  
  // 통계 및 리포트 관련
  stats: () => [...challengeKeys.all, 'stats'] as const,
  personalStats: (challengeId?: number) => [...challengeKeys.stats(), 'personal', challengeId] as const,
  completionReport: (challengeId?: number) => [...challengeKeys.stats(), 'completion', challengeId] as const,
  
  // 배지 관련
  badges: () => [...challengeKeys.all, 'badges'] as const,
  userBadges: (userId?: number) => [...challengeKeys.badges(), 'user', userId] as const,
  
  // 실시간 데이터
  realtime: () => [...challengeKeys.all, 'realtime'] as const,
  refreshData: (challengeId?: number) => [...challengeKeys.realtime(), challengeId] as const,
};

// 캐시 무효화 헬퍼 함수들
export const invalidateChallengeQueries = {
  // 모든 챌린지 데이터 무효화
  all: () => queryClient.invalidateQueries({ queryKey: challengeKeys.all }),
  
  // 챌린지 방 목록 무효화
  rooms: () => queryClient.invalidateQueries({ queryKey: challengeKeys.rooms() }),
  
  // 내 챌린지 무효화
  myChallenges: () => queryClient.invalidateQueries({ queryKey: challengeKeys.myChallenges() }),
  
  // 리더보드 무효화
  leaderboard: (roomId: number) => 
    queryClient.invalidateQueries({ queryKey: challengeKeys.leaderboard(roomId) }),
  
  // 통계 무효화
  stats: () => queryClient.invalidateQueries({ queryKey: challengeKeys.stats() }),
  
  // 치팅 상태 무효화
  cheatStatus: (challengeId?: number) => 
    queryClient.invalidateQueries({ queryKey: challengeKeys.cheatStatus(challengeId) }),
  
  // 일일 기록 무효화
  records: (challengeId?: number) => {
    if (challengeId) {
      queryClient.invalidateQueries({ queryKey: challengeKeys.recordsByChallenge(challengeId) });
    } else {
      queryClient.invalidateQueries({ queryKey: challengeKeys.records() });
    }
  },
};

// 캐시 프리페치 헬퍼 함수들
export const prefetchChallengeQueries = {
  // 챌린지 방 목록 프리페치
  rooms: async (filters?: any) => {
    const { challengeApi } = await import('./challengeApi');
    return queryClient.prefetchQuery({
      queryKey: challengeKeys.roomsList(filters),
      queryFn: () => challengeApi.getChallengeRooms(filters),
      staleTime: 10 * 60 * 1000, // 10분간 신선
    });
  },
  
  // 리더보드 프리페치
  leaderboard: async (roomId: number) => {
    const { challengeApi } = await import('./challengeApi');
    return queryClient.prefetchQuery({
      queryKey: challengeKeys.leaderboard(roomId),
      queryFn: () => challengeApi.getLeaderboard(roomId),
      staleTime: 2 * 60 * 1000, // 2분간 신선 (실시간성 중요)
    });
  },
};

// 옵티미스틱 업데이트 헬퍼
export const optimisticUpdates = {
  // 치팅 사용 시 즉시 UI 업데이트
  useCheatDay: (challengeId: number) => {
    const queryKey = challengeKeys.cheatStatus(challengeId);
    
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.data?.weekly_cheat_status) return oldData;
      
      return {
        ...oldData,
        data: {
          ...oldData.data,
          weekly_cheat_status: {
            ...oldData.data.weekly_cheat_status,
            used_count: oldData.data.weekly_cheat_status.used_count + 1,
            remaining_count: oldData.data.weekly_cheat_status.remaining_count - 1,
            can_use_today: false,
          },
        },
      };
    });
  },
  
  // 챌린지 참여 시 즉시 UI 업데이트
  joinChallenge: (newChallenge: any) => {
    const queryKey = challengeKeys.myChallenges();
    
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.data) return oldData;
      
      return {
        ...oldData,
        data: [...oldData.data, newChallenge],
      };
    });
  },
};

// 에러 핸들링 헬퍼
export const handleChallengeQueryError = (error: any, context?: string) => {
  console.error(`Challenge Query Error ${context ? `(${context})` : ''}:`, error);
  
  // 인증 오류 시 로그인 페이지로 리다이렉트
  if (error?.status === 401) {
    // TODO: 로그인 페이지로 리다이렉트
    window.location.href = '/login';
    return;
  }
  
  // 서버 오류 시 토스트 알림
  if (error?.status >= 500) {
    // TODO: 토스트 알림 시스템 연동
    console.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  
  // 기타 오류 처리
  const message = error?.error?.message || error?.message || '알 수 없는 오류가 발생했습니다.';
  console.error(message);
};

export default queryClient; 