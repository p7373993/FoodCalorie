'use client';

import React, { useState, useEffect } from 'react';
import { ChallengeReportData, ChallengeAction, BadgeAnimation, UserChallenge } from '@/types';
import { apiClient } from '@/lib/api';

interface ChallengeCompletionReportProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: UserChallenge;
  onActionComplete?: (action: string) => void;
}

const ChallengeCompletionReport: React.FC<ChallengeCompletionReportProps> = ({
  isOpen,
  onClose,
  challenge,
  onActionComplete,
}) => {
  const [report, setReport] = useState<ChallengeReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<'extend' | 'new_challenge' | 'complete' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [badgeAnimations, setBadgeAnimations] = useState<BadgeAnimation[]>([]);
  const [extensionDays, setExtensionDays] = useState(30);
  const [shareStatus, setShareStatus] = useState<{ [key: string]: 'idle' | 'copying' | 'copied' }>({});

  useEffect(() => {
    if (isOpen) {
      loadCompletionReport();
    }
  }, [isOpen]);

  useEffect(() => {
         if (report && report.earned_badges.length > 0) {
       // 배지 애니메이션 설정
       const animations = report.earned_badges.map((badge: any, index: number) => ({
         badge: badge.badge,
         isNew: true,
         animation: (['bounce', 'glow', 'shake'] as const)[index % 3],
       }));
       setBadgeAnimations(animations);
      
      // 배지 표시 지연
      setTimeout(() => setShowBadges(true), 1000);
    }
  }, [report]);

  const loadCompletionReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getChallengeCompletionReport(challenge.id);
      
      if (response.success && response.data) {
        setReport(response.data);
      } else {
        setError(response.message || '완료 리포트를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Error loading completion report:', err);
      setError('완료 리포트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedAction) return;

    try {
      setProcessing(true);
      setError(null);

      const action: ChallengeAction = {
        action: selectedAction,
        ...(selectedAction === 'extend' && { extension_days: extensionDays }),
      };

      const response = await apiClient.completeChallengeAction(action);
      
      if (response.success) {
        onActionComplete?.(selectedAction);
        onClose();
      } else {
        setError(response.message || '작업 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Error processing action:', err);
      setError('작업 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleShare = async (platform: string) => {
    try {
      setShareStatus(prev => ({ ...prev, [platform]: 'copying' }));

      if (platform === 'copy') {
        // 클립보드에 복사
        const shareText = generateShareText();
        await navigator.clipboard.writeText(shareText);
        setShareStatus(prev => ({ ...prev, [platform]: 'copied' }));
        setTimeout(() => {
          setShareStatus(prev => ({ ...prev, [platform]: 'idle' }));
        }, 2000);
      } else {
        // API를 통한 공유
        const response = await apiClient.shareChallengeReport(challenge.id, platform);
        if (response.success) {
          setShareStatus(prev => ({ ...prev, [platform]: 'copied' }));
          setTimeout(() => {
            setShareStatus(prev => ({ ...prev, [platform]: 'idle' }));
          }, 2000);
        } else {
          throw new Error(response.message);
        }
      }
    } catch (err) {
      console.error(`Error sharing to ${platform}:`, err);
      setShareStatus(prev => ({ ...prev, [platform]: 'idle' }));
    }
  };

  const generateShareText = () => {
    if (!report) return '';
    
    return `🏆 FoodCalorie 챌린지 완료!

📊 성과 요약:
• 성공률: ${report.success_rate.toFixed(1)}%
• 최대 연속: ${report.max_streak}일
• 총 성공: ${report.success_days}/${report.total_days}일

🏅 획득 배지: ${report.earned_badges.length}개
💪 달성 등급: ${getAchievementLevelText(report.achievement_level)}

#FoodCalorie #다이어트챌린지 #건강한식습관`;
  };

  const getAchievementLevelText = (level: string) => {
    const levels = {
      BEGINNER: '초급자',
      INTERMEDIATE: '중급자', 
      ADVANCED: '고급자',
      EXPERT: '전문가'
    };
    return levels[level as keyof typeof levels] || level;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-[var(--point-green)]';
    if (rate >= 70) return 'text-yellow-400';
    if (rate >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getAchievementBadgeColor = (level: string) => {
    const colors = {
      BEGINNER: 'bg-gray-600',
      INTERMEDIATE: 'bg-yellow-600',
      ADVANCED: 'bg-blue-600',
      EXPERT: 'bg-purple-600'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--card-bg)] rounded-2xl p-8 max-w-2xl w-full border border-gray-600 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'NanumGothic' }}>
            🏆 챌린지 완료!
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--point-green)] mx-auto mb-4"></div>
            <p className="text-gray-400">리포트를 생성하는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadCompletionReport}
              className="mt-4 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-500 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : report ? (
          <div className="space-y-8">
            {/* 축하 메시지 */}
            <div className="text-center">
              <div className="text-8xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {report.challenge_room.name} 챌린지 완료!
              </h3>
              <p className="text-gray-400">{report.completion_message}</p>
            </div>

            {/* 주요 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className={`text-3xl font-bold ${getSuccessRateColor(report.success_rate)}`}>
                  {report.success_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400 mt-1">성공률</div>
              </div>
              
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-[var(--point-green)]">
                  {report.max_streak}
                </div>
                <div className="text-sm text-gray-400 mt-1">최대 연속</div>
              </div>
              
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {report.success_days}
                </div>
                <div className="text-sm text-gray-400 mt-1">성공 일수</div>
              </div>
              
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {report.earned_badges.length}
                </div>
                <div className="text-sm text-gray-400 mt-1">획득 배지</div>
              </div>
            </div>

            {/* 성취 등급 */}
            <div className={`${getAchievementBadgeColor(report.achievement_level)} rounded-lg p-6 text-center`}>
              <div className="text-4xl mb-2">🏅</div>
              <h4 className="text-xl font-bold text-white mb-2">
                {getAchievementLevelText(report.achievement_level)} 달성!
              </h4>
              <p className="text-gray-200 text-sm">
                {report.total_days}일 동안 {report.success_days}일 성공하셨습니다
              </p>
            </div>

            {/* 주간 진행률 차트 */}
            {report.weekly_breakdown.length > 0 && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h4 className="text-lg font-bold text-white mb-4">📈 주간 진행률</h4>
                                 <div className="space-y-3">
                   {report.weekly_breakdown.map((week: any, index: number) => (
                     <div key={index} className="flex items-center gap-4">
                      <div className="text-sm text-gray-400 w-12">
                        {week.week}주차
                      </div>
                      <div className="flex-1 bg-gray-700 rounded-full h-3">
                        <div
                          className="h-3 bg-[var(--point-green)] rounded-full transition-all duration-500"
                          style={{ width: `${(week.success_count / week.total_count) * 100}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-300 w-20">
                        {week.success_count}/{week.total_count}일
                      </div>
                      {week.cheat_used > 0 && (
                        <div className="text-xs text-yellow-400">
                          🍕{week.cheat_used}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 획득 배지 */}
            {showBadges && report.earned_badges.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-6">
                <h4 className="text-lg font-bold text-yellow-400 mb-4">🏅 획득한 배지</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {badgeAnimations.map((item, index) => (
                    <div
                      key={index}
                      className={`text-center p-4 rounded-lg bg-gray-800/50 transform transition-all duration-500 ${
                        item.animation === 'bounce' ? 'animate-bounce' :
                        item.animation === 'glow' ? 'animate-pulse' :
                        item.animation === 'shake' ? 'animate-pulse' : ''
                      }`}
                    >
                      <div className="text-4xl mb-2">{item.badge.icon}</div>
                      <div className="text-sm font-bold text-white">{item.badge.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.badge.description}</div>
                      {item.isNew && (
                        <div className="text-xs text-yellow-400 mt-1 font-bold">NEW!</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 개인화된 추천 */}
            {report.recommendations.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                <h4 className="text-lg font-bold text-blue-400 mb-4">💡 다음 도전을 위한 추천</h4>
                                 <ul className="space-y-2">
                   {report.recommendations.map((rec: string, index: number) => (
                     <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 다음 행동 선택 */}
            <div className="border-t border-gray-600 pt-6">
              <h4 className="text-lg font-bold text-white mb-4">🎯 다음 행동을 선택해주세요</h4>
              
              <div className="grid gap-4 mb-6">
                {/* 같은 챌린지 연장 */}
                <button
                  onClick={() => setSelectedAction(selectedAction === 'extend' ? null : 'extend')}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    selectedAction === 'extend'
                      ? 'border-[var(--point-green)] bg-[var(--point-green)]/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔄</span>
                    <div>
                      <div className="font-bold text-white">같은 챌린지 연장</div>
                      <div className="text-sm text-gray-400">현재 연속 기록을 유지하고 계속 도전</div>
                    </div>
                  </div>
                  
                  {selectedAction === 'extend' && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <label className="block text-sm text-gray-300 mb-2">연장 기간:</label>
                      <select
                        value={extensionDays}
                        onChange={(e) => setExtensionDays(Number(e.target.value))}
                        className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600"
                      >
                        <option value={14}>2주 (14일)</option>
                        <option value={30}>1개월 (30일)</option>
                        <option value={60}>2개월 (60일)</option>
                        <option value={90}>3개월 (90일)</option>
                      </select>
                    </div>
                  )}
                </button>

                {/* 새 챌린지 시작 */}
                <button
                  onClick={() => setSelectedAction(selectedAction === 'new_challenge' ? null : 'new_challenge')}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    selectedAction === 'new_challenge'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🆕</span>
                    <div>
                      <div className="font-bold text-white">새 챌린지 시작</div>
                      <div className="text-sm text-gray-400">다른 난이도나 목표로 새로운 도전</div>
                    </div>
                  </div>
                </button>

                {/* 챌린지 종료 */}
                <button
                  onClick={() => setSelectedAction(selectedAction === 'complete' ? null : 'complete')}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    selectedAction === 'complete'
                      ? 'border-gray-500 bg-gray-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <div className="font-bold text-white">챌린지 종료</div>
                      <div className="text-sm text-gray-400">지금은 쉬어가며 자유롭게 기록</div>
                    </div>
                  </div>
                </button>
              </div>

              {/* 실행 버튼 */}
              <button
                onClick={handleAction}
                disabled={!selectedAction || processing}
                className="w-full bg-[var(--point-green)] text-white font-bold py-3 px-4 rounded-lg hover:bg-[var(--point-green)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? '처리 중...' : '선택한 행동 실행'}
              </button>
            </div>

            {/* 공유 기능 */}
            <div className="border-t border-gray-600 pt-6">
              <h4 className="text-lg font-bold text-white mb-4">📤 성과 공유하기</h4>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleShare('copy')}
                  disabled={shareStatus.copy === 'copying'}
                  className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <span>📋</span>
                  <span>
                    {shareStatus.copy === 'copying' ? '복사 중...' : 
                     shareStatus.copy === 'copied' ? '복사완료!' : '텍스트 복사'}
                  </span>
                </button>

                <button
                  onClick={() => handleShare('kakao')}
                  disabled={shareStatus.kakao === 'copying'}
                  className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
                >
                  <span>💬</span>
                  <span>
                    {shareStatus.kakao === 'copying' ? '공유 중...' : 
                     shareStatus.kakao === 'copied' ? '공유완료!' : '카카오톡'}
                  </span>
                </button>

                <button
                  onClick={() => handleShare('instagram')}
                  disabled={shareStatus.instagram === 'copying'}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-colors disabled:opacity-50"
                >
                  <span>📸</span>
                  <span>
                    {shareStatus.instagram === 'copying' ? '공유 중...' : 
                     shareStatus.instagram === 'copied' ? '공유완료!' : '인스타그램'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ChallengeCompletionReport; 