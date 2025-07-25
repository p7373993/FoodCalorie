import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { challengeApi } from '@/lib/challengeApi';
import { 
  challengeKeys, 
  invalidateChallengeQueries, 
  optimisticUpdates
} from '@/lib/queryClient';
import { 
  ChallengeRoom, 
  UserChallenge, 
  ChallengeJoinRequest,
  DailyChallengeRecord,
  CheatDayRequest,
  LeaderboardEntry,
  ChallengeAction
} from '@/types';

// ===========================================
// 챌린지 방 관련 훅
// ===========================================

export const useChallengeRooms = (params?: {
  page?: number;
  limit?: number;
  difficulty?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: challengeKeys.roomsList(params),
    queryFn: () => challengeApi.getChallengeRooms(params),
    staleTime: 10 * 60 * 1000, // 10분간 신선
  });
};

export const useChallengeRoom = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: challengeKeys.room(id),
    queryFn: () => challengeApi.getChallengeRoom(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5분간 신선
  });
};

// ===========================================
// 내 챌린지 관련 훅
// ===========================================

export const useMyChallenges = () => {
  return useQuery({
    queryKey: challengeKeys.myChallenges(),
    queryFn: () => challengeApi.getMyChallenges(),
    staleTime: 2 * 60 * 1000, // 2분간 신선 (자주 변경됨)
  });
};

export const useMyActiveChallenge = () => {
  return useQuery({
    queryKey: challengeKeys.myActiveChallenge(),
    queryFn: () => challengeApi.getMyActiveChallenge(),
    staleTime: 1 * 60 * 1000, // 1분간 신선 (실시간성 중요)
    refetchInterval: 30 * 1000, // 30초마다 자동 새로고침
  });
};

// 챌린지 참여 뮤테이션
export const useJoinChallenge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (joinData: ChallengeJoinRequest) => challengeApi.joinChallengeRoom(joinData),
    onMutate: async () => {
      // 옵티미스틱 업데이트 취소
      await queryClient.cancelQueries({ queryKey: challengeKeys.myChallenges() });
      
      // 이전 데이터 백업
      const previousChallenges = queryClient.getQueryData(challengeKeys.myChallenges());
      
      return { previousChallenges };
    },
    onSuccess: () => {
      // 성공 시 관련 쿼리 무효화
      invalidateChallengeQueries.myChallenges();
      invalidateChallengeQueries.rooms();
    },
    onError: (error, variables, context) => {
      // 실패 시 이전 데이터로 롤백
      if (context?.previousChallenges) {
        queryClient.setQueryData(challengeKeys.myChallenges(), context.previousChallenges);
      }
    },
  });
};

// 챌린지 연장 뮤테이션
export const useExtendChallenge = () => {
  return useMutation({
    mutationFn: ({ challengeId, extensionDays }: { challengeId: number; extensionDays: number }) =>
      challengeApi.extendChallenge(challengeId, extensionDays),
    onSuccess: () => {
      invalidateChallengeQueries.myChallenges();
    },
  });
};

// 챌린지 탈퇴 뮤테이션
export const useLeaveChallenge = () => {
  return useMutation({
    mutationFn: (challengeId: number) => challengeApi.leaveChallenge(challengeId),
    onSuccess: () => {
      invalidateChallengeQueries.myChallenges();
    },
  });
};

// ===========================================
// 일일 기록 관련 훅
// ===========================================

export const useDailyChallengeRecords = (
  challengeId?: number,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: challengeKeys.recordsByChallenge(challengeId || 0),
    queryFn: () => challengeApi.getDailyChallengeRecords(challengeId, startDate, endDate),
    enabled: !!challengeId,
    staleTime: 30 * 1000, // 30초간 신선 (자주 변경)
  });
};

export const useDailyChallengeRecord = (date: string, challengeId?: number) => {
  return useQuery({
    queryKey: challengeKeys.recordByDate(date, challengeId),
    queryFn: () => challengeApi.getDailyChallengeRecord(date, challengeId),
    enabled: !!date,
    staleTime: 30 * 1000, // 30초간 신선
  });
};

// ===========================================
// 치팅 관련 훅
// ===========================================

export const useCheatDayStatus = (challengeId?: number) => {
  return useQuery({
    queryKey: challengeKeys.cheatStatus(challengeId),
    queryFn: () => challengeApi.getCheatDayStatus(challengeId),
    staleTime: 1 * 60 * 1000, // 1분간 신선
  });
};

export const useRequestCheatDay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, challengeId }: { date: string; challengeId?: number }) =>
      challengeApi.requestCheatDay(date, challengeId),
    onMutate: async ({ challengeId }) => {
      // 옵티미스틱 업데이트
      if (challengeId) {
        optimisticUpdates.useCheatDay(challengeId);
      }
    },
    onSuccess: (data, variables) => {
      // 성공 시 관련 쿼리 무효화
      if (variables.challengeId) {
        invalidateChallengeQueries.cheatStatus(variables.challengeId);
      }
      invalidateChallengeQueries.myChallenges();
      invalidateChallengeQueries.records(variables.challengeId);
    },
    onError: (error, variables) => {
      // 실패 시 캐시 무효화 (옵티미스틱 업데이트 롤백)
      if (variables.challengeId) {
        invalidateChallengeQueries.cheatStatus(variables.challengeId);
      }
    },
  });
};

// ===========================================
// 리더보드 관련 훅
// ===========================================

export const useLeaderboard = (roomId: number, options?: { limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: challengeKeys.leaderboard(roomId),
    queryFn: () => challengeApi.getLeaderboard(roomId, options),
    enabled: !!roomId,
    staleTime: 30 * 1000, // 30초간 신선 (실시간성 중요)
    refetchInterval: 15 * 1000, // 15초마다 자동 새로고침
  });
};

export const useMyRank = (roomId: number) => {
  return useQuery({
    queryKey: challengeKeys.myRank(roomId),
    queryFn: () => challengeApi.getMyRank(roomId),
    enabled: !!roomId,
    staleTime: 1 * 60 * 1000, // 1분간 신선
  });
};

// ===========================================
// 통계 및 리포트 관련 훅
// ===========================================

export const usePersonalStats = (challengeId?: number) => {
  return useQuery({
    queryKey: challengeKeys.personalStats(challengeId),
    queryFn: () => challengeApi.getPersonalStats(challengeId),
    staleTime: 5 * 60 * 1000, // 5분간 신선
  });
};

export const useChallengeCompletionReport = (challengeId?: number) => {
  return useQuery({
    queryKey: challengeKeys.completionReport(challengeId),
    queryFn: () => challengeApi.getChallengeCompletionReport(challengeId),
    enabled: !!challengeId,
    staleTime: 10 * 60 * 1000, // 10분간 신선 (리포트는 자주 변경되지 않음)
  });
};

// 챌린지 완료 액션 뮤테이션
export const useCompleteChallengeAction = () => {
  return useMutation({
    mutationFn: (action: ChallengeAction) => challengeApi.completeChallengeAction(action),
    onSuccess: () => {
      // 모든 챌린지 데이터 무효화 (큰 변경사항)
      invalidateChallengeQueries.all();
    },
  });
};

// 리포트 공유 뮤테이션
export const useShareChallengeReport = () => {
  return useMutation({
    mutationFn: ({ challengeId, platform }: { challengeId: number; platform: string }) =>
      challengeApi.shareChallengeReport(challengeId, platform),
  });
};

// ===========================================
// 실시간 데이터 관련 훅
// ===========================================

export const useRefreshChallengeData = (challengeId?: number) => {
  return useQuery({
    queryKey: challengeKeys.refreshData(challengeId),
    queryFn: () => challengeApi.refreshChallengeData(challengeId),
    enabled: false, // 수동으로만 실행
    staleTime: 0, // 항상 새로운 데이터
  });
};

// 수동 새로고침 훅
export const useManualRefresh = () => {
  const refreshAll = () => {
    invalidateChallengeQueries.all();
  };

  const refreshMyChallenges = () => {
    invalidateChallengeQueries.myChallenges();
  };

  const refreshLeaderboard = (roomId: number) => {
    invalidateChallengeQueries.leaderboard(roomId);
  };

  const refreshCheatStatus = (challengeId?: number) => {
    invalidateChallengeQueries.cheatStatus(challengeId);
  };

  return {
    refreshAll,
    refreshMyChallenges,
    refreshLeaderboard,
    refreshCheatStatus,
  };
};

// ===========================================
// 조합 훅 (여러 쿼리를 동시에 사용)
// ===========================================

export const useDashboardData = () => {
  const activeChallenge = useMyActiveChallenge();
  const leaderboard = useLeaderboard(
    activeChallenge.data?.data?.room || 0,
    { limit: 10 }
  );
  const cheatStatus = useCheatDayStatus(activeChallenge.data?.data?.id);

  return {
    activeChallenge,
    leaderboard,
    cheatStatus,
    isLoading: activeChallenge.isLoading || leaderboard.isLoading || cheatStatus.isLoading,
    error: activeChallenge.error || leaderboard.error || cheatStatus.error,
  };
};

export const useChallengeDetailData = (roomId: number) => {
  const challengeRoom = useChallengeRoom(roomId);
  const leaderboard = useLeaderboard(roomId, { limit: 20 });
  const myRank = useMyRank(roomId);

  return {
    challengeRoom,
    leaderboard,
    myRank,
    isLoading: challengeRoom.isLoading || leaderboard.isLoading || myRank.isLoading,
    error: challengeRoom.error || leaderboard.error || myRank.error,
  };
}; 