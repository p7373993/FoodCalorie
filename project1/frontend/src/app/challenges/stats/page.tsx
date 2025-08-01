'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserChallenge, ChallengeStatistics } from '@/types';
import { apiClient } from '@/lib/api';
import ChallengeStatsChart from '@/components/challenges/ChallengeStatsChart';

export default function ChallengeStatsPage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<UserChallenge | null>(null);
  const [statistics, setStatistics] = useState<ChallengeStatistics | null>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChallengeStats();
  }, []);

  const loadChallengeStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPersonalStats();

      if (response.success && response.data) {
        setStatistics(response.data.statistics);
        setBadges(response.data.badges || []);
        setError(null);
      } else {
        setError(response.message || '통계를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Error loading challenge stats:', err);
      setError('통계를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToMy = () => {
    router.push('/challenges/my');
  };

  const getSuccessRate = () => {
    if (!statistics) return 0;
    const total = statistics.total_success_days + statistics.total_failure_days;
    return total > 0 ? Math.round((statistics.total_success_days / total) * 100) : 0;
  };

  const getGradeInfo = (successRate: number) => {
    if (successRate >= 90) return { grade: 'S', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' };
    if (successRate >= 80) return { grade: 'A', color: 'text-[var(--point-green)]', bgColor: 'bg-[var(--point-green)]/20' };
    if (successRate >= 70) return { grade: 'B', color: 'text-blue-400', bgColor: 'bg-blue-400/20' };
    if (successRate >= 60) return { grade: 'C', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' };
    if (successRate >= 50) return { grade: 'D', color: 'text-orange-500', bgColor: 'bg-orange-500/20' };
    return { grade: 'F', color: 'text-red-500', bgColor: 'bg-red-500/20' };
  };

  if (loading) {
    return (
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--point-green)] mb-4"></div>
          <p className="text-xl text-gray-400">통계를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleBackToMy}
            className="bg-[var(--point-green)] text-black font-bold py-3 px-6 rounded-lg hover:bg-green-400 transition-colors"
          >
            내 챌린지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const successRate = getSuccessRate();
  const gradeInfo = getGradeInfo(successRate);

  return (
    <div className="bg-grid-pattern text-white min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <header className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'NanumGothic', color: 'var(--point-green)' }}>
              챌린지 통계
            </h1>
            <p className="text-gray-400">
              나의 챌린지 성과를 자세히 분석해보세요
            </p>
          </div>
          <button
            onClick={handleBackToMy}
            className="bg-[var(--point-green)] text-black font-bold py-3 px-6 rounded-lg hover:bg-green-400 transition-colors"
            style={{ fontFamily: 'NanumGothic' }}
          >
            내 챌린지
          </button>
        </header>

        {statistics && (
          <div className="space-y-8">
            {/* 성과 요약 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 성과 등급 */}
              <div className={`${gradeInfo.bgColor} rounded-2xl p-8 border border-gray-600 text-center`}>
                <div className="text-6xl mb-4">🏆</div>
                <div className={`text-6xl font-black mb-2 ${gradeInfo.color}`}>
                  {gradeInfo.grade}
                </div>
                <div className="text-xl font-bold text-white mb-2">
                  성공률 {successRate}%
                </div>
                <p className="text-gray-400">전체 성과 등급</p>
              </div>

              {/* 연속 성공 */}
              <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600 text-center">
                <div className="text-6xl mb-4">🔥</div>
                <div className="text-6xl font-black mb-2 text-[var(--point-green)]">
                  {statistics.current_streak}
                </div>
                <div className="text-xl font-bold text-white mb-2">
                  현재 연속
                </div>
                <p className="text-gray-400">최고: {statistics.max_streak}일</p>
              </div>

              {/* 총 성공 */}
              <div className="bg-[var(--card-bg)] rounded-2xl p-8 border border-gray-600 text-center">
                <div className="text-6xl mb-4">✅</div>
                <div className="text-6xl font-black mb-2 text-blue-400">
                  {statistics.total_success_days}
                </div>
                <div className="text-xl font-bold text-white mb-2">
                  총 성공 일수
                </div>
                <p className="text-gray-400">실패: {statistics.total_failure_days}일</p>
              </div>
            </div>

            {/* 상세 통계 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 진행 현황 */}
              <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
                <h3 className="text-2xl font-bold text-white mb-6">📊 진행 현황</h3>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>챌린지 진행률</span>
                      <span>{Math.round(((statistics.total_success_days + statistics.total_failure_days) / 30) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-[var(--point-green)] to-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round(((statistics.total_success_days + statistics.total_failure_days) / 30) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">{statistics.remaining_days}</div>
                      <div className="text-sm text-gray-400">남은 일수</div>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">{statistics.days_since_start || 0}</div>
                      <div className="text-sm text-gray-400">참여 일수</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 성과 분석 */}
              <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
                <h3 className="text-2xl font-bold text-white mb-6">📈 성과 분석</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎯</span>
                      <div>
                        <div className="font-semibold text-white">목표 달성률</div>
                        <div className="text-sm text-gray-400">전체 기간 기준</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[var(--point-green)]">
                      {successRate}%
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <div className="font-semibold text-white">최고 연속 기록</div>
                        <div className="text-sm text-gray-400">개인 최고 기록</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {statistics.max_streak}일
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🍽️</span>
                      <div>
                        <div className="font-semibold text-white">평균 칼로리</div>
                        <div className="text-sm text-gray-400">일일 평균 섭취량</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-400">
                      {Math.round(statistics.average_calories || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 획득한 배지 */}
            {badges.length > 0 && (
              <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
                <h3 className="text-2xl font-bold text-white mb-6">🏅 획득한 배지</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {badges.map((badge, index) => (
                    <div key={index} className="bg-gray-800/30 rounded-lg p-4 text-center hover:bg-gray-700/30 transition-colors">
                      <div className="text-3xl mb-2">{badge.icon || '🏅'}</div>
                      <div className="text-sm font-semibold text-white mb-1">{badge.name}</div>
                      <div className="text-xs text-gray-400">{badge.description}</div>
                      <div className="text-xs text-[var(--point-green)] mt-2">
                        {new Date(badge.earned_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 차트 섹션 */}
            <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
              <h3 className="text-2xl font-bold text-white mb-6">📊 성과 차트</h3>
              <ChallengeStatsChart statistics={statistics} />
            </div>

            {/* 개선 제안 */}
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-6 border border-blue-500/30">
              <h3 className="text-2xl font-bold text-white mb-4">💡 개선 제안</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {successRate < 70 && (
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🎯</span>
                      <div className="font-semibold text-white">목표 달성률 향상</div>
                    </div>
                    <p className="text-sm text-gray-300">
                      현재 성공률이 {successRate}%입니다. 더 현실적인 목표 설정을 고려해보세요.
                    </p>
                  </div>
                )}

                {statistics.current_streak < 3 && (
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🔥</span>
                      <div className="font-semibold text-white">연속 기록 개선</div>
                    </div>
                    <p className="text-sm text-gray-300">
                      꾸준한 기록 관리로 연속 성공 일수를 늘려보세요.
                    </p>
                  </div>
                )}

                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">📱</span>
                    <div className="font-semibold text-white">규칙적인 기록</div>
                  </div>
                  <p className="text-sm text-gray-300">
                    매일 같은 시간에 식단을 기록하는 습관을 만들어보세요.
                  </p>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">👥</span>
                    <div className="font-semibold text-white">커뮤니티 활용</div>
                  </div>
                  <p className="text-sm text-gray-300">
                    리더보드를 통해 다른 참여자들과 경쟁하며 동기부여를 받아보세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 푸터 */}
        <footer className="text-center py-8 text-gray-500 text-sm">
          <p>통계는 실시간으로 업데이트됩니다 📊</p>
        </footer>
      </div>
    </div>
  );
}