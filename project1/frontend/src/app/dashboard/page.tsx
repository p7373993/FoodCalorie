'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
} from 'recharts';
import WeightRecordModal from '@/components/ui/WeightRecordModal';
import WeeklyReportModal from '@/components/ui/WeeklyReportModal';
import UserInfo from '@/components/auth/UserInfo';
import AuthLoadingScreen from '@/components/ui/AuthLoadingScreen';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { apiClient } from '@/lib/api';



interface WeightEntry {
  id: string;
  weight: number;
  timestamp: { seconds: number; nanoseconds: number; };
}

interface MealEntry {
  id: number;
  date: string;
  mealType: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutriScore: string;
  imageUrl?: string;
  time: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { canRender, isLoading } = useRequireAuth();
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);

  const [recentMeals, setRecentMeals] = useState<MealEntry[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [weeklyCalories, setWeeklyCalories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 인증 확인 중이면 로딩 화면 표시
  if (isLoading || !canRender) {
    return <AuthLoadingScreen message="대시보드를 불러오고 있습니다..." />;
  }

  useEffect(() => {
    // 실제 대시보드 데이터 로드
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        console.log('🔄 대시보드 데이터 로딩 시작...');

        // 대시보드 데이터 가져오기
        const dashboardResponse = await apiClient.getDashboardData();
        console.log('📊 대시보드 데이터:', dashboardResponse);
        setDashboardData(dashboardResponse);

        // 주간 칼로리 데이터 설정
        if (dashboardResponse.weekly_calories && dashboardResponse.weekly_calories.days) {
          setWeeklyCalories(dashboardResponse.weekly_calories.days);
          console.log('📈 주간 칼로리 데이터:', dashboardResponse.weekly_calories.days);
        }

        // 최근 식사 기록 설정
        if (dashboardResponse.recent_meals) {
          setRecentMeals(dashboardResponse.recent_meals);
          console.log('🍽️ 최근 식사 기록:', dashboardResponse.recent_meals);
        }

        // 체중 데이터 가져오기
        const weightResponse = await apiClient.getWeightEntries();
        console.log('⚖️ 체중 데이터:', weightResponse);
        if (weightResponse.success && weightResponse.records) {
          const formattedWeights = weightResponse.records.map((record: any) => ({
            id: record.id.toString(),
            weight: record.weight,
            timestamp: {
              seconds: new Date(record.created_at).getTime() / 1000,
              nanoseconds: 0
            }
          }));
          setWeightHistory(formattedWeights);
        }



      } catch (error) {
        console.error('❌ 대시보드 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleSaveWeight = async (weight: string) => {
    if (!weight) return;

    try {
      console.log('💾 체중 저장 시작:', weight);

      // 백엔드 API를 통해 체중 저장
      const response = await apiClient.createWeightEntry(parseFloat(weight));
      console.log('✅ 체중 저장 성공:', response);

      // 성공 메시지 표시
      alert(`${weight}kg 체중이 기록되었습니다!`);

      // 체중 히스토리 업데이트
      const newWeightEntry = {
        id: Date.now().toString(),
        weight: parseFloat(weight),
        timestamp: {
          seconds: Date.now() / 1000,
          nanoseconds: 0
        }
      };
      setWeightHistory(prev => [newWeightEntry, ...prev]);

      // 대시보드 데이터 새로고침
      const dashboardResponse = await apiClient.getDashboardData();
      setDashboardData(dashboardResponse);

    } catch (error) {
      console.error("❌ 체중 저장 실패:", error);
      alert("체중 기록에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleReset = () => {
    router.push('/');
  };

  const handleGoToChallenges = () => {
    router.push('/challenges');
  };

  const handleGoToCalendar = () => {
    router.push('/calendar');
  };

  const handleDeleteMeal = async (mealId: number, foodName: string) => {
    if (!confirm(`"${foodName}" 식사 기록을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      console.log('🗑️ 식사 기록 삭제 시작:', mealId);

      const response = await apiClient.deleteMeal(mealId);

      console.log('✅ 식사 기록 삭제 성공:', response);

      // 성공 메시지 표시
      const successMessage = `"${foodName}" 식사 기록이 삭제되었습니다.`;
      alert(successMessage);

      // 대시보드 데이터 새로고침
      const dashboardResponse = await apiClient.getDashboardData();
      setDashboardData(dashboardResponse);

      if (dashboardResponse.recent_meals) {
        setRecentMeals(dashboardResponse.recent_meals);
      }

      if (dashboardResponse.weekly_calories && dashboardResponse.weekly_calories.days) {
        setWeeklyCalories(dashboardResponse.weekly_calories.days);
      }

    } catch (error) {
      console.error('❌ 식사 기록 삭제 실패:', error);

      // 에러 타입에 따른 메시지 처리
      let errorMessage = '식사 기록 삭제에 실패했습니다.';

      if (error instanceof Error) {
        if (error.message.includes('권한')) {
          errorMessage = '자신의 식사 기록만 삭제할 수 있습니다.';
        } else if (error.message.includes('404')) {
          errorMessage = '삭제하려는 식사 기록을 찾을 수 없습니다.';
        }
      }

      alert(errorMessage + ' 다시 시도해주세요.');
    }
  };

  // 선형 보간 함수 (빈 데이터를 자연스럽게 연결)
  const interpolateData = (data: any[], valueKey: string) => {
    const result = [...data];

    for (let i = 0; i < result.length; i++) {
      if (result[i][valueKey] === null || result[i][valueKey] === undefined) {
        // 앞뒤 유효한 데이터 찾기
        let prevIndex = -1;
        let nextIndex = -1;

        // 이전 유효 데이터 찾기
        for (let j = i - 1; j >= 0; j--) {
          if (result[j][valueKey] !== null && result[j][valueKey] !== undefined) {
            prevIndex = j;
            break;
          }
        }

        // 다음 유효 데이터 찾기
        for (let j = i + 1; j < result.length; j++) {
          if (result[j][valueKey] !== null && result[j][valueKey] !== undefined) {
            nextIndex = j;
            break;
          }
        }

        // 선형 보간 계산
        if (prevIndex !== -1 && nextIndex !== -1) {
          const prevValue = result[prevIndex][valueKey];
          const nextValue = result[nextIndex][valueKey];
          const ratio = (i - prevIndex) / (nextIndex - prevIndex);
          const interpolatedValue = prevValue + (nextValue - prevValue) * ratio;

          result[i] = {
            ...result[i],
            [valueKey]: Math.round(interpolatedValue * 10) / 10, // 소수점 1자리로 반올림
            isInterpolated: true // 보간된 데이터임을 표시
          };
        }
      }
    }

    return result;
  };

  // Recharts를 위한 데이터 가공
  const weeklyData = weeklyCalories.length > 0 ? weeklyCalories : [];
  const rawCalorieData = weeklyData.map((data: any) => ({
    name: data.day,
    '섭취 칼로리': data.has_data && (data.total_kcal || data.kcal) ? (data.total_kcal || data.kcal) : undefined,
    isToday: data.is_today,
  }));

  const rawWeightData = dashboardData?.weight_data?.weekly_weights?.map((day: any) => ({
    name: day.day,
    '체중(kg)': day.has_record && day.weight ? day.weight : undefined,
    isToday: day.is_today,
  })) || [];

  // 보간된 데이터 생성
  const chartCalorieData = interpolateData(rawCalorieData, '섭취 칼로리');
  const chartWeightData = interpolateData(rawWeightData, '체중(kg)');

  const recordedWeights = chartWeightData
    .map(d => d['체중(kg)'])
    .filter(w => w !== null) as number[];

  const weightDomain = recordedWeights.length > 0
    ? [Math.floor(Math.min(...recordedWeights) - 1), Math.ceil(Math.max(...recordedWeights) + 1)]
    : ['auto', 'auto'];

  // 커스텀 도트 컴포넌트 (실제 데이터와 보간 데이터 구분)
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;

    const isInterpolated = payload.isInterpolated;
    const isToday = payload.isToday;

    if (isInterpolated) {
      // 보간된 데이터는 작은 점선 원으로 표시
      return (
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill="none"
          stroke="#9CA3AF"
          strokeWidth={2}
          strokeDasharray="2,2"
          opacity={0.7}
        />
      );
    } else if (isToday) {
      // 오늘 데이터는 노란색으로 강조
      return (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="#F59E0B"
          stroke="#ffffff"
          strokeWidth={3}
          style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' }}
        />
      );
    } else {
      // 일반 실제 데이터
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={props.fill}
          stroke="#ffffff"
          strokeWidth={2}
        />
      );
    }
  };

  // 커스텀 툴팁 컴포넌트들
  const CustomCalorieTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      if (data.value === null) return null;

      const isInterpolated = data.payload?.isInterpolated;

      return (
        <div className="p-3 bg-gray-800/95 backdrop-blur-sm flex flex-col gap-1 rounded-xl border border-gray-700 shadow-xl">
          <p className="text-base font-bold text-white">{label}</p>
          <p style={{ color: data.color }} className="text-sm font-medium">
            섭취 칼로리: {data.value}kcal
            {isInterpolated && <span className="text-xs text-gray-400 ml-1">(추정)</span>}
          </p>
          {!isInterpolated && (
            <p className="text-xs text-gray-400">
              목표 대비 {Math.round((data.value / 2000) * 100)}%
            </p>
          )}
          {isInterpolated && (
            <p className="text-xs text-gray-500">
              앞뒤 데이터를 기반으로 추정된 값입니다
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomWeightTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      if (data.value === null) return null;

      const isInterpolated = data.payload?.isInterpolated;

      return (
        <div className="p-3 bg-gray-800/95 backdrop-blur-sm flex flex-col gap-1 rounded-xl border border-gray-700 shadow-xl">
          <p className="text-base font-bold text-white">{label}</p>
          <p style={{ color: data.color }} className="text-sm font-medium">
            체중: {data.value}kg
            {isInterpolated && <span className="text-xs text-gray-400 ml-1">(추정)</span>}
          </p>
          {isInterpolated && (
            <p className="text-xs text-gray-500">
              앞뒤 데이터를 기반으로 추정된 값입니다
            </p>
          )}
        </div>
      );
    }
    return null;
  };



  return (
    <>
      <UserInfo />
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl flex flex-col items-center justify-center space-y-6 animate-fade-in">
          {/* 
        <header className="w-full flex justify-between items-center">
          <h1 className="text-4xl font-black" style={{ color: 'var(--point-green)' }}>대시보드</h1>
          <button 
            onClick={handleReset} 
            className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105"
          >
            새 분석
          </button>
        </header>
        */}

          {/* 주간 칼로리 섭취량 */}
          <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">주간 칼로리 섭취량</h2>
                <p className="text-gray-400 text-sm">Recharts로 구현한 깔끔한 칼로리 섭취 그래프</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-400">
                  {chartCalorieData.filter(d => d['섭취 칼로리'] !== null).length}
                </div>
                <div className="text-xs text-gray-500">기록된 날</div>
              </div>
            </div>

            {chartCalorieData.some(d => d['섭취 칼로리'] !== null) ? (
              <div className="space-y-6">
                {/* 요약 통계 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {Math.round(
                        chartCalorieData
                          .filter(d => d['섭취 칼로리'] !== null)
                          .reduce((sum, d) => sum + (d['섭취 칼로리'] || 0), 0) /
                        chartCalorieData.filter(d => d['섭취 칼로리'] !== null).length
                      )}kcal
                    </div>
                    <div className="text-xs text-gray-400 mt-1">평균</div>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {Math.max(...chartCalorieData.filter(d => d['섭취 칼로리'] !== null).map(d => d['섭취 칼로리'] || 0))}kcal
                    </div>
                    <div className="text-xs text-gray-400 mt-1">최고</div>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-400">
                      {Math.min(...chartCalorieData.filter(d => d['섭취 칼로리'] !== null).map(d => d['섭취 칼로리'] || 0))}kcal
                    </div>
                    <div className="text-xs text-gray-400 mt-1">최저</div>
                  </div>
                </div>

                {/* Recharts 그래프 */}
                <div className="bg-gray-800/30 rounded-lg p-6">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartCalorieData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="colorCalorie" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="rgba(255, 255, 255, 0.1)"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          unit="kcal"
                        />
                        <Tooltip
                          content={<CustomCalorieTooltip />}
                          cursor={{
                            stroke: 'rgba(34, 197, 94, 0.5)',
                            strokeWidth: 2,
                            strokeDasharray: '5 5'
                          }}
                        />
                        <Legend
                          wrapperStyle={{
                            color: '#9CA3AF',
                            paddingTop: '20px',
                            fontSize: '14px'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="섭취 칼로리"
                          stroke="#22c55e"
                          fill="url(#colorCalorie)"
                          strokeWidth={3}
                          dot={<CustomDot fill="#22c55e" />}
                          activeDot={{
                            r: 8,
                            fill: '#22c55e',
                            stroke: '#ffffff',
                            strokeWidth: 3,
                            style: { filter: 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.6))' }
                          }}
                          connectNulls={true}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 범례 */}
                  <div className="flex justify-center items-center space-x-6 mt-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                      <span className="text-gray-300">실제 기록</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-dashed bg-transparent"></div>
                      <span className="text-gray-400">추정값</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-lg"></div>
                      <span className="text-yellow-400">오늘</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/30 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-white mb-2">칼로리 데이터를 불러오는 중...</h3>
                <p className="text-gray-400">식사 기록을 추가하면 그래프가 표시됩니다</p>
              </div>
            )}
          </div>

          {/* 주간 체중 변화 */}
          <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">주간 체중 변화</h2>
                <p className="text-gray-400 text-sm">Recharts로 구현한 깔끔한 체중 변화 그래프</p>
              </div>
              <div className="flex items-center space-x-4">
                {dashboardData?.weight_data?.latest_weight && (
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="text-center bg-gray-800/30 rounded-lg p-3">
                      <div className="text-gray-300 text-xs">최근 체중</div>
                      <div className="font-bold text-blue-400 text-lg">{dashboardData?.weight_data?.latest_weight}kg</div>
                    </div>
                    {dashboardData?.weight_data?.weight_change !== null && (
                      <div className="text-center bg-gray-800/30 rounded-lg p-3">
                        <div className="text-gray-300 text-xs">변화량</div>
                        <div className={`font-bold text-lg ${dashboardData?.weight_data?.weight_change > 0 ? 'text-red-400' :
                          dashboardData?.weight_data?.weight_change < 0 ? 'text-green-400' : 'text-gray-400'
                          }`}>
                          {dashboardData?.weight_data?.weight_change > 0 ? '+' : ''}{dashboardData?.weight_data?.weight_change}kg
                          {dashboardData?.weight_data?.weight_trend === 'increasing' ? ' ↗️' :
                            dashboardData?.weight_data?.weight_trend === 'decreasing' ? ' ↘️' : ' ➡️'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setIsWeightModalOpen(true)}
                  className="bg-[var(--point-green)] text-black font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105"
                >
                  기록하기
                </button>
              </div>
            </div>

            {dashboardData?.weight_data ? (
              <div className="space-y-6">
                {chartWeightData.some(d => d['체중(kg)'] !== null) ? (
                  <div className="bg-gray-800/30 rounded-lg p-6">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartWeightData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                        >
                          <defs>
                            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="rgba(255, 255, 255, 0.1)"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={weightDomain}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            unit="kg"
                          />
                          <Tooltip
                            content={<CustomWeightTooltip />}
                            cursor={{
                              stroke: 'rgba(59, 130, 246, 0.5)',
                              strokeWidth: 2,
                              strokeDasharray: '5 5'
                            }}
                          />
                          <Legend
                            wrapperStyle={{
                              color: '#9CA3AF',
                              paddingTop: '20px',
                              fontSize: '14px'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="체중(kg)"
                            stroke="#3b82f6"
                            fill="url(#colorWeight)"
                            strokeWidth={3}
                            dot={<CustomDot fill="#3b82f6" />}
                            activeDot={{
                              r: 8,
                              fill: '#3b82f6',
                              stroke: '#ffffff',
                              strokeWidth: 3,
                              style: { filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))' }
                            }}
                            connectNulls={true}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 범례 */}
                    <div className="flex justify-center items-center space-x-6 mt-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                        <span className="text-gray-300">실제 기록</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-dashed bg-transparent"></div>
                        <span className="text-gray-400">추정값</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-lg"></div>
                        <span className="text-yellow-400">오늘</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 체중 기록이 전혀 없는 경우 */
                  <div className="bg-gray-800/30 rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">⚖️</div>
                    <h3 className="text-xl font-bold text-white mb-2">체중 기록이 없습니다</h3>
                    <p className="text-gray-400 mb-6">기록하기 버튼을 눌러 체중을 기록해보세요!</p>
                    <button
                      onClick={() => setIsWeightModalOpen(true)}
                      className="bg-[var(--point-green)] text-black font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105"
                    >
                      첫 체중 기록하기
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-800/30 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">⚖️</div>
                <h3 className="text-xl font-bold text-white mb-2">체중 데이터를 불러오는 중...</h3>
                <p className="text-gray-400">잠시만 기다려주세요</p>
              </div>
            )}
          </div>

          {/* 최근 식사 기록 */}
          <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-left">최근 식사 기록</h2>
              <button
                onClick={handleReset}
                className="bg-[var(--point-green)] text-black font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105"
              >
                새 분석
              </button>
            </div>

            {recentMeals.length > 0 ? (
              <div className="space-y-3">
                {recentMeals.map((meal) => (
                  <div key={meal.id} className="flex items-center space-x-4 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                    {/* 이미지 */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                      {meal.imageUrl ? (
                        <img
                          src={meal.imageUrl}
                          alt={meal.foodName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center text-gray-500 text-xs ${meal.imageUrl ? 'hidden' : ''}`}>
                        🍽️
                      </div>
                    </div>

                    {/* 식사 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-white truncate">{meal.foodName}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${meal.nutriScore === 'A' ? 'bg-green-500' :
                          meal.nutriScore === 'B' ? 'bg-yellow-500' :
                            meal.nutriScore === 'C' ? 'bg-orange-500' : 'bg-red-500'
                          }`}>
                          {meal.nutriScore}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>{meal.date}</span>
                        <span>{
                          meal.mealType === 'breakfast' ? '🌅 아침' :
                            meal.mealType === 'lunch' ? '☀️ 점심' :
                              meal.mealType === 'dinner' ? '🌙 저녁' : '🍪 간식'
                        }</span>
                        <span>{meal.calories}kcal</span>
                      </div>
                    </div>

                    {/* 영양소 정보 */}
                    <div className="hidden md:flex space-x-4 text-sm">
                      <div className="text-center">
                        <p className="text-blue-400 font-medium">{meal.protein}g</p>
                        <p className="text-xs text-gray-500">단백질</p>
                      </div>
                      <div className="text-center">
                        <p className="text-yellow-400 font-medium">{meal.carbs}g</p>
                        <p className="text-xs text-gray-500">탄수화물</p>
                      </div>
                      <div className="text-center">
                        <p className="text-red-400 font-medium">{meal.fat}g</p>
                        <p className="text-xs text-gray-500">지방</p>
                      </div>
                    </div>

                    {/* 삭제 버튼 */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleDeleteMeal(meal.id, meal.foodName)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="식사 기록 삭제"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">🍽️</div>
                  <p>아직 식사 기록이 없습니다.</p>
                  <p className="text-sm">새 분석을 시작해보세요!</p>
                </div>
              </div>
            )}
          </div>

          <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6 text-left flex flex-col justify-center">
            <h2 className="text-xl font-bold mb-2">AI 분석</h2>
            <p className="text-sm text-gray-400 mb-4">AI로 나의 활동을 분석하고 조언을 받으세요.</p>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg transition-transform hover:scale-105"
            >
              주간 리포트
            </button>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6 text-left flex flex-col justify-center">
              <h2 className="text-xl font-bold mb-2">식단 캘린더</h2>
              <p className="text-sm text-gray-400 mb-4">과거에 먹은 식단을 날짜별로 확인해보세요.</p>
              <button
                onClick={handleGoToCalendar}
                className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg transition-transform hover:scale-105"
              >
                캘린더 보기
              </button>
            </div>

            <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6 text-left flex flex-col justify-center">
              <h2 className="text-xl font-bold mb-2">소셜 챌린지</h2>
              <p className="text-sm text-gray-400 mb-4">다른 사용자들과 함께 목표를 달성해보세요!</p>
              <button
                onClick={handleGoToChallenges}
                className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg transition-transform hover:scale-105"
              >
                모든 챌린지 보기
              </button>
            </div>
          </div>
        </div>

        <WeightRecordModal
          isOpen={isWeightModalOpen}
          onClose={() => setIsWeightModalOpen(false)}
          onSave={handleSaveWeight}
        />
        <WeeklyReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />

      </div>
    </>
  );
}