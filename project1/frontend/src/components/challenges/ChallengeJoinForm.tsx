'use client';

import React, { useState } from 'react';
import { ChallengeRoom, ChallengeJoinRequest } from '@/types';
import challengeApi from '@/lib/challengeApi';

interface ChallengeJoinFormProps {
  room: ChallengeRoom;
  onSuccess: () => void;
  onCancel: () => void;
}

const ChallengeJoinForm: React.FC<ChallengeJoinFormProps> = ({
  room,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    user_height: 170,
    user_weight: 70,
    user_target_weight: 65,
    user_challenge_duration_days: 30,
    user_weekly_cheat_limit: 1,
    min_daily_meals: 2,
    challenge_cutoff_time: '23:00',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('time') ? value : Number(value) || value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const joinRequest: ChallengeJoinRequest = {
        room_id: room.id,
        ...formData
      };

      const response = await challengeApi.joinChallengeRoom(joinRequest);

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error?.message || '챌린지 참여에 실패했습니다.');
      }
    } catch (err) {
      console.error('Error joining challenge:', err);
      setError('챌린지 참여 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getBMI = () => {
    const heightInM = formData.user_height / 100;
    return (formData.user_weight / (heightInM * heightInM)).toFixed(1);
  };

  const getTargetBMI = () => {
    const heightInM = formData.user_height / 100;
    return (formData.user_target_weight / (heightInM * heightInM)).toFixed(1);
  };

  const getWeightChangeNeeded = () => {
    return (formData.user_target_weight - formData.user_weight).toFixed(1);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <header className="text-center py-6">
        <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'NanumGothic', color: 'var(--point-green)' }}>
          챌린지 참여 설정
        </h1>
        <p className="text-gray-400">
          "{room.name}" 챌린지에 참여하기 위한 개인 정보를 입력해주세요
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 왼쪽: 챌린지 정보 */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
          <h2 className="text-2xl font-bold text-white mb-4">📋 챌린지 정보</h2>

          <div className="space-y-4">
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">챌린지 이름</div>
              <div className="text-lg font-bold text-white">{room.name}</div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">목표 칼로리</div>
              <div className="text-lg font-bold text-white">
                {room.target_calorie.toLocaleString()} kcal
                <span className="text-sm text-gray-400 ml-2">(±{room.tolerance}kcal)</span>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">설명</div>
              <div className="text-white">{room.description}</div>
            </div>
          </div>

          {/* 주의사항 */}
          <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">⚠️ 참여 전 확인사항</h3>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• 참여 후 설정 변경이 제한됩니다</li>
              <li>• 매일 최소 식사 기록이 필요합니다</li>
              <li>• 마감 시간 이후 식사는 다음 날로 계산됩니다</li>
              <li>• 연속 실패 시 순위가 초기화됩니다</li>
            </ul>
          </div>
        </div>

        {/* 오른쪽: 설정 폼 */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
          <h2 className="text-2xl font-bold text-white mb-4">⚙️ 개인 설정</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 신체 정보 */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">📏 신체 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">키 (cm)</label>
                  <input
                    type="number"
                    name="user_height"
                    value={formData.user_height}
                    onChange={handleInputChange}
                    min="100"
                    max="250"
                    required
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">현재 체중 (kg)</label>
                  <input
                    type="number"
                    name="user_weight"
                    value={formData.user_weight}
                    onChange={handleInputChange}
                    min="30"
                    max="300"
                    step="0.1"
                    required
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-2">목표 체중 (kg)</label>
                <input
                  type="number"
                  name="user_target_weight"
                  value={formData.user_target_weight}
                  onChange={handleInputChange}
                  min="30"
                  max="300"
                  step="0.1"
                  required
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
                />
              </div>

              {/* BMI 정보 */}
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                  <div className="text-gray-400">현재 BMI</div>
                  <div className="text-white font-bold">{getBMI()}</div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                  <div className="text-gray-400">목표 BMI</div>
                  <div className="text-white font-bold">{getTargetBMI()}</div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                  <div className="text-gray-400">체중 변화</div>
                  <div className={`font-bold ${Number(getWeightChangeNeeded()) > 0 ? 'text-blue-400' : 'text-[var(--point-green)]'}`}>
                    {getWeightChangeNeeded()}kg
                  </div>
                </div>
              </div>
            </div>

            {/* 챌린지 설정 */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">🎯 챌린지 설정</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">챌린지 기간 (일)</label>
                  <select
                    name="user_challenge_duration_days"
                    value={formData.user_challenge_duration_days}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
                  >
                    <option value={7}>1주 (7일)</option>
                    <option value={14}>2주 (14일)</option>
                    <option value={30}>1개월 (30일)</option>
                    <option value={60}>2개월 (60일)</option>
                    <option value={90}>3개월 (90일)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">주간 치팅 허용 횟수</label>
                  <select
                    name="user_weekly_cheat_limit"
                    value={formData.user_weekly_cheat_limit}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
                  >
                    <option value={0}>0회 (치팅 없음)</option>
                    <option value={1}>1회</option>
                    <option value={2}>2회</option>
                    <option value={3}>3회</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">최소 일일 식사 횟수</label>
                  <select
                    name="min_daily_meals"
                    value={formData.min_daily_meals}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
                  >
                    <option value={1}>1회</option>
                    <option value={2}>2회</option>
                    <option value={3}>3회</option>
                    <option value={4}>4회</option>
                    <option value={5}>5회</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">챌린지 마감 시간</label>
                  <input
                    type="time"
                    name="challenge_cutoff_time"
                    value={formData.challenge_cutoff_time}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    이 시간 이후의 식사는 다음 날로 계산됩니다
                  </p>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-gray-700 text-white font-bold py-4 px-6 rounded-lg hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[var(--point-green)] text-black font-bold py-4 px-6 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                    참여 중...
                  </div>
                ) : (
                  '🚀 챌린지 시작하기'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChallengeJoinForm;