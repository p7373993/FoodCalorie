'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import WeightRecordModal from '@/components/ui/WeightRecordModal';
import WeeklyReportModal from '@/components/ui/WeeklyReportModal';
import UserInfo from '@/components/auth/UserInfo';
import AuthLoadingScreen from '@/components/ui/AuthLoadingScreen';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { apiClient } from '@/lib/api';
import { AICoachTip } from '@/components/dashboard/AICoachTip';
import { FoodRecommendations } from '@/components/dashboard/FoodRecommendations';
import { NutritionAnalysis } from '@/components/dashboard/NutritionAnalysis';


interface GamificationData {
  points: number;
  badges: string[];
}

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
  const [gamificationData, setGamificationData] = useState<GamificationData>({ points: 0, badges: [] });
  const [recentMeals, setRecentMeals] = useState<MealEntry[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [weeklyCalories, setWeeklyCalories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAICoachTip, setShowAICoachTip] = useState(true);



  // 대시보드 데이터 새로고침
  const refreshDashboard = async () => {
    setLoading(true);
    try {
      console.log('🔄 대시보드 데이터 새로고침...');

      // 대시보드 데이터 가져오기
      const dashboardResponse = await apiClient.getDashboardData();
      console.log('📊 새로고침된 대시보드 데이터:', dashboardResponse);
      setDashboardData(dashboardResponse);

      // 주간 칼로리 데이터 설정
      if (dashboardResponse.weekly_calories && dashboardResponse.weekly_calories.days) {
        setWeeklyCalories(dashboardResponse.weekly_calories.days);
      }

      // 최근 식사 기록 설정
      if (dashboardResponse.recent_meals) {
        setRecentMeals(dashboardResponse.recent_meals);
      }

      // 체중 데이터 가져오기
      const weightResponse = await apiClient.getWeightEntries();
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

      // 게임화 데이터 설정
      setGamificationData({
        points: dashboardResponse.today_stats?.total_calories || 0,
        badges: []
      });

    } catch (error) {
      console.error('❌ 대시보드 새로고침 실패:', error);
      setError('데이터 새로고침에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 자동 새로고침 (5분마다)
  useEffect(() => {
    if (!dataLoaded) return;

    const interval = setInterval(() => {
      console.log('🔄 자동 새로고침 실행');
      refreshDashboard();
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, [dataLoaded]);

  // 인증 확인 중이면 로딩 화면 표시
  if (isLoading || !canRender) {
    return <AuthLoadingScreen message="대시보드를 불러오고 있습니다..." />;
  }

  // 데이터 로딩 중일 때 스켈레톤 UI 표시
  if (loading && !dataLoaded) {
    return (
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-6">
          {/* 로딩 스켈레톤 */}
          <div className="bg-gray-800/60 rounded-2xl p-6 animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-gray-700 rounded"></div>
              <div className="h-20 bg-gray-700 rounded"></div>
              <div className="h-20 bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="bg-gray-800/60 rounded-2xl p-6 animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    return (
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">오류가 발생했습니다</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                refreshDashboard();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.push('/upload')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              식사 기록하기
            </button>
          </div>
        </div>
      </div>
    );
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

        // 게임화 데이터 설정
        setGamificationData({
          points: dashboardResponse.today_stats?.total_calories || 0,
          badges: []
        });

      } catch (error) {
        console.error('❌ 대시보드 데이터 로드 실패:', error);
        setError('대시보드 데이터를 불러오는데 실패했습니다. 새로고침을 시도해보세요.');
      } finally {
        setLoading(false);
        setDataLoaded(true);
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

  // 메모이제이션된 계산값들
  const { weeklyData, validCalories, maxKcal, todayNutrition } = useMemo(() => {
    const data = weeklyCalories.length > 0 ? weeklyCalories : [];
    const valid = data
      .map(d => d.total_kcal || d.kcal || 0)
      .filter(cal => cal > 0);

    const actualMax = valid.length > 0 ? Math.max(...valid) : 0;
    const max = Math.max(dashboardData?.user_goals?.daily_calories || 2000, actualMax);

    const nutrition = {
      carbs: recentMeals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
      protein: recentMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
      fat: recentMeals.reduce((sum, meal) => sum + (meal.fat || 0), 0),
      calories: recentMeals.reduce((sum, meal) => sum + meal.calories, 0)
    };

    return {
      weeklyData: data,
      validCalories: valid,
      maxKcal: max,
      todayNutrition: nutrition
    };
  }, [weeklyCalories, recentMeals, dashboardData]);

  // 디버깅용 로그
  console.log('📊 주간 데이터:', weeklyData);
  console.log('📊 유효한 칼로리:', validCalories);
  console.log('📊 실제 최대값:', actualMax);
  console.log('📊 사용할 최대값:', maxKcal);

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
          <div className="w-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">주간 칼로리 섭취량</h2>
                <p className="text-gray-200 text-sm">이번 주 식사 기록을 한눈에 확인하세요</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-400">
                  {weeklyData.filter(d => d.has_data).length}
                </div>
                <div className="text-xs text-gray-200">기록된 날</div>
              </div>
            </div>

            {weeklyData.length > 0 ? (
              <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                {/* 요약 통계 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 sm:p-4 text-center shadow-lg">
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">
                      {validCalories.length > 0 ? Math.round(validCalories.reduce((sum, cal) => sum + cal, 0) / validCalories.length) : 0}kcal
                    </div>
                    <div className="text-xs text-white mt-1">평균</div>
                  </div>
                  <div className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 sm:p-4 text-center shadow-lg">
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-400">
                      {validCalories.length > 0 ? Math.max(...validCalories) : 0}kcal
                    </div>
                    <div className="text-xs text-white mt-1">최고</div>
                  </div>
                  <div className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 sm:p-4 text-center shadow-lg">
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-400">
                      {validCalories.length > 0 ? Math.min(...validCalories) : 0}kcal
                    </div>
                    <div className="text-xs text-white mt-1">최저</div>
                  </div>
                </div>

                {/* 막대그래프 */}
                <div className="h-32 sm:h-48 lg:h-64">
                  <div className="flex justify-between items-end h-full space-x-3 pb-12">
                    {weeklyData.map((data, index) => {
                      const calories = data.total_kcal || data.kcal || 0;

                      // 디버깅용 로그
                      console.log(`📊 ${data.day}: ${calories}kcal, has_data: ${data.has_data}, maxKcal: ${maxKcal}`);

                      // 반응형 픽셀 기반 높이 계산 (라벨 공간 고려)
                      let barHeightPx = 8; // 최소 높이
                      if (data.has_data && calories > 0) {
                        const percentage = (calories / maxKcal) * 100;
                        // 화면 크기에 따른 높이 조정 (라벨 공간 48px 제외)
                        const containerHeight = window.innerWidth < 640 ? 80 : window.innerWidth < 1024 ? 144 : 208; // h-32-48, h-48-48, h-64-48
                        barHeightPx = Math.max(8, (percentage / 100) * containerHeight);
                        console.log(`📊 ${data.day} 막대 높이: ${barHeightPx}px (${percentage.toFixed(1)}%)`);
                      }

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end group relative">
                          {/* 막대 */}
                          <div
                            className={`w-full rounded-t-lg transition-all duration-700 cursor-pointer relative overflow-hidden ${data.has_data
                              ? (data.is_today
                                ? 'bg-gradient-to-t from-yellow-500 to-yellow-400 shadow-lg shadow-yellow-500/25'
                                : 'bg-gradient-to-t from-green-500 to-green-400 shadow-lg shadow-green-500/25')
                              : 'bg-gray-700/30'
                              }`}
                            style={{
                              height: `${barHeightPx}px`
                            }}
                          >
                            {/* 호버 효과 */}
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            {/* 툴팁 */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 bg-gray-900/95 backdrop-blur-sm text-white text-sm rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 whitespace-nowrap pointer-events-none border border-gray-700/50">
                              <div className="text-center">
                                <div className="font-bold text-lg mb-1">{data.day}</div>
                                <div className="text-2xl font-bold text-green-400 mb-1">
                                  {data.has_data ? `${calories}kcal` : '기록 없음'}
                                </div>
                                {data.has_data && (
                                  <div className="text-xs text-gray-400">
                                    목표 대비 {Math.round((calories / (dashboardData?.user_goals?.daily_calories || 2000)) * 100)}%
                                  </div>
                                )}
                              </div>
                              {/* 화살표 */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95"></div>
                            </div>
                          </div>

                          {/* 요일 라벨 */}
                          <div className="mt-3 text-center absolute bottom-0">
                            <div className={`text-sm font-semibold ${data.is_today ? 'text-yellow-400' : 'text-white'}`}>
                              {data.day}
                            </div>
                            <div className={`text-xs mt-1 font-medium ${data.has_data ? 'text-white' : 'text-gray-500'}`}>
                              {data.has_data ? `${calories}kcal` : '기록 없음'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-lg font-medium mb-2">주간 칼로리 데이터를 불러오는 중...</p>
                  <p className="text-sm">식사 기록을 추가하면 그래프가 표시됩니다.</p>
                </div>
              </div>
            )}
          </div>

          {/* 주간 체중 변화 */}
          <div className="w-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 min-h-[420px] shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-left text-white">주간 체중 변화</h2>
              <div className="flex items-center space-x-4">
                {dashboardData?.weight_data?.latest_weight && (
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="text-center">
                      <div className="text-gray-300">최근 체중</div>
                      <div className="font-bold text-blue-400">{dashboardData?.weight_data?.latest_weight}kg</div>
                    </div>
                    {dashboardData?.weight_data?.weight_change !== null && (
                      <div className="text-center">
                        <div className="text-gray-300">변화량</div>
                        <div className={`font-bold ${dashboardData?.weight_data?.weight_change > 0 ? 'text-red-400' :
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
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all hover:scale-105 shadow-lg"
                >
                  기록하기
                </button>
              </div>
            </div>
            {dashboardData?.weight_data ? (
              <div className="space-y-4">
                {/* 체중 선그래프 */}
                <div className="h-64 relative">
                  {dashboardData?.weight_data?.weekly_weights?.some((day: any) => day.has_record) ? (
                    <div className="relative h-full">
                      {/* Y축 눈금 */}
                      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-gray-500 w-24">
                        {(() => {
                          const recordedWeights = dashboardData?.weight_data?.weekly_weights
                            ?.filter((d: any) => d.has_record && d.weight)
                            ?.map((d: any) => d.weight) || [];

                          if (recordedWeights.length === 0) return null;

                          const avgWeight = recordedWeights.reduce((sum, w) => sum + w, 0) / recordedWeights.length;
                          const minWeight = avgWeight - 2; // 평균 -2kg
                          const maxWeight = avgWeight + 2; // 평균 +2kg

                          return [4, 3, 2, 1, 0].map((i) => {
                            const weight = minWeight + ((maxWeight - minWeight) / 4) * i;
                            return (
                              <div key={i} className="flex items-center">
                                <span className="text-right pr-2 text-[10px] leading-none">{weight.toFixed(1)}kg</span>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* 선그래프 영역 */}
                      <div className="ml-24 h-full pr-4">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          {/* 그리드 라인 */}
                          <defs>
                            <pattern id="grid" width="16.67" height="20" patternUnits="userSpaceOnUse">
                              <path d="M 16.67 0 L 0 0 0 20" fill="none" stroke="rgba(75, 85, 99, 0.2)" strokeWidth="0.5" />
                            </pattern>
                          </defs>
                          <rect width="100" height="100" fill="url(#grid)" />

                          {/* 선그래프 */}
                          <polyline
                            fill="none"
                            stroke="url(#weightGradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={(() => {
                              const recordedWeights = dashboardData?.weight_data?.weekly_weights
                                ?.filter((d: any) => d.has_record && d.weight)
                                ?.map((d: any) => d.weight) || [];

                              if (recordedWeights.length === 0) return "";

                              const avgWeight = recordedWeights.reduce((sum, w) => sum + w, 0) / recordedWeights.length;
                              const minWeight = avgWeight - 2; // 평균 -2kg
                              const maxWeight = avgWeight + 2; // 평균 +2kg
                              const range = maxWeight - minWeight;

                              return dashboardData?.weight_data?.weekly_weights
                                ?.map((day: any, index: number) => {
                                  if (!day.has_record && !day.has_approximate || !day.weight) return null;

                                  const x = (index / 6) * 83.33 + 8.33; // 7일을 83.33%로, 8.33% 여백
                                  const y = range > 0 ? 100 - ((day.weight - minWeight) / range) * 80 : 50; // 80% 높이 사용

                                  return `${x},${y}`;
                                })
                                .filter(Boolean)
                                .join(" ");
                            })()}
                          />

                          {/* 그라데이션 정의 */}
                          <defs>
                            <linearGradient id="weightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#3B82F6" />
                              <stop offset="50%" stopColor="#10B981" />
                              <stop offset="100%" stopColor="#F59E0B" />
                            </linearGradient>
                          </defs>

                          {/* 데이터 포인트 */}
                          {dashboardData?.weight_data?.weekly_weights?.map((day: any, index: number) => {
                            if (!day.has_record && !day.has_approximate || !day.weight) return null;

                            const recordedWeights = dashboardData?.weight_data?.weekly_weights
                              ?.filter((d: any) => d.has_record && d.weight)
                              ?.map((d: any) => d.weight) || [];

                            if (recordedWeights.length === 0) return null;

                            const avgWeight = recordedWeights.reduce((sum, w) => sum + w, 0) / recordedWeights.length;
                            const minWeight = avgWeight - 2; // 평균 -2kg
                            const maxWeight = avgWeight + 2; // 평균 +2kg
                            const range = maxWeight - minWeight;

                            const x = (index / 6) * 83.33 + 8.33;
                            const y = range > 0 ? 100 - ((day.weight - minWeight) / range) * 80 : 50; // 80% 높이 사용

                            return (
                              <circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="4"
                                fill={day.is_today ? "#F59E0B" : "#3B82F6"}
                                stroke="white"
                                strokeWidth="2"
                                className="cursor-pointer hover:r-5 transition-all duration-200"
                              />
                            );
                          })}
                        </svg>

                        {/* X축 라벨 */}
                        <div className="flex justify-between mt-6 space-x-1">
                          {dashboardData?.weight_data?.weekly_weights?.map((day: any, index: number) => (
                            <div key={index} className="text-center flex-1 min-w-0">
                              <div className={`text-xs font-medium ${day.is_today ? 'text-yellow-400' : 'text-gray-300'}`}>
                                {day.day}
                              </div>
                              {(day.has_record || day.has_approximate) && day.weight && (
                                <div className="text-xs text-gray-400 mt-2 truncate">
                                  {day.weight}kg
                                  {day.has_approximate && <span className="text-gray-500">*</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 체중 기록이 전혀 없는 경우 */
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-4xl mb-2">⚖️</div>
                        <p>체중 기록이 없습니다.</p>
                        <p className="text-sm">기록하기 버튼을 눌러 체중을 기록해보세요!</p>
                      </div>
                    </div>
                  )}
                </div>


              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">⚖️</div>
                  <p>체중 데이터를 불러오는 중...</p>
                </div>
              </div>
            )}
          </div>

          {/* 최근 식사 기록 */}
          <div className="w-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-left text-white">최근 식사 기록</h2>
              <div className="flex space-x-2">
                <button
                  onClick={refreshDashboard}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all hover:scale-105 shadow-lg disabled:opacity-50"
                >
                  {loading ? '🔄' : '새로고침'}
                </button>
                <button
                  onClick={handleReset}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all hover:scale-105 shadow-lg"
                >
                  새 분석
                </button>
              </div>
            </div>

            {recentMeals.length > 0 ? (
              <div className="space-y-3">
                {recentMeals.map((meal) => (
                  <div key={meal.id} className="flex items-center space-x-4 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group">
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
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${meal.nutriScore === 'A' ? 'bg-green-500' :
                          meal.nutriScore === 'B' ? 'bg-yellow-500' :
                            meal.nutriScore === 'C' ? 'bg-orange-500' : 'bg-red-500'
                          }`}>
                          {meal.nutriScore}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-300">
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
                        <p className="text-xs text-gray-400">단백질</p>
                      </div>
                      <div className="text-center">
                        <p className="text-yellow-400 font-medium">{meal.carbs}g</p>
                        <p className="text-xs text-gray-400">탄수화물</p>
                      </div>
                      <div className="text-center">
                        <p className="text-red-400 font-medium">{meal.fat}g</p>
                        <p className="text-xs text-gray-400">지방</p>
                      </div>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={async () => {
                        if (confirm(`${meal.foodName}을(를) 삭제하시겠습니까?`)) {
                          try {
                            await apiClient.deleteMeal(meal.id);
                            // 성공적으로 삭제되면 목록에서 제거
                            setRecentMeals(prev => prev.filter(m => m.id !== meal.id));
                            alert('식사 기록이 삭제되었습니다.');

                            // 대시보드 데이터 새로고침
                            const dashboardResponse = await apiClient.getDashboardData();
                            setDashboardData(dashboardResponse);
                            if (dashboardResponse.weekly_calories && dashboardResponse.weekly_calories.days) {
                              setWeeklyCalories(dashboardResponse.weekly_calories.days);
                            }
                          } catch (error) {
                            console.error('식사 기록 삭제 실패:', error);
                            alert('식사 기록 삭제에 실패했습니다.');
                          }
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                      aria-label="삭제"
                    >
                      🗑️
                    </button>
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

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="w-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 text-left flex flex-col justify-center shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-white">📈 나의 활동 통계</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-200">총 기록 일수</span>
                  <span className="text-2xl font-bold text-green-400">
                    {dashboardData?.total_record_days || recentMeals.length}일
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-200">평균 일일 칼로리</span>
                  <span className="text-2xl font-bold text-blue-400">
                    {dashboardData?.weekly_stats?.avg_calories || 0}kcal
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-200">건강 점수</span>
                  <span className="text-2xl font-bold text-purple-400">
                    {dashboardData?.health_score || 0}점
                  </span>
                </div>
                <div className="pt-2">
                  <p className="font-bold mb-2 text-white">🏆 달성 배지</p>
                  <div className="flex space-x-2">
                    {recentMeals.length >= 5 && <span title="꾸준한 기록" className="text-2xl">📝</span>}
                    {recentMeals.filter(m => m.nutriScore === 'A').length >= 3 && <span title="건강한 선택" className="text-2xl">🥗</span>}
                    {recentMeals.length >= 10 && <span title="식단 마스터" className="text-2xl">👑</span>}
                    {recentMeals.length === 0 && (
                      <p className="text-sm text-gray-200">식사를 기록하면 배지를 획득할 수 있어요!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 text-left flex flex-col justify-center shadow-2xl">
              <h2 className="text-xl font-bold mb-2 text-white">AI 분석</h2>
              <p className="text-sm text-gray-200 mb-4">AI로 나의 활동을 분석하고 조언을 받으세요.</p>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all hover:scale-105 shadow-lg"
              >
                주간 리포트
              </button>
            </div>
          </div>

          {/* 영양소 분석 섹션 */}
          <div className="w-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">📊 오늘의 영양소 분석</h2>
            {dashboardData && recentMeals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/60 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {todayNutrition.carbs.toFixed(1)}g
                  </div>
                  <div className="text-sm text-gray-200">탄수화물</div>
                  <div className="text-xs text-gray-400 mt-1">
                    권장량: {dashboardData?.nutrition_goals?.carbs || 300}g
                  </div>
                  <div className="text-xs text-green-400 mt-1">
                    {Math.round((todayNutrition.carbs / (dashboardData?.nutrition_goals?.carbs || 300)) * 100)}% 달성
                  </div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {todayNutrition.protein.toFixed(1)}g
                  </div>
                  <div className="text-sm text-gray-200">단백질</div>
                  <div className="text-xs text-gray-400 mt-1">
                    권장량: {dashboardData?.nutrition_goals?.protein || 60}g
                  </div>
                  <div className="text-xs text-green-400 mt-1">
                    {Math.round((todayNutrition.protein / (dashboardData?.nutrition_goals?.protein || 60)) * 100)}% 달성
                  </div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-2xl font-bold text-orange-400 mb-1">
                    {todayNutrition.fat.toFixed(1)}g
                  </div>
                  <div className="text-sm text-gray-200">지방</div>
                  <div className="text-xs text-gray-400 mt-1">
                    권장량: {dashboardData?.nutrition_goals?.fat || 65}g
                  </div>
                  <div className="text-xs text-green-400 mt-1">
                    {Math.round((todayNutrition.fat / (dashboardData?.nutrition_goals?.fat || 65)) * 100)}% 달성
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">📊</div>
                <p>오늘의 식사를 기록하면 영양소 분석을 볼 수 있어요!</p>
              </div>
            )}
          </div>

          {/* 개인 목표 설정 섹션 */}
          <div className="w-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">🎯 나의 건강 목표</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/60 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">일일 칼로리 목표</h3>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold text-green-400">
                    {dashboardData?.user_goals?.daily_calories || 2000}
                  </div>
                  <div className="text-sm text-gray-200">kcal</div>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  오늘 섭취: {todayNutrition.calories}kcal
                  <span className="ml-2">
                    ({Math.round((todayNutrition.calories / (dashboardData?.user_goals?.daily_calories || 2000)) * 100)}%)
                  </span>
                </div>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">주간 운동 목표</h3>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold text-blue-400">
                    {dashboardData?.user_goals?.weekly_exercise || 5}
                  </div>
                  <div className="text-sm text-gray-200">일</div>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  이번 주 달성: {Math.min(weeklyData.filter(d => d.has_data).length, dashboardData?.user_goals?.weekly_exercise || 5)}일
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 text-center hover:bg-green-500/30 transition-colors">
                <div className="text-sm text-white font-medium">체중 감량</div>
              </button>
              <button className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-2 text-center hover:bg-blue-500/30 transition-colors">
                <div className="text-sm text-white font-medium">근육 증가</div>
              </button>
              <button className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-2 text-center hover:bg-purple-500/30 transition-colors">
                <div className="text-sm text-white font-medium">건강 유지</div>
              </button>
            </div>
          </div>

          {/* 빠른 액션 버튼들 */}
          <div className="w-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">⚡ 빠른 액션</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => router.push('/upload')}
                className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center hover:bg-green-500/30 transition-colors group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📸</div>
                <div className="text-sm text-white font-medium">식사 기록</div>
              </button>
              <button
                onClick={() => setIsWeightModalOpen(true)}
                className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 text-center hover:bg-blue-500/30 transition-colors group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">⚖️</div>
                <div className="text-sm text-white font-medium">체중 기록</div>
              </button>
              <button
                onClick={() => router.push('/calendar')}
                className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 text-center hover:bg-purple-500/30 transition-colors group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📅</div>
                <div className="text-sm text-white font-medium">캘린더</div>
              </button>
              <button
                onClick={() => router.push('/statistics')}
                className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4 text-center hover:bg-orange-500/30 transition-colors group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
                <div className="text-sm text-white font-medium">통계</div>
              </button>
            </div>
          </div>

          {/* AI 코칭 섹션 */}
          {showAICoachTip && (
            <AICoachTip onClose={() => setShowAICoachTip(false)} />
          )}



          {/* AI 기능 카드들 */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FoodRecommendations className="lg:col-span-1" />
            <NutritionAnalysis className="lg:col-span-2" />
          </div>

          {/* AI 추천 버튼 */}
          <div className="w-full text-center">
            <button
              onClick={() => setIsAIRecommendationOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-8 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
            >
              🤖 AI 맞춤 추천 더보기
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