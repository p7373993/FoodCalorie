/**
 * ChallengeRoomList 컴포넌트 테스트
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChallengeRoomList from '../../../src/components/challenges/ChallengeRoomList';

// Mock API 함수들
jest.mock('../../../src/lib/challengeApi', () => ({
  getChallengeRooms: jest.fn(),
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

describe('ChallengeRoomList', () => {
  const mockRooms = [
    {
      id: 1,
      name: '1500kcal_challenge',
      target_calorie: 1500,
      tolerance: 50,
      description: '1500칼로리 챌린지',
      is_active: true,
      dummy_users_count: 10,
    },
    {
      id: 2,
      name: '1800kcal_challenge',
      target_calorie: 1800,
      tolerance: 50,
      description: '1800칼로리 챌린지',
      is_active: true,
      dummy_users_count: 15,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('챌린지 방 목록이 올바르게 렌더링된다', async () => {
    const { getChallengeRooms } = require('../../../src/lib/challengeApi');
    getChallengeRooms.mockResolvedValue(mockRooms);

    renderWithQueryClient(<ChallengeRoomList />);

    await waitFor(() => {
      expect(screen.getByText('1500kcal_challenge')).toBeInTheDocument();
      expect(screen.getByText('1800kcal_challenge')).toBeInTheDocument();
    });

    expect(screen.getByText('1500칼로리 챌린지')).toBeInTheDocument();
    expect(screen.getByText('1800칼로리 챌린지')).toBeInTheDocument();
  });

  test('로딩 상태가 표시된다', () => {
    const { getChallengeRooms } = require('../../../src/lib/challengeApi');
    getChallengeRooms.mockImplementation(() => new Promise(() => {})); // 무한 대기

    renderWithQueryClient(<ChallengeRoomList />);

    expect(screen.getByText(/로딩 중.../)).toBeInTheDocument();
  });

  test('에러 상태가 올바르게 처리된다', async () => {
    const { getChallengeRooms } = require('../../../src/lib/challengeApi');
    getChallengeRooms.mockRejectedValue(new Error('네트워크 오류'));

    renderWithQueryClient(<ChallengeRoomList />);

    await waitFor(() => {
      expect(screen.getByText(/챌린지 방을 불러오는데 실패했습니다/)).toBeInTheDocument();
    });
  });

  test('빈 목록 상태가 표시된다', async () => {
    const { getChallengeRooms } = require('../../../src/lib/challengeApi');
    getChallengeRooms.mockResolvedValue([]);

    renderWithQueryClient(<ChallengeRoomList />);

    await waitFor(() => {
      expect(screen.getByText(/사용 가능한 챌린지가 없습니다/)).toBeInTheDocument();
    });
  });

  test('참여자 수가 올바르게 표시된다', async () => {
    const { getChallengeRooms } = require('../../../src/lib/challengeApi');
    getChallengeRooms.mockResolvedValue(mockRooms);

    renderWithQueryClient(<ChallengeRoomList />);

    await waitFor(() => {
      expect(screen.getByText(/10명 참여 중/)).toBeInTheDocument();
      expect(screen.getByText(/15명 참여 중/)).toBeInTheDocument();
    });
  });

  test('목표 칼로리가 올바르게 표시된다', async () => {
    const { getChallengeRooms } = require('../../../src/lib/challengeApi');
    getChallengeRooms.mockResolvedValue(mockRooms);

    renderWithQueryClient(<ChallengeRoomList />);

    await waitFor(() => {
      expect(screen.getByText(/1500kcal/)).toBeInTheDocument();
      expect(screen.getByText(/1800kcal/)).toBeInTheDocument();
    });
  });
});