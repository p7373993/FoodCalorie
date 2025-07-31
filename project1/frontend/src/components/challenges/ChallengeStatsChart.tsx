'use client';

import React from 'react';
import { ChallengeStatistics } from '@/types';

interface ChallengeStatsChartProps {
  statistics: ChallengeStatistics;
}

const ChallengeStatsChart: React.FC<ChallengeStatsChartProps> = ({ statistics }) => {
  // 성공/실패 비율 계산
  const totalDays = statistics.total_success_days + statistics.total_failure_days;
  const successPercentage = totalDays > 0 ? (statistics.total_success_days / totalDays) * 100 : 0;
  const failurePercentage = totalDays > 0 ? (statistics.total_failure_days / totalDays) * 100 : 0;

  // 실제 주간 데이터 사용 (백엔드에서 제공)
  const weeklyData = statistics.weekly_data || [];

  // 실제 일일 칼로리 데이터 사용 (백엔드에서 제공)
  const dailyCalories = statistics.daily_calories || [];

  return (
    <div className="space-y-8">
      {/* 성공/실패 비율 차트 */}
      <div>
        <h4 className="text-lg font-bold text-white mb-4">📊 성공/실패 비율</h4>
        <div className="bg-gray-800/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-[var(--point-green)] rounded"></div>
                <span className="text-sm text-gray-300">성공 ({statistics.total_success_days}일)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-300">실패 ({statistics.total_failure_days}일)</span>
              </div>
            </div>
            <div className="text-lg font-bold text-white">
              총 {totalDays}일
            </div>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden">
            <div className="h-full flex">
              <div
                className="bg-[var(--point-green)] transition-all duration-500"
                style={{ width: `${successPercentage}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${failurePercentage}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between mt-2 text-sm text-gray-400">
            <span>{successPercentage.toFixed(1)}% 성공</span>
            <span>{failurePercentage.toFixed(1)}% 실패</span>
          </div>
        </div>
      </div>

      {/* 주간 성과 차트 */}
      <div>
        <h4 className="text-lg font-bold text-white mb-4">📈 주간 성과 트렌드</h4>
        <div className="bg-gray-800/30 rounded-lg p-6">
          <div className="grid grid-cols-4 gap-4">
            {weeklyData.map((week) => (
              <div key={week.week} className="text-center">
                <div className="text-sm text-gray-400 mb-2">{week.week}주차</div>
                <div className="relative h-32 bg-gray-700 rounded-lg overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full bg-[var(--point-green)] transition-all duration-500"
                    style={{ height: `${(week.success / 7) * 100}%` }}
                  />
                  <div
                    className="absolute bottom-0 w-full bg-red-500 opacity-50 transition-all duration-500"
                    style={{
                      height: `${((week.success + week.failure) / 7) * 100}%`,
                      top: `${100 - ((week.success + week.failure) / 7) * 100}%`
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-300">
                  <div className="text-[var(--point-green)]">성공: {week.success}</div>
                  <div className="text-red-400">실패: {week.failure}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 일일 칼로리 트렌드 */}
      <div>
        <h4 className="text-lg font-bold text-white mb-4">🍽️ 최근 일주일 칼로리 트렌드</h4>
        <div className="bg-gray-800/30 rounded-lg p-6">
          <div className="grid grid-cols-7 gap-2">
            {dailyCalories.map((day) => (
              <div key={day.day} className="text-center">
                <div className="text-sm text-gray-400 mb-2">{day.day}</div>
                <div className="relative h-40 bg-gray-700 rounded-lg overflow-hidden">
                  {/* 목표 칼로리 라인 */}
                  <div
                    className="absolute w-full border-t-2 border-dashed border-yellow-400"
                    style={{ bottom: `${(day.target / 3000) * 100}%` }}
                  />
                  {/* 실제 칼로리 바 */}
                  {day.has_record ? (
                    <div
                      className={`absolute bottom-0 w-full transition-all duration-500 ${day.is_cheat_day
                        ? 'bg-yellow-500'  // 치팅 데이
                        : day.is_success
                          ? 'bg-[var(--point-green)]'  // 성공
                          : 'bg-red-500'  // 실패
                        }`}
                      style={{ height: `${Math.min((day.calories / 3000) * 100, 100)}%` }}
                    />
                  ) : (
                    // 기록이 없는 경우
                    <div className="absolute bottom-0 w-full h-2 bg-gray-500 opacity-50" />
                  )}
                </div>
                <div className="mt-2 text-xs">
                  <div className="text-white font-semibold">
                    {day.has_record ? `${day.calories}kcal` : '기록 없음'}
                  </div>
                  <div className="text-gray-400">목표: {day.target}kcal</div>
                  {day.is_cheat_day && (
                    <div className="text-yellow-400 text-xs">치팅</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[var(--point-green)] rounded"></div>
              <span className="text-gray-300">성공</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-300">실패</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-300">치팅 데이</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-gray-500 opacity-50 rounded"></div>
              <span className="text-gray-300">기록 없음</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-yellow-400 border-dashed border-t-2"></div>
              <span className="text-gray-300">목표선</span>
            </div>
          </div>
        </div>
      </div>

      {/* 연속 성공 기록 */}
      <div>
        <h4 className="text-lg font-bold text-white mb-4">🔥 연속 성공 기록</h4>
        <div className="bg-gray-800/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold text-[var(--point-green)]">
                {statistics.current_streak}일
              </div>
              <div className="text-sm text-gray-400">현재 연속 기록</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400">
                {statistics.max_streak}일
              </div>
              <div className="text-sm text-gray-400">최고 기록</div>
            </div>
          </div>

          {/* 연속 기록 진행률 */}
          <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
            <div
              className="bg-gradient-to-r from-[var(--point-green)] to-yellow-400 h-4 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((statistics.current_streak / statistics.max_streak) * 100, 100)}%` }}
            />
          </div>

          <div className="text-center text-sm text-gray-400">
            최고 기록까지 {statistics.max_streak - statistics.current_streak}일 남음
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeStatsChart;