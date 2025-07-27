/**
 * Leaderboard 컴포넌트 테스트
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Leaderboard from '../../../src/components/challenges/Leaderboard';

// Mock API 함수들
jest.mock('../../../src/lib/challengeApi', () => ({
  getLeaderboard: jest.fn(),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Leaderboard', () => {
  const mockLeaderboardData = {
    success: true,
    data: {
      room_id: 1,
      room_name: '1500kcal_challenge',
      leaderboard: [
        {
          rank: 1,
          username: 'user1',
          user_id: 1,
          current_streak: 15,
          max_streak: 20,
          total_success_days: 25,
          challenge_start_date: '2025-01-01',
          last_activity: '2025-01-15',
        },
        {
          rank: 2,
          username: 'user2',
          user_id: 2,
          current_streak: 12,
          max_streak: 15,
          total_success_days: 20,
          challenge_start_date: '2025-01-02',
          last_activity: '2025-01-15',
        },
        {
          rank: 3,
          username: 'user3',
          user_id: 3,
          current_streak: 8,
          max_streak: 10,
          total_success_days: 15,
          challenge_start_date: '2025-01-03',
          last_activity: '2025-01-15',
        },
      ],
      my_rank: 2,
      total_participants: 3,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('리더보드가 올바르게 렌더링된다', async () => {
    const { getLeaderboard } = require('../../../src/lib/challengeApi');
    getLeaderboard.mockResolvedValue(mockLeaderboardData);

    renderWithQueryClient(<Leaderboard roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText('1500kcal_challenge 리더보드')).toBeInTheDocument();
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
      expect(screen.getByText('user3')).toBeInTheDocument();
    });
  });

  test('순위가 올바르게 표시된다', async () => {
    const { getLeaderboard } = require('../../../src/lib/challengeApi');
    getLeaderboard.mockResolvedValue(mockLeaderboardData);

    renderWithQueryClient(<Leaderboard roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText('1위')).toBeInTheDocument();
      expect(screen.getByText('2위')).toBeInTheDocument();
      expect(screen.getByText('3위')).toBeInTheDocument();
    });
  });

  test('연속 성공 일수가 표시된다', async () => {
    const { getLeaderboard } = require('../../../src/lib/challengeApi');
    getLeaderboard.mockResolvedValue(mockLeaderboardData);

    renderWithQueryClient(<Leaderboard roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText('15일 연속')).toBeInTheDocument();
      expect(screen.getByText('12일 연속')).toBeInTheDocument();
      expect(screen.getByText('8일 연속')).toBeInTheDocument();
    });
  });

  test('내 순위가 하이라이트된다', async () => {
    const { getLeaderboard } = require('../../../src/lib/challengeApi');
    getLeaderboard.mockResolvedValue(mockLeaderboardData);

    renderWithQueryClient(<Leaderboard roomId={1} />);

    await waitFor(() => {
      const myRankRow = screen.getByText('user2').closest('tr');
      expect(myRankRow).toHaveClass('bg-blue-50'); // 또는 하이라이트 클래스
    });
  });

  test('로딩 상태가 표시된다', () => {
    const { getLeaderboard } = require('../../../src/lib/challengeApi');
    getLeaderboard.mockImplementation(() => new Promise(() => {})); // 무한 대기

    renderWithQueryClient(<Leaderboard roomId={1} />);

    expect(screen.getByText(/리더보드를 불러오는 중.../)).toBeInTheDocument();
  });

  test('에러 상태가 올바르게 처리된다', async () => {
    const { getLeaderboard } = require('../../../src/lib/challengeApi');
    getLeaderboard.mockRejectedValue(new Error('리더보드 조회 실패'));

    renderWithQueryClient(<Leaderboard roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/리더보드를 불러오는데 실패했습니다/)).toBeInTheDocument();
    });
  });

  test('빈 리더보드 상태가 표시된다', async () => {
    const { getLeaderboard } = require('../../../src/lib/challengeApi');
    getLeaderboard.mockResolvedValue({
      ...mockLeaderboardData,
      data: {
        ...mockLeaderboardData.data,
        leaderboard: [],
        total_participants: 0,
      },
    });

    renderWithQueryClient(<Leaderboard roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/참여자가 없습니다/)).toBeInTheDocument();
    });
  });

  test('총 참여자 수가 표시된다', async () => {
    const { getLeaderboard } = require('../../../src/lib/challengeApi');
    getLeaderboard.mockResolvedValue(mockLeaderboardData);

    renderWithQueryClient(<Leaderboard roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/총 3명 참여/)).toBeInTheDocument();
    });
  });

  test('최대 연속 성공 일수가 표시된다', async () => {
    const { getLeaderboard } = require('../../../src/lib/challengeApi');
    getLeaderboard.mockResolvedValue(mockLeaderboardData);

    renderWithQueryClient(<Leaderboard roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/최고 20일/)).toBeInTheDocument();
      expect(screen.getByText(/최고 15일/)).toBeInTheDocument();
      expect(screen.getByText(/최고 10일/)).toBeInTheDocument();
    });
  });
});