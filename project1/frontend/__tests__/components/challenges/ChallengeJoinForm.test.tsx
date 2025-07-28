/**
 * ChallengeJoinForm 컴포넌트 테스트
 * 
 * 테스트 실행을 위해서는 다음 패키지들이 필요합니다:
 * npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
 * 
 * jest.config.js 파일도 프로젝트 루트에 생성해야 합니다.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChallengeJoinForm from '../../../src/components/challenges/ChallengeJoinForm';

// Mock API 함수들
jest.mock('../../../src/lib/challengeApi', () => ({
  joinChallenge: jest.fn(),
  getChallengeRooms: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
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

describe('ChallengeJoinForm', () => {
  const mockRoom = {
    id: 1,
    name: '1500kcal_challenge',
    target_calorie: 1500,
    tolerance: 50,
    description: '1500칼로리 챌린지',
    is_active: true,
    dummy_users_count: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('폼이 올바르게 렌더링된다', () => {
    renderWithQueryClient(<ChallengeJoinForm room={mockRoom} />);
    
    expect(screen.getByText('챌린지 참여하기')).toBeInTheDocument();
    expect(screen.getByLabelText(/키/)).toBeInTheDocument();
    expect(screen.getByLabelText(/현재 몸무게/)).toBeInTheDocument();
    expect(screen.getByLabelText(/목표 몸무게/)).toBeInTheDocument();
    expect(screen.getByLabelText(/챌린지 기간/)).toBeInTheDocument();
    expect(screen.getByLabelText(/주간 치팅 횟수/)).toBeInTheDocument();
  });

  test('필수 필드 검증이 작동한다', async () => {
    renderWithQueryClient(<ChallengeJoinForm room={mockRoom} />);
    
    const submitButton = screen.getByText('챌린지 시작하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/키를 입력해주세요/)).toBeInTheDocument();
      expect(screen.getByText(/현재 몸무게를 입력해주세요/)).toBeInTheDocument();
      expect(screen.getByText(/목표 몸무게를 입력해주세요/)).toBeInTheDocument();
    });
  });

  test('유효한 데이터로 폼 제출이 가능하다', async () => {
    const { joinChallenge } = require('../../../src/lib/challengeApi');
    joinChallenge.mockResolvedValue({
      success: true,
      data: { id: 1, status: 'active' }
    });

    renderWithQueryClient(<ChallengeJoinForm room={mockRoom} />);
    
    // 폼 필드 채우기
    fireEvent.change(screen.getByLabelText(/키/), { target: { value: '170' } });
    fireEvent.change(screen.getByLabelText(/현재 몸무게/), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/목표 몸무게/), { target: { value: '65' } });
    fireEvent.change(screen.getByLabelText(/챌린지 기간/), { target: { value: '30' } });
    
    const submitButton = screen.getByText('챌린지 시작하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(joinChallenge).toHaveBeenCalledWith({
        room: mockRoom.id,
        user_height: 170,
        user_weight: 70,
        user_target_weight: 65,
        user_challenge_duration_days: 30,
        user_weekly_cheat_limit: 1, // 기본값
      });
    });
  });

  test('추천 칼로리가 올바르게 계산된다', () => {
    renderWithQueryClient(<ChallengeJoinForm room={mockRoom} />);
    
    // 키와 몸무게 입력
    fireEvent.change(screen.getByLabelText(/키/), { target: { value: '170' } });
    fireEvent.change(screen.getByLabelText(/현재 몸무게/), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/목표 몸무게/), { target: { value: '65' } });
    
    // 추천 칼로리가 표시되는지 확인
    expect(screen.getByText(/추천 일일 목표 칼로리/)).toBeInTheDocument();
  });

  test('치팅 횟수 선택이 작동한다', () => {
    renderWithQueryClient(<ChallengeJoinForm room={mockRoom} />);
    
    const cheatSelect = screen.getByLabelText(/주간 치팅 횟수/);
    fireEvent.change(cheatSelect, { target: { value: '2' } });
    
    expect(cheatSelect).toHaveValue('2');
  });

  test('폼 제출 중 로딩 상태가 표시된다', async () => {
    const { joinChallenge } = require('../../../src/lib/challengeApi');
    joinChallenge.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderWithQueryClient(<ChallengeJoinForm room={mockRoom} />);
    
    // 폼 필드 채우기
    fireEvent.change(screen.getByLabelText(/키/), { target: { value: '170' } });
    fireEvent.change(screen.getByLabelText(/현재 몸무게/), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/목표 몸무게/), { target: { value: '65' } });
    
    const submitButton = screen.getByText('챌린지 시작하기');
    fireEvent.click(submitButton);

    expect(screen.getByText(/처리 중.../)).toBeInTheDocument();
  });

  test('에러 상태가 올바르게 처리된다', async () => {
    const { joinChallenge } = require('../../../src/lib/challengeApi');
    joinChallenge.mockRejectedValue(new Error('이미 참여 중인 챌린지가 있습니다.'));

    renderWithQueryClient(<ChallengeJoinForm room={mockRoom} />);
    
    // 폼 필드 채우기
    fireEvent.change(screen.getByLabelText(/키/), { target: { value: '170' } });
    fireEvent.change(screen.getByLabelText(/현재 몸무게/), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/목표 몸무게/), { target: { value: '65' } });
    
    const submitButton = screen.getByText('챌린지 시작하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/이미 참여 중인 챌린지가 있습니다/)).toBeInTheDocument();
    });
  });
});