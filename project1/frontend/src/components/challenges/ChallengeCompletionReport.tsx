'use client';

import React, { useState, useEffect } from 'react';
import { UserChallenge } from '@/types';
import challengeApi from '@/lib/challengeApi';

interface ChallengeCompletionReportProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: UserChallenge;
  onActionComplete: (action: 'new_challenge' | 'share' | 'close') => void;
}

const ChallengeCompletionReport: React.FC<ChallengeCompletionReportProps> = ({
  isOpen,
  onClose,
  challenge,
  onActionComplete,
}) => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadReportData();
    }
  }, [isOpen]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const response = await challengeApi.getChallengeReport(challenge.id);

      if (response.success && response.data) {
        setReportData(response.data);
      } else {
        setError('리포트 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('리포트 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChallenge = () => {
    onActionComplete('new_challenge');
    onClose();
  };

  const handleShare = async (platform: string) => {
    try {
      const response = await challengeApi.shareChallengeReport(challenge.id, platform);
      if (response.success) {
        alert(`${platform}에 공유되었습니다!`);
        onActionComplete('share');
      } else {
        alert('공유에 실패했습니다.');
      }
    } catch (err) {
      console.error('Error sharing report:', err);
      alert('공유 중 오류가 발생했습니다.');
    }
  };

  const getSuccessRate = () => {
    if (!reportData?.statistics) return 0;
    const { total_success_days, total_failure_days } = reportData.statistics;
    const total = total_success_days + total_failure_days;
    return total > 0 ? Math.round((total_success_days / total) * 100) : 0;
  };

  const getGradeInfo = (successRate: number) => {
    if (successRate >= 90) return { grade: 'S', color: 'text-yellow-400', emoji: '🏆', message: '완벽한 성과입니다!' };
    if (successRate >= 80) return { grade: 'A', color: 'text-[var(--point-green)]', emoji: '🎉', message: '훌륭한 결과입니다!' };
    if (successRate >= 70) return { grade: 'B', color: 'text-blue-400', emoji: '👏', message: '좋은 성과입니다!' };
    if (successRate >= 60) return { grade: 'C', color: 'text-yellow-500', emoji: '👍', message: '괜찮은 결과입니다!' };
    if (successRate >= 50) return { grade: 'D', color: 'text-orange-500', emoji: '💪', message: '다음엔 더 잘할 수 있어요!' };
    return { grade: 'F', color: 'text-red-500', emoji: '🔥', message: '새로운 도전을 해보세요!' };
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[var(--card-bg)] rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-600">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--point-green)] mx-auto mb-4"></div>
            <p className="text-white text-lg">리포트를 생성하는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[var(--card-bg)] rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-600">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">오류가 발생했습니다</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="bg-[var(--point-green)] text-black font-bold py-3 px-6 rounded-lg hover:bg-green-400 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const successRate = getSuccessRate();
  const gradeInfo = getGradeInfo(successRate);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-bg)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-600">
        {/* 헤더 */}
        <div className="sticky top-0 bg-[var(--card-bg)] border-b border-gray-600 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">📋 챌린지 완료 리포트</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 챌린지 정보 */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-2">{challenge.room_name}</h3>
            <p className="text-gray-400">
              {new Date(challenge.challenge_start_date).toLocaleDateString('ko-KR')} ~ {' '}
              {new Date(challenge.challenge_end_date).toLocaleDateString('ko-KR')}
            </p>
          </div>

          {/* 성과 등급 */}
          <div className="text-center bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-8">
            <div className="text-6xl mb-4">{gradeInfo.emoji}</div>
            <div className={`text-6xl font-black mb-2 ${gradeInfo.color}`}>
              {gradeInfo.grade}
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              성공률 {successRate}%
            </div>
            <p className="text-gray-400">{gradeInfo.message}</p>
          </div>

          {/* 상세 통계 */}
          {reportData?.statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[var(--point-green)]">
                  {reportData.statistics.total_success_days}
                </div>
                <div className="text-sm text-gray-400">성공 일수</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {reportData.statistics.total_failure_days}
                </div>
                <div className="text-sm text-gray-400">실패 일수</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {reportData.statistics.max_streak}
                </div>
                <div className="text-sm text-gray-400">최고 연속</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {reportData.statistics.total_cheat_days || 0}
                </div>
                <div className="text-sm text-gray-400">치팅 사용</div>
              </div>
            </div>
          )}

          {/* 획득 배지 */}
          {reportData?.badges && reportData.badges.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-white mb-4">🏅 획득한 배지</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {reportData.badges.map((badge: any, index: number) => (
                  <div key={index} className="bg-gray-800/30 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">{badge.icon}</div>
                    <div className="text-sm font-semibold text-white">{badge.name}</div>
                    <div className="text-xs text-gray-400">{badge.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 결과 메시지 */}
          {reportData?.result_message && (
            <div className="bg-gradient-to-r from-[var(--point-green)]/20 to-blue-500/20 rounded-lg p-6 border border-[var(--point-green)]/30">
              <p className="text-white text-center leading-relaxed">
                {reportData.result_message}
              </p>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="space-y-4">
            <button
              onClick={handleNewChallenge}
              className="w-full bg-[var(--point-green)] text-black font-bold py-4 px-6 rounded-lg hover:bg-green-400 transition-all duration-300 transform hover:scale-[1.02]"
            >
              🚀 새로운 챌린지 시작하기
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleShare('twitter')}
                className="bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-400 transition-colors"
              >
                🐦 트위터 공유
              </button>
              <button
                onClick={() => handleShare('facebook')}
                className="bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors"
              >
                📘 페이스북 공유
              </button>
            </div>

            <button
              onClick={() => {
                onActionComplete('close');
                onClose();
              }}
              className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
            >
              닫기
            </button>
          </div>

          {/* 생성 시간 */}
          <div className="text-center text-xs text-gray-500">
            {reportData?.generated_at && (
              <p>
                리포트 생성: {new Date(reportData.generated_at).toLocaleString('ko-KR')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeCompletionReport;