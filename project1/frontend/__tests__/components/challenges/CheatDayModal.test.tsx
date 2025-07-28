/**
 * CheatDayModal 컴포넌트 테스트
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheatDayModal from '../../../src/components/challenges/CheatDayModal';

// Mock API 함수들
jest.mock('../../../src/lib/challengeApi', () => ({
  requestCheatDay: jest.fn(),
  getCheatStatus: jest.fn(),
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

describe('CheatDayModal', () => {
  const mockCheatStatus = {
    success: true,
    data: {
      challenge_id: 1,
      room_name: '1500kcal_challenge',
      weekly_cheat_status: {
        used_count: 1,
        limit: 2,
        remaining: 1,
      },
      used_dates: ['2025-01-10'],
      week_start: '2025-01-06',
      current_date: '2025-01-15',
    },
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    challengeId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('모달이 올바르게 렌더링된다', async () => {
    const { getCheatStatus } = require('../../../src/lib/challengeApi');
    getCheatStatus.mockResolvedValue(mockCheatStatus);

    renderWithQueryClient(<CheatDayModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('치팅 데이 사용')).toBeInTheDocument();
      expect(screen.getByText(/주간 치팅 현황/)).toBeInTheDocument();
    });
  });

  test('치팅 현황이 올바르게 표시된다', async () => {
    const { getCheatStatus } = require('../../../src/lib/challengeApi');
    getCheatStatus.mockResolvedValue(mockCheatStatus);

    renderWithQueryClient(<CheatDayModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/1\/2 사용/)).toBeInTheDocument();
      expect(screen.getByText(/1회 남음/)).toBeInTheDocument();
    });
  });

  test('치팅 요청이 성공적으로 처리된다', async () => {
    const { getCheatStatus, requestCheatDay } = require('../../../src/lib/challengeApi');
    getCheatStatus.mockResolvedValue(mockCheatStatus);
    requestCheatDay.mockResolvedValue({
      success: true,
      message: '치팅이 승인되었습니다.',
      data: { remaining_cheats: 0 },
    });

    renderWithQueryClient(<CheatDayModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('오늘 치팅 사용하기')).toBeInTheDocument();
    });

    const cheatButton = screen.getByText('오늘 치팅 사용하기');
    fireEvent.click(cheatButton);

    await waitFor(() => {
      expect(requestCheatDay).toHaveBeenCalledWith({
        date: expect.any(String),
        challenge_id: 1,
      });
    });
  });

  test('치팅 한도 초과 시 버튼이 비활성화된다', async () => {
    const { getCheatStatus } = require('../../../src/lib/challengeApi');
    getCheatStatus.mockResolvedValue({
      ...mockCheatStatus,
      data: {
        ...mockCheatStatus.data,
        weekly_cheat_status: {
          used_count: 2,
          limit: 2,
          remaining: 0,
        },
      },
    });

    renderWithQueryClient(<CheatDayModal {...defaultProps} />);

    await waitFor(() => {
      const cheatButton = screen.getByText('치팅 한도 초과');
      expect(cheatButton).toBeDisabled();
    });
  });

  test('이미 치팅을 사용한 날짜에는 버튼이 비활성화된다', async () => {
    const today = new Date().toISOString().split('T')[0];
    const { getCheatStatus } = require('../../../src/lib/challengeApi');
    getCheatStatus.mockResolvedValue({
      ...mockCheatStatus,
      data: {
        ...mockCheatStatus.data,
        used_dates: [today],
      },
    });

    renderWithQueryClient(<CheatDayModal {...defaultProps} />);

    await waitFor(() => {
      const cheatButton = screen.getByText('오늘 이미 사용함');
      expect(cheatButton).toBeDisabled();
    });
  });

  test('확인 모달이 표시된다', async () => {
    const { getCheatStatus } = require('../../../src/lib/challengeApi');
    getCheatStatus.mockResolvedValue(mockCheatStatus);

    renderWithQueryClient(<CheatDayModal {...defaultProps} />);

    await waitFor(() => {
      const cheatButton = screen.getByText('오늘 치팅 사용하기');
      fireEvent.click(cheatButton);
    });

    expect(screen.getByText(/정말로 치팅을 사용하시겠습니까/)).toBeInTheDocument();
    expect(screen.getByText('확인')).toBeInTheDocument();
    expect(screen.getByText('취소')).toBeInTheDocument();
  });

  test('치팅 요청 에러가 올바르게 처리된다', async () => {
    const { getCheatStatus, requestCheatDay } = require('../../../src/lib/challengeApi');
    getCheatStatus.mockResolvedValue(mockCheatStatus);
    requestCheatDay.mockRejectedValue(new Error('치팅 한도를 초과했습니다.'));

    renderWithQueryClient(<CheatDayModal {...defaultProps} />);

    await waitFor(() => {
      const cheatButton = screen.getByText('오늘 치팅 사용하기');
      fireEvent.click(cheatButton);
    });

    const confirmButton = screen.getByText('확인');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/치팅 한도를 초과했습니다/)).toBeInTheDocument();
    });
  });

  test('모달 닫기가 작동한다', async () => {
    const { getCheatStatus } = require('../../../src/lib/challengeApi');
    getCheatStatus.mockResolvedValue(mockCheatStatus);

    const onClose = jest.fn();
    renderWithQueryClient(<CheatDayModal {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      const closeButton = screen.getByText('닫기');
      fireEvent.click(closeButton);
    });

    expect(onClose).toHaveBeenCalled();
  });

  test('사용한 치팅 날짜들이 표시된다', async () => {
    const { getCheatStatus } = require('../../../src/lib/challengeApi');
    getCheatStatus.mockResolvedValue(mockCheatStatus);

    renderWithQueryClient(<CheatDayModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/이번 주 사용한 날짜/)).toBeInTheDocument();
      expect(screen.getByText('2025-01-10')).toBeInTheDocument();
    });
  });

  test('로딩 상태가 표시된다', () => {
    const { getCheatStatus } = require('../../../src/lib/challengeApi');
    getCheatStatus.mockImplementation(() => new Promise(() => {})); // 무한 대기

    renderWithQueryClient(<CheatDayModal {...defaultProps} />);

    expect(screen.getByText(/치팅 현황을 불러오는 중.../)).toBeInTheDocument();
  });
});