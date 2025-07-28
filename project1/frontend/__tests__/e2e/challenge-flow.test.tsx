/**
 * 챌린지 시스템 E2E 테스트 시나리오
 * 
 * 이 테스트는 Playwright 또는 Cypress와 같은 E2E 테스트 도구를 사용해야 합니다.
 * 현재는 Jest와 Testing Library를 사용한 통합 테스트 형태로 작성되었습니다.
 * 
 * 실제 E2E 테스트를 위해서는:
 * npm install --save-dev @playwright/test
 * 또는
 * npm install --save-dev cypress
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock API 모듈
jest.mock('../../src/lib/challengeApi');
jest.mock('../../src/lib/api');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    pathname: '/challenges',
  }),
  usePathname: () => '/challenges',
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('챌린지 시스템 E2E 플로우', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('챌린지 참여부터 완료까지 전체 플로우', () => {
    test('1. 챌린지 방 목록 조회 → 참여 → 일일 판정 → 완료', async () => {
      const { getChallengeRooms, joinChallenge, getMyChallenge, requestCheatDay } = require('../../src/lib/challengeApi');
      
      // Mock 데이터 설정
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
      ];

      const mockJoinResponse = {
        success: true,
        data: {
          id: 1,
          room_name: '1500kcal_challenge',
          status: 'active',
          current_streak_days: 0,
          remaining_duration_days: 30,
        },
      };

      const mockMyChallengeResponse = {
        success: true,
        data: {
          active_challenges: [mockJoinResponse.data],
          has_active_challenge: true,
        },
      };

      getChallengeRooms.mockResolvedValue(mockRooms);
      joinChallenge.mockResolvedValue(mockJoinResponse);
      getMyChallenge.mockResolvedValue(mockMyChallengeResponse);

      // 1단계: 챌린지 방 목록 페이지 렌더링
      const ChallengeListPage = require('../../src/app/challenges/page').default;
      render(
        <TestWrapper>
          <ChallengeListPage />
        </TestWrapper>
      );

      // 챌린지 방이 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('1500kcal_challenge')).toBeInTheDocument();
        expect(screen.getByText('1500칼로리 챌린지')).toBeInTheDocument();
      });

      // 2단계: 챌린지 참여 버튼 클릭
      const joinButton = screen.getByText('참여하기');
      fireEvent.click(joinButton);

      // 참여 폼이 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('챌린지 참여하기')).toBeInTheDocument();
      });

      // 3단계: 참여 폼 작성 및 제출
      fireEvent.change(screen.getByLabelText(/키/), { target: { value: '170' } });
      fireEvent.change(screen.getByLabelText(/현재 몸무게/), { target: { value: '70' } });
      fireEvent.change(screen.getByLabelText(/목표 몸무게/), { target: { value: '65' } });
      fireEvent.change(screen.getByLabelText(/챌린지 기간/), { target: { value: '30' } });

      const submitButton = screen.getByText('챌린지 시작하기');
      fireEvent.click(submitButton);

      // 참여 성공 확인
      await waitFor(() => {
        expect(joinChallenge).toHaveBeenCalledWith({
          room: 1,
          user_height: 170,
          user_weight: 70,
          user_target_weight: 65,
          user_challenge_duration_days: 30,
          user_weekly_cheat_limit: 1,
        });
      });

      // 4단계: 내 챌린지 현황 페이지로 이동
      const MyChallengesPage = require('../../src/app/challenges/my/page').default;
      render(
        <TestWrapper>
          <MyChallengesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('내 챌린지 현황')).toBeInTheDocument();
        expect(screen.getByText('1500kcal_challenge')).toBeInTheDocument();
        expect(screen.getByText('0일 연속 성공')).toBeInTheDocument();
      });
    });

    test('2. 치팅 사용 플로우', async () => {
      const { getCheatStatus, requestCheatDay } = require('../../src/lib/challengeApi');
      
      const mockCheatStatus = {
        success: true,
        data: {
          weekly_cheat_status: {
            used_count: 0,
            limit: 2,
            remaining: 2,
          },
          used_dates: [],
        },
      };

      const mockCheatResponse = {
        success: true,
        message: '치팅이 승인되었습니다.',
        data: { remaining_cheats: 1 },
      };

      getCheatStatus.mockResolvedValue(mockCheatStatus);
      requestCheatDay.mockResolvedValue(mockCheatResponse);

      // 치팅 모달 컴포넌트 렌더링
      const CheatDayModal = require('../../src/components/challenges/CheatDayModal').default;
      render(
        <TestWrapper>
          <CheatDayModal isOpen={true} onClose={jest.fn()} challengeId={1} />
        </TestWrapper>
      );

      // 치팅 현황 확인
      await waitFor(() => {
        expect(screen.getByText(/0\/2 사용/)).toBeInTheDocument();
        expect(screen.getByText('오늘 치팅 사용하기')).toBeInTheDocument();
      });

      // 치팅 사용 버튼 클릭
      const cheatButton = screen.getByText('오늘 치팅 사용하기');
      fireEvent.click(cheatButton);

      // 확인 모달 표시
      await waitFor(() => {
        expect(screen.getByText(/정말로 치팅을 사용하시겠습니까/)).toBeInTheDocument();
      });

      // 확인 버튼 클릭
      const confirmButton = screen.getByText('확인');
      fireEvent.click(confirmButton);

      // 치팅 요청 API 호출 확인
      await waitFor(() => {
        expect(requestCheatDay).toHaveBeenCalledWith({
          date: expect.any(String),
          challenge_id: 1,
        });
      });

      // 성공 메시지 확인
      await waitFor(() => {
        expect(screen.getByText(/치팅이 승인되었습니다/)).toBeInTheDocument();
      });
    });

    test('3. 리더보드 조회 플로우', async () => {
      const { getLeaderboard } = require('../../src/lib/challengeApi');
      
      const mockLeaderboard = {
        success: true,
        data: {
          room_name: '1500kcal_challenge',
          leaderboard: [
            {
              rank: 1,
              username: 'user1',
              current_streak: 15,
              max_streak: 20,
              total_success_days: 25,
            },
            {
              rank: 2,
              username: 'user2',
              current_streak: 12,
              max_streak: 15,
              total_success_days: 20,
            },
          ],
          my_rank: 2,
          total_participants: 2,
        },
      };

      getLeaderboard.mockResolvedValue(mockLeaderboard);

      // 리더보드 컴포넌트 렌더링
      const Leaderboard = require('../../src/components/challenges/Leaderboard').default;
      render(
        <TestWrapper>
          <Leaderboard roomId={1} />
        </TestWrapper>
      );

      // 리더보드 데이터 확인
      await waitFor(() => {
        expect(screen.getByText('1500kcal_challenge 리더보드')).toBeInTheDocument();
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('user2')).toBeInTheDocument();
        expect(screen.getByText('15일 연속')).toBeInTheDocument();
        expect(screen.getByText('12일 연속')).toBeInTheDocument();
      });

      // 내 순위 하이라이트 확인
      const myRankRow = screen.getByText('user2').closest('tr');
      expect(myRankRow).toHaveClass('bg-blue-50');
    });

    test('4. 챌린지 완료 및 리포트 플로우', async () => {
      const { getChallengeReport } = require('../../src/lib/challengeApi');
      
      const mockReport = {
        success: true,
        data: {
          challenge_info: {
            id: 1,
            room_name: '1500kcal_challenge',
            target_calorie: 1500,
            start_date: '2025-01-01',
            duration_days: 30,
            status: 'completed',
            is_completed: true,
          },
          statistics: {
            current_streak: 25,
            max_streak: 25,
            total_success_days: 28,
            total_failure_days: 2,
            success_rate: 93.3,
            cheat_days_used: 2,
          },
          badges: [
            {
              id: 1,
              name: '완주자',
              description: '30일 챌린지 완료',
              icon: '🏆',
            },
          ],
          result_message: '🎉 훌륭합니다! 93.3%의 높은 성공률로 챌린지를 완료했습니다!',
        },
      };

      getChallengeReport.mockResolvedValue(mockReport);

      // 챌린지 리포트 컴포넌트 렌더링
      const ChallengeReport = require('../../src/components/challenges/ChallengeCompletionReport').default;
      render(
        <TestWrapper>
          <ChallengeReport challengeId={1} />
        </TestWrapper>
      );

      // 리포트 데이터 확인
      await waitFor(() => {
        expect(screen.getByText('챌린지 완료 리포트')).toBeInTheDocument();
        expect(screen.getByText('1500kcal_challenge')).toBeInTheDocument();
        expect(screen.getByText('93.3%')).toBeInTheDocument();
        expect(screen.getByText('25일 연속')).toBeInTheDocument();
        expect(screen.getByText('완주자')).toBeInTheDocument();
        expect(screen.getByText(/훌륭합니다! 93.3%의 높은 성공률/)).toBeInTheDocument();
      });

      // 재도전 버튼 확인
      expect(screen.getByText('새 챌린지 시작')).toBeInTheDocument();
      expect(screen.getByText('같은 챌린지 연장')).toBeInTheDocument();
    });

    test('5. 에러 처리 플로우', async () => {
      const { getChallengeRooms, joinChallenge } = require('../../src/lib/challengeApi');
      
      // 네트워크 에러 시뮬레이션
      getChallengeRooms.mockRejectedValue(new Error('네트워크 오류'));

      const ChallengeListPage = require('../../src/app/challenges/page').default;
      render(
        <TestWrapper>
          <ChallengeListPage />
        </TestWrapper>
      );

      // 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByText(/챌린지 방을 불러오는데 실패했습니다/)).toBeInTheDocument();
      });

      // 재시도 버튼 확인
      expect(screen.getByText('다시 시도')).toBeInTheDocument();

      // 중복 참여 에러 시뮬레이션
      getChallengeRooms.mockResolvedValue([
        {
          id: 1,
          name: '1500kcal_challenge',
          target_calorie: 1500,
          tolerance: 50,
          description: '1500칼로리 챌린지',
          is_active: true,
        },
      ]);

      joinChallenge.mockRejectedValue(new Error('이미 참여 중인 챌린지가 있습니다.'));

      // 재시도 버튼 클릭
      const retryButton = screen.getByText('다시 시도');
      fireEvent.click(retryButton);

      // 챌린지 방 목록 다시 로드 확인
      await waitFor(() => {
        expect(screen.getByText('1500kcal_challenge')).toBeInTheDocument();
      });
    });
  });

  describe('반응형 디자인 테스트', () => {
    test('모바일 화면에서 챌린지 카드가 올바르게 표시된다', async () => {
      // 모바일 뷰포트 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { getChallengeRooms } = require('../../src/lib/challengeApi');
      getChallengeRooms.mockResolvedValue([
        {
          id: 1,
          name: '1500kcal_challenge',
          target_calorie: 1500,
          tolerance: 50,
          description: '1500칼로리 챌린지',
          is_active: true,
        },
      ]);

      const ChallengeRoomList = require('../../src/components/challenges/ChallengeRoomList').default;
      render(
        <TestWrapper>
          <ChallengeRoomList />
        </TestWrapper>
      );

      await waitFor(() => {
        const challengeCard = screen.getByText('1500kcal_challenge').closest('div');
        expect(challengeCard).toHaveClass('w-full'); // 모바일에서 전체 너비
      });
    });
  });

  describe('접근성 테스트', () => {
    test('키보드 네비게이션이 작동한다', async () => {
      const { getChallengeRooms } = require('../../src/lib/challengeApi');
      getChallengeRooms.mockResolvedValue([
        {
          id: 1,
          name: '1500kcal_challenge',
          target_calorie: 1500,
          tolerance: 50,
          description: '1500칼로리 챌린지',
          is_active: true,
        },
      ]);

      const ChallengeRoomList = require('../../src/components/challenges/ChallengeRoomList').default;
      render(
        <TestWrapper>
          <ChallengeRoomList />
        </TestWrapper>
      );

      await waitFor(() => {
        const joinButton = screen.getByText('참여하기');
        
        // Tab 키로 포커스 이동
        joinButton.focus();
        expect(joinButton).toHaveFocus();
        
        // Enter 키로 버튼 클릭
        fireEvent.keyDown(joinButton, { key: 'Enter', code: 'Enter' });
        // 참여 폼이 열리는지 확인하는 로직 추가 가능
      });
    });

    test('스크린 리더를 위한 ARIA 레이블이 있다', async () => {
      const { getChallengeRooms } = require('../../src/lib/challengeApi');
      getChallengeRooms.mockResolvedValue([
        {
          id: 1,
          name: '1500kcal_challenge',
          target_calorie: 1500,
          tolerance: 50,
          description: '1500칼로리 챌린지',
          is_active: true,
        },
      ]);

      const ChallengeRoomList = require('../../src/components/challenges/ChallengeRoomList').default;
      render(
        <TestWrapper>
          <ChallengeRoomList />
        </TestWrapper>
      );

      await waitFor(() => {
        const challengeCard = screen.getByRole('article');
        expect(challengeCard).toHaveAttribute('aria-label');
        
        const joinButton = screen.getByRole('button', { name: /참여하기/ });
        expect(joinButton).toBeInTheDocument();
      });
    });
  });
});