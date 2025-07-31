'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChallengeCreateForm {
  name: string;
  target_calorie: number;
  tolerance: number;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

export default function CreateChallengePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ChallengeCreateForm>({
    name: '',
    target_calorie: 2000,
    tolerance: 100,
    description: '',
    difficulty: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'target_calorie' || name === 'tolerance' ? Number(value) : value
    }));
  };

  const handleDifficultyChange = (difficulty: ChallengeCreateForm['difficulty']) => {
    setFormData(prev => ({ ...prev, difficulty }));

    // 난이도에 따른 기본값 설정
    switch (difficulty) {
      case 'easy':
        setFormData(prev => ({ ...prev, target_calorie: 2500, tolerance: 150 }));
        break;
      case 'medium':
        setFormData(prev => ({ ...prev, target_calorie: 2000, tolerance: 100 }));
        break;
      case 'hard':
        setFormData(prev => ({ ...prev, target_calorie: 1500, tolerance: 50 }));
        break;
      case 'expert':
        setFormData(prev => ({ ...prev, target_calorie: 1200, tolerance: 30 }));
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 실제로는 API 호출
      console.log('Creating challenge:', formData);

      // 시뮬레이션: 2초 후 성공
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 성공 시 챌린지 목록으로 이동
      router.push('/challenges');
    } catch (err) {
      console.error('Error creating challenge:', err);
      setError('챌린지 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/challenges');
  };

  const getDifficultyInfo = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return { label: '쉬움', color: 'text-green-400', emoji: '😊', description: '체중 증가나 유지를 원하는 분' };
      case 'medium':
        return { label: '보통', color: 'text-blue-400', emoji: '🙂', description: '균형 잡힌 식단을 원하는 분' };
      case 'hard':
        return { label: '어려움', color: 'text-orange-400', emoji: '😤', description: '체중 감량을 목표로 하는 분' };
      case 'expert':
        return { label: '전문가', color: 'text-red-400', emoji: '🔥', description: '집중적인 다이어트가 필요한 분' };
      default:
        return { label: '보통', color: 'text-blue-400', emoji: '🙂', description: '균형 잡힌 식단을 원하는 분' };
    }
  };

  const difficultyInfo = getDifficultyInfo(formData.difficulty);

  return (
    <div className="bg-grid-pattern text-white min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <header className="text-center py-6">
          <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'NanumGothic', color: 'var(--point-green)' }}>
            새 챌린지 만들기
          </h1>
          <p className="text-gray-400">
            나만의 칼로리 챌린지를 만들어 다른 사용자들과 함께해보세요
          </p>
        </header>

        {/* 안내 메시지 */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-3xl">ℹ️</div>
            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-2">챌린지 생성 안내</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• 챌린지는 관리자 승인 후 활성화됩니다</li>
                <li>• 부적절한 내용이 포함된 챌린지는 거부될 수 있습니다</li>
                <li>• 생성된 챌린지는 수정이 제한됩니다</li>
                <li>• 최소 3명 이상 참여 시 정식 운영됩니다</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 왼쪽: 기본 정보 */}
            <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
              <h2 className="text-2xl font-bold text-white mb-6">📝 기본 정보</h2>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">챌린지 이름 *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="예: 나만의 1800kcal 챌린지"
                    required
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">설명 *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="챌린지에 대한 설명을 입력해주세요..."
                    required
                    rows={4}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">목표 칼로리 *</label>
                    <input
                      type="number"
                      name="target_calorie"
                      value={formData.target_calorie}
                      onChange={handleInputChange}
                      min="1000"
                      max="5000"
                      step="50"
                      required
                      className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">허용 오차 *</label>
                    <input
                      type="number"
                      name="tolerance"
                      value={formData.tolerance}
                      onChange={handleInputChange}
                      min="10"
                      max="300"
                      step="10"
                      required
                      className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 난이도 설정 */}
            <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
              <h2 className="text-2xl font-bold text-white mb-6">⚙️ 난이도 설정</h2>

              <div className="space-y-4">
                {(['easy', 'medium', 'hard', 'expert'] as const).map((difficulty) => {
                  const info = getDifficultyInfo(difficulty);
                  const isSelected = formData.difficulty === difficulty;

                  return (
                    <div
                      key={difficulty}
                      onClick={() => handleDifficultyChange(difficulty)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${isSelected
                          ? 'border-[var(--point-green)] bg-[var(--point-green)]/10'
                          : 'border-gray-600 hover:border-gray-500'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{info.emoji}</span>
                          <div>
                            <div className={`font-semibold ${info.color}`}>
                              {info.label}
                            </div>
                            <div className="text-sm text-gray-400">
                              {info.description}
                            </div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${isSelected
                            ? 'border-[var(--point-green)] bg-[var(--point-green)]'
                            : 'border-gray-400'
                          }`}>
                          {isSelected && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 선택된 난이도 정보 */}
              <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
                <h4 className="font-semibold text-white mb-2">선택된 설정</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">목표 칼로리:</span>
                    <span className="text-white">{formData.target_calorie.toLocaleString()}kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">허용 오차:</span>
                    <span className="text-white">±{formData.tolerance}kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">실제 범위:</span>
                    <span className="text-white">
                      {(formData.target_calorie - formData.tolerance).toLocaleString()} ~ {(formData.target_calorie + formData.tolerance).toLocaleString()}kcal
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
            <h2 className="text-2xl font-bold text-white mb-6">👀 미리보기</h2>

            <div className="bg-gray-800/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  {formData.name || '챌린지 이름을 입력하세요'}
                </h3>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyInfo.color} bg-gray-700`}>
                  {difficultyInfo.label}
                </div>
              </div>

              <p className="text-gray-300 mb-4">
                {formData.description || '챌린지 설명을 입력하세요...'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">목표 칼로리</div>
                  <div className="text-lg font-bold text-white">
                    {formData.target_calorie.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">±{formData.tolerance}kcal</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">예상 참여자</div>
                  <div className="text-lg font-bold text-white">0명</div>
                  <div className="text-xs text-gray-500">승인 후 활성화</div>
                </div>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-gray-700 text-white font-bold py-4 px-6 rounded-lg hover:bg-gray-600 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.description}
              className="flex-1 bg-[var(--point-green)] text-black font-bold py-4 px-6 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  생성 중...
                </div>
              ) : (
                '🚀 챌린지 생성하기'
              )}
            </button>
          </div>
        </form>

        {/* 푸터 */}
        <footer className="text-center py-8 text-gray-500 text-sm">
          <p>생성된 챌린지는 관리자 검토 후 24시간 내에 활성화됩니다.</p>
        </footer>
      </div>
    </div>
  );
}