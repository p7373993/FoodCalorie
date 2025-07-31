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

  // 주간 성과 시뮬레이션 (실제로는 백엔드에서 받아와야 함)
  const weeklyData = Array.from({ length: 4 }, (_, i) => ({
    week: i + 1,
    success: Math.floor(Math.random() * 7),
    failure: Math.floor(Math.random() * 3),
  }));

  // 일일 칼로리 트렌드 시뮬레이션
  const dailyCalories = Array.from({ length: 7 }, (_, i) => ({
    day: ['월', '화', '수', '목', '금', '토', '일'][i],
    calories: Math.floor(Math.random() * 500) + 1500,
    target: 2000,
  }));

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
                  <div
                    className={`absolute bottom-0 w-full transition-all duration-500 ${day.calories <= day.target + 100 && day.calories >= day.target - 100
                        ? 'bg-[var(--point-green)]'
                        : day.calories > day.target + 100
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                    style={{ height: `${Math.min((day.calories / 3000) * 100, 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs">
                  <div className="text-white font-semibold">{day.calories}</div>
                  <div className="text-gray-400">목표: {day.target}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[var(--point-green)] rounded"></div>
              <span className="text-gray-300">목표 달성</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-300">목표 초과</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-300">목표 미달</span>
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