'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { UserChallenge, ChallengeRoom } from '@/types';
import { challengeApi } from '@/lib/challengeApi';

// 상태 타입 정의
interface ChallengeState {

  // 챌린지 관련
  activeChallenge: UserChallenge | null;
  activeChallengeRoom: ChallengeRoom | null;
  
  // UI 상태
  isLoading: boolean;
  error: string | null;
  
  // 설정
  settings: {
    autoRefresh: boolean;
    refreshInterval: number;
    notifications: boolean;
    soundEnabled: boolean;
    theme: 'dark' | 'light';
  };

  // 캐시된 데이터
  cache: {
    lastRefreshTime: number;
    myRank: number | null;
    todayRecord: any | null;
  };
}

// 액션 타입 정의
type ChallengeAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACTIVE_CHALLENGE'; payload: { challenge: UserChallenge; room: ChallengeRoom } }
  | { type: 'CLEAR_ACTIVE_CHALLENGE' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ChallengeState['settings']> }
  | { type: 'UPDATE_CACHE'; payload: Partial<ChallengeState['cache']> }
  | { type: 'REFRESH_DATA' };

// 초기 상태
const initialState: ChallengeState = {
  activeChallenge: null,
  activeChallengeRoom: null,
  isLoading: false,
  error: null,
  settings: {
    autoRefresh: true,
    refreshInterval: 30000, // 30초
    notifications: true,
    soundEnabled: true,
    theme: 'dark',
  },
  cache: {
    lastRefreshTime: 0,
    myRank: null,
    todayRecord: null,
  },
};

// 리듀서 함수
const challengeReducer = (state: ChallengeState, action: ChallengeAction): ChallengeState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_ACTIVE_CHALLENGE':
      return {
        ...state,
        activeChallenge: action.payload.challenge,
        activeChallengeRoom: action.payload.room,
        error: null,
      };
    
    case 'CLEAR_ACTIVE_CHALLENGE':
      return {
        ...state,
        activeChallenge: null,
        activeChallengeRoom: null,
      };
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    
    case 'UPDATE_CACHE':
      return {
        ...state,
        cache: { ...state.cache, ...action.payload },
      };
    
    case 'REFRESH_DATA':
      return {
        ...state,
        cache: { ...state.cache, lastRefreshTime: Date.now() },
      };
    
    default:
      return state;
  }
};

// Context 타입 정의
interface ChallengeContextType {
  state: ChallengeState;
  
  // 챌린지 액션
  setActiveChallenge: (challenge: UserChallenge, room: ChallengeRoom) => void;
  clearActiveChallenge: () => void;
  refreshChallengeData: () => Promise<void>;
  
  // 설정 액션
  updateSettings: (settings: Partial<ChallengeState['settings']>) => void;
  
  // UI 액션
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 캐시 액션
  updateCache: (cache: Partial<ChallengeState['cache']>) => void;
}

// Context 생성
const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

// Provider 컴포넌트
interface ChallengeProviderProps {
  children: ReactNode;
}

export const ChallengeProvider: React.FC<ChallengeProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(challengeReducer, initialState);

  // 설정 복원
  useEffect(() => {
    const savedSettings = localStorage.getItem('challengeSettings');

    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      } catch (error) {
        console.error('Failed to restore settings:', error);
        localStorage.removeItem('challengeSettings');
      }
    }
  }, []);

  // 설정 변경 시 로컬 스토리지 업데이트
  useEffect(() => {
    localStorage.setItem('challengeSettings', JSON.stringify(state.settings));
  }, [state.settings]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (!state.settings.autoRefresh || !state.activeChallenge) {
      return;
    }

    const interval = setInterval(() => {
      refreshChallengeData();
    }, state.settings.refreshInterval);

    return () => clearInterval(interval);
  }, [state.settings.autoRefresh, state.settings.refreshInterval, state.activeChallenge]);

  // 액션 함수들

  const setActiveChallenge = (challenge: UserChallenge, room: ChallengeRoom) => {
    dispatch({ type: 'SET_ACTIVE_CHALLENGE', payload: { challenge, room } });
  };

  const clearActiveChallenge = () => {
    dispatch({ type: 'CLEAR_ACTIVE_CHALLENGE' });
  };

  const refreshChallengeData = async () => {
    if (!state.activeChallenge) {
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // 활성 챌린지 데이터 새로고침
      const challengeResponse = await challengeApi.getMyActiveChallenge();
      if (challengeResponse.success && challengeResponse.data) {
        const roomResponse = await challengeApi.getChallengeRoom(challengeResponse.data.room);
        if (roomResponse.success && roomResponse.data) {
          setActiveChallenge(challengeResponse.data, roomResponse.data);
        }
      }

      // 순위 정보 새로고침
      if (state.activeChallengeRoom) {
        const rankResponse = await challengeApi.getMyRank(state.activeChallengeRoom.id);
        if (rankResponse.success && rankResponse.data) {
          updateCache({ myRank: rankResponse.data.rank });
        }
      }

      // 오늘 기록 새로고침
      const today = new Date().toISOString().split('T')[0];
      const recordResponse = await challengeApi.getDailyChallengeRecord(today, state.activeChallenge.id);
      if (recordResponse.success) {
        updateCache({ todayRecord: recordResponse.data });
      }

      dispatch({ type: 'REFRESH_DATA' });
    } catch (error) {
      console.error('Failed to refresh challenge data:', error);
      dispatch({ type: 'SET_ERROR', payload: '데이터를 새로고침하는 중 오류가 발생했습니다.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateSettings = (newSettings: Partial<ChallengeState['settings']>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const updateCache = (cache: Partial<ChallengeState['cache']>) => {
    dispatch({ type: 'UPDATE_CACHE', payload: cache });
  };

  const contextValue: ChallengeContextType = {
    state,
    setActiveChallenge,
    clearActiveChallenge,
    refreshChallengeData,
    updateSettings,
    setLoading,
    setError,
    updateCache,
  };

  return (
    <ChallengeContext.Provider value={contextValue}>
      {children}
    </ChallengeContext.Provider>
  );
};

// 커스텀 훅
export const useChallenge = () => {
  const context = useContext(ChallengeContext);
  if (context === undefined) {
    throw new Error('useChallenge must be used within a ChallengeProvider');
  }
  return context;
};

// 편의 훅들

export const useChallengeSettings = () => {
  const { state, updateSettings } = useChallenge();
  return {
    settings: state.settings,
    updateSettings,
  };
};

export const useChallengeCache = () => {
  const { state, updateCache } = useChallenge();
  return {
    cache: state.cache,
    updateCache,
  };
};

export const useActiveChallengeData = () => {
  const { state, setActiveChallenge, clearActiveChallenge, refreshChallengeData } = useChallenge();
  return {
    activeChallenge: state.activeChallenge,
    activeChallengeRoom: state.activeChallengeRoom,
    setActiveChallenge,
    clearActiveChallenge,
    refreshChallengeData,
  };
};

export default ChallengeContext; 