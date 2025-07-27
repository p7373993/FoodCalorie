'use client';

import React, { useState, useEffect } from 'react';
import { ChallengeRoom, ChallengeJoinRequest } from '@/types';
import { apiClient } from '@/lib/api';
import { useJoinChallenge } from '@/hooks/useChallengeQueries';

interface ChallengeJoinFormProps {
  room: ChallengeRoom;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface UserInfo {
  height: number;
  weight: number;
  targetWeight: number;
  duration: number;
  cheatLimit: number;
  minMeals: number;
  cutoffTime: string;
}

type FormStep = 'info' | 'settings' | 'confirmation';

const ChallengeJoinForm: React.FC<ChallengeJoinFormProps> = ({
  room,
  onSuccess,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('info');
  const [userInfo, setUserInfo] = useState<UserInfo>({
    height: 0,
    weight: 0,
    targetWeight: 0,
    duration: 30,
    cheatLimit: 1,
    minMeals: 2,
    cutoffTime: '23:00',
  });
  const [error, setError] = useState<string | null>(null);
  const [recommendedCalorie, setRecommendedCalorie] = useState<number>(0);
  
  // React Query 뮤테이션 사용
  const joinChallengeMutation = useJoinChallenge();

  // 추천 칼로리 계산
  const calculateRecommendedCalorie = (height: number, weight: number, targetWeight: number) => {
    if (!height || !weight || !targetWeight) return 0;
    
    // Harris-Benedict 공식을 사용한 기초대사율 계산 (여성 기준)
    // 실제로는 성별을 입력받아야 하지만, 여기서는 평균값 사용
    const bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * 25); // 25세 가정
    
    // 활동량을 고려한 총 소모 칼로리 (보통 활동량 1.375 적용)
    const tdee = bmr * 1.375;
    
    // 목표에 따른 칼로리 조정
    const weightDiff = weight - targetWeight;
    if (weightDiff > 5) {
      // 체중 감량이 필요한 경우 (1주일에 0.5kg 감량 기준)
      return Math.round(tdee - 500);
    } else if (weightDiff < -2) {
      // 체중 증량이 필요한 경우
      return Math.round(tdee + 300);
    } else {
      // 체중 유지
      return Math.round(tdee);
    }
  };

  useEffect(() => {
    if (userInfo.height && userInfo.weight && userInfo.targetWeight) {
      const recommended = calculateRecommendedCalorie(
        userInfo.height,
        userInfo.weight,
        userInfo.targetWeight
      );
      setRecommendedCalorie(recommended);
    }
  }, [userInfo.height, userInfo.weight, userInfo.targetWeight]);

  const handleInputChange = (field: keyof UserInfo, value: number | string) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateUserInfo = () => {
    const { height, weight, targetWeight, duration } = userInfo;
    
    if (!height || height < 100 || height > 250) {
      setError('키는 100cm ~ 250cm 사이로 입력해주세요.');
      return false;
    }
    if (!weight || weight < 30 || weight > 300) {
      setError('몸무게는 30kg ~ 300kg 사이로 입력해주세요.');
      return false;
    }
    if (!targetWeight || targetWeight < 30 || targetWeight > 300) {
      setError('목표 체중은 30kg ~ 300kg 사이로 입력해주세요.');
      return false;
    }
    if (!duration || duration < 7 || duration > 365) {
      setError('챌린지 기간은 7일 ~ 365일 사이로 설정해주세요.');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'info') {
      if (validateUserInfo()) {
        setCurrentStep('settings');
      }
    } else if (currentStep === 'settings') {
      setCurrentStep('confirmation');
    }
  };

  const handleBack = () => {
    if (currentStep === 'settings') {
      setCurrentStep('info');
    } else if (currentStep === 'confirmation') {
      setCurrentStep('settings');
    }
  };

  const handleSubmit = async () => {
    setError(null);

    const joinRequest: ChallengeJoinRequest = {
      room_id: room.id,
      user_height: userInfo.height,
      user_weight: userInfo.weight,
      user_target_weight: userInfo.targetWeight,
      user_challenge_duration_days: userInfo.duration,
      user_weekly_cheat_limit: userInfo.cheatLimit,
      min_daily_meals: userInfo.minMeals,
      challenge_cutoff_time: userInfo.cutoffTime,
    };

    joinChallengeMutation.mutate(joinRequest, {
      onSuccess: (response) => {
        if (response.success) {
          onSuccess?.();
        } else {
          setError(response.message || '챌린지 참여 중 오류가 발생했습니다.');
        }
      },
      onError: (err: any) => {
        console.error('Error joining challenge:', err);
        if (err?.message?.includes('이미') && err?.message?.includes('참여')) {
          setError('이미 다른 챌린지에 참여 중입니다. 하나의 챌린지만 참여할 수 있습니다.');
        } else {
          setError(err?.message || '챌린지 참여 중 오류가 발생했습니다.');
        }
      }
    });
  };

  const renderUserInfoStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'NanumGothic' }}>
          사용자 정보 입력
        </h2>
        <p className="text-gray-400">
          정확한 칼로리 추천을 위해 신체 정보를 입력해주세요
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 키 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            키 (cm) *
          </label>
          <input
            type="number"
            min="100"
            max="250"
            value={userInfo.height || ''}
            onChange={(e) => handleInputChange('height', Number(e.target.value))}
            className="w-full bg-[var(--card-bg)] text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none transition-colors"
            placeholder="예: 170"
          />
        </div>

        {/* 현재 몸무게 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            현재 몸무게 (kg) *
          </label>
          <input
            type="number"
            min="30"
            max="300"
            step="0.1"
            value={userInfo.weight || ''}
            onChange={(e) => handleInputChange('weight', Number(e.target.value))}
            className="w-full bg-[var(--card-bg)] text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none transition-colors"
            placeholder="예: 65.5"
          />
        </div>

        {/* 목표 체중 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            목표 체중 (kg) *
          </label>
          <input
            type="number"
            min="30"
            max="300"
            step="0.1"
            value={userInfo.targetWeight || ''}
            onChange={(e) => handleInputChange('targetWeight', Number(e.target.value))}
            className="w-full bg-[var(--card-bg)] text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none transition-colors"
            placeholder="예: 60.0"
          />
        </div>

        {/* 챌린지 기간 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            챌린지 기간 (일) *
          </label>
          <select
            value={userInfo.duration}
            onChange={(e) => handleInputChange('duration', Number(e.target.value))}
            className="w-full bg-[var(--card-bg)] text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none transition-colors"
          >
            <option value={7}>1주 (7일)</option>
            <option value={14}>2주 (14일)</option>
            <option value={21}>3주 (21일)</option>
            <option value={30}>1달 (30일)</option>
            <option value={60}>2달 (60일)</option>
            <option value={90}>3달 (90일)</option>
          </select>
        </div>
      </div>

      {/* 추천 칼로리 표시 */}
      {recommendedCalorie > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">💡 추천 일일 목표 칼로리</h3>
          <p className="text-2xl font-bold text-white">
            {recommendedCalorie.toLocaleString()} kcal
          </p>
          <p className="text-sm text-gray-400 mt-2">
            선택한 방의 목표: {room.target_calorie.toLocaleString()} kcal (±{room.tolerance}kcal)
          </p>
          {Math.abs(recommendedCalorie - room.target_calorie) > 200 && (
            <p className="text-yellow-400 text-sm mt-2">
              ⚠️ 추천 칼로리와 선택한 방의 목표가 많이 다릅니다. 다른 방을 고려해보세요.
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'NanumGothic' }}>
          챌린지 설정
        </h2>
        <p className="text-gray-400">
          개인에게 맞는 챌린지 규칙을 설정해주세요
        </p>
      </div>

      <div className="space-y-6">
        {/* 주간 치팅 횟수 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            주간 치팅 허용 횟수
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((count) => (
              <button
                key={count}
                onClick={() => handleInputChange('cheatLimit', count)}
                className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                  userInfo.cheatLimit === count
                    ? 'bg-[var(--point-green)] text-black'
                    : 'bg-[var(--card-bg)] text-gray-300 border border-gray-600 hover:border-gray-500'
                }`}
              >
                {count}회
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            치팅일에는 칼로리 제한 없이 드실 수 있으며, 연속 기록이 끊어지지 않습니다.
          </p>
        </div>

        {/* 최소 식사 횟수 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            하루 최소 식사 횟수
          </label>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((count) => (
              <button
                key={count}
                onClick={() => handleInputChange('minMeals', count)}
                className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                  userInfo.minMeals === count
                    ? 'bg-[var(--point-green)] text-black'
                    : 'bg-[var(--card-bg)] text-gray-300 border border-gray-600 hover:border-gray-500'
                }`}
              >
                {count}회
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            하루에 최소한 기록해야 하는 식사 횟수입니다.
          </p>
        </div>

        {/* 마감 시간 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            챌린지 판정 마감 시간
          </label>
          <select
            value={userInfo.cutoffTime}
            onChange={(e) => handleInputChange('cutoffTime', e.target.value)}
            className="w-full bg-[var(--card-bg)] text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none transition-colors"
          >
            <option value="22:00">오후 10시</option>
            <option value="23:00">오후 11시</option>
            <option value="23:59">오후 11시 59분</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            이 시간 이후의 식사는 다음 날로 계산됩니다.
          </p>
        </div>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'NanumGothic' }}>
          최종 확인
        </h2>
        <p className="text-gray-400">
          입력하신 정보를 확인하고 챌린지를 시작하세요
        </p>
      </div>

      {/* 챌린지 방 정보 */}
      <div className="bg-[var(--card-bg)] rounded-lg p-6 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">📋 챌린지 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">챌린지 방:</span>
            <span className="text-white ml-2 font-medium">{room.name}</span>
          </div>
          <div>
            <span className="text-gray-400">목표 칼로리:</span>
            <span className="text-white ml-2 font-medium">
              {room.target_calorie.toLocaleString()} kcal (±{room.tolerance}kcal)
            </span>
          </div>
          <div>
            <span className="text-gray-400">챌린지 기간:</span>
            <span className="text-white ml-2 font-medium">{userInfo.duration}일</span>
          </div>
          <div>
            <span className="text-gray-400">주간 치팅 횟수:</span>
            <span className="text-white ml-2 font-medium">{userInfo.cheatLimit}회</span>
          </div>
        </div>
      </div>

      {/* 사용자 정보 */}
      <div className="bg-[var(--card-bg)] rounded-lg p-6 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">👤 개인 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">키:</span>
            <span className="text-white ml-2 font-medium">{userInfo.height} cm</span>
          </div>
          <div>
            <span className="text-gray-400">현재 체중:</span>
            <span className="text-white ml-2 font-medium">{userInfo.weight} kg</span>
          </div>
          <div>
            <span className="text-gray-400">목표 체중:</span>
            <span className="text-white ml-2 font-medium">{userInfo.targetWeight} kg</span>
          </div>
          <div>
            <span className="text-gray-400">체중 변화 목표:</span>
            <span className="text-white ml-2 font-medium">
              {userInfo.weight - userInfo.targetWeight > 0 ? '-' : '+'}
              {Math.abs(userInfo.weight - userInfo.targetWeight)} kg
            </span>
          </div>
        </div>
      </div>

      {/* 핵심 룰 */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-400 mb-4">⚡ 핵심 룰</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li>• 하루 최소 {userInfo.minMeals}회 식사를 기록해야 합니다</li>
          <li>• {userInfo.cutoffTime} 이후의 식사는 다음 날로 계산됩니다</li>
          <li>• 주간 {userInfo.cheatLimit}회의 치팅을 사용할 수 있습니다</li>
          <li>• 목표 칼로리 ±{room.tolerance}kcal 범위 내에서 성공 판정됩니다</li>
          <li>• 연속 실패 시 연속 기록이 초기화됩니다</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 진행 단계 표시 */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-8">
          {(['info', 'settings', 'confirmation'] as FormStep[]).map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep === step || (index < (['info', 'settings', 'confirmation'] as FormStep[]).indexOf(currentStep))
                    ? 'bg-[var(--point-green)] text-black'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`ml-2 text-sm ${
                  currentStep === step ? 'text-white font-medium' : 'text-gray-400'
                }`}
              >
                {step === 'info' && '정보 입력'}
                {step === 'settings' && '설정'}
                {step === 'confirmation' && '확인'}
              </span>
              {index < 2 && (
                <div
                  className={`w-16 h-0.5 ml-4 ${
                    index < (['info', 'settings', 'confirmation'] as FormStep[]).indexOf(currentStep)
                      ? 'bg-[var(--point-green)]'
                      : 'bg-gray-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 현재 단계 내용 */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600 mb-6">
        {currentStep === 'info' && renderUserInfoStep()}
        {currentStep === 'settings' && renderSettingsStep()}
        {currentStep === 'confirmation' && renderConfirmationStep()}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex justify-between">
        <button
          onClick={currentStep === 'info' ? onCancel : handleBack}
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          disabled={joinChallengeMutation.isPending}
        >
          {currentStep === 'info' ? '취소' : '이전'}
        </button>

        <button
          onClick={currentStep === 'confirmation' ? handleSubmit : handleNext}
          className="px-6 py-3 bg-[var(--point-green)] text-black font-bold rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
          disabled={joinChallengeMutation.isPending || (currentStep === 'info' && (!userInfo.height || !userInfo.weight || !userInfo.targetWeight))}
        >
          {joinChallengeMutation.isPending ? '처리 중...' : currentStep === 'confirmation' ? '🚀 챌린지 시작!' : '다음'}
        </button>
      </div>
    </div>
  );
};

export default ChallengeJoinForm; 