'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WeightRecordModal from '@/components/ui/WeightRecordModal';
import WeeklyReportModal from '@/components/ui/WeeklyReportModal';
import AdvancedInsightModal from '@/components/ui/AdvancedInsightModal';
import UserInfo from '@/components/auth/UserInfo';
import AuthLoadingScreen from '@/components/ui/AuthLoadingScreen';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { apiClient } from '@/lib/api';
import WeightChart from '@/components/charts/WeightChart';

interface GamificationData {
  points: number;
  badges: string[];
}

interface WeightEntry {
  day: string;
  date: string;
  weight: number | null;
  has_record: boolean;
  is_today: boolean;
}

interface CalorieEntry {
  day: string;
  date: string;
  total_kcal: number;
  is_today: boolean;
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

interface DashboardData {
  weekly_calories: {
    days: CalorieEntry[];
    total_week_calories: number;
    avg_daily_calories: number;
    chart_max: number;
  };
  weight_data: {
    weekly_weights: WeightEntry[];
    latest_weight: number | null;
    weight_change: number | null;
    weight_change_period: string | null;
    weight_trend: string;
  };
  recent_meals: MealEntry[];
  today_stats: {
    total_calories: number;
    meal_count: number;
  };
  user_info: {
    username: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { canRender, isLoading } = useRequireAuth();
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);

  const [gamificationData, setGamificationData] = useState<GamificationData>({ points: 0, badges: [] });
  const [recentMeals, setRecentMeals] = useState<MealEntry[]>([]);

  // 대시보드 데이터 상태
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [weeklyCalories, setWeeklyCalories] = useState<CalorieEntry[]>([]);
  const [weeklyWeights, setWeeklyWeights] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 인증 확인 중이면 로딩 화면 표시
  if (isLoading || !canRender) {
    return <AuthLoadingScreen message="대시보드를 불러오고 있습니다..." />;
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 대시보드 데이터 로드 함수
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 대시보드 데이터 로딩 시작...');

      const response = await apiClient.getDashboardData() as DashboardData;
      console.log('📊 API 응답:', response);

      setDashboardData(response);

      // 주간 칼로리 데이터 설정
      if (response.weekly_calories?.days) {
        setWeeklyCalories(response.weekly_calories.days);
        console.log('📈 주간 칼로리 데이터:', response.weekly_calories.days);
      }

      // 체중 데이터 설정
      if (response.weight_data?.weekly_weights) {
        setWeeklyWeights(response.weight_data.weekly_weights);
        console.log('⚖️ 주간 체중 데이터:', response.weight_data.weekly_weights);
      }

      // 최근 식사 기록 설정
      if (response.recent_meals) {
        setRecentMeals(response.recent_meals);
      }

      // 게임화 데이터 설정
      setGamificationData({
        points: response.today_stats?.total_calories || 0,
        badges: []
      });

    } catch (error) {
      console.error('❌ 대시보드 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 체중 저장 핸들러 (검증 로직 추가)
  const handleSaveWeight = async (weight: string) => {
    if (!weight) return;

    const weightValue = parseFloat(weight);

    // 체중 입력값 검증 (30kg ~ 200kg)
    if (weightValue < 30 || weightValue > 200) {
      alert('체중은 30kg에서 200kg 사이의 값을 입력해주세요.');
      return;
    }

    try {
      console.log('💾 체중 저장 시작:', weightValue);

      const response = await apiClient.createWeightEntry(weightValue);
      console.log('✅ 체중 저장 성공:', response);

      alert(`${weightValue}kg 체중이 기록되었습니다!`);

      // 대시보드 데이터 새로고침
      await loadDashboardData();
      setIsWeightModalOpen(false);
    } catch (e) {
      console.error("Error saving weight: ", e);
      alert('체중 저장 중 오류가 발생했습니다.');
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

  // 칼로리 분류 함수
  const getCalorieCategory = (calories: number) => {
    if (calories === 0) return 'none';
    if (calories < 1500) return 'low';
    if (calories > 2500) return 'high';
    return 'normal';
  };

  // 칼로리 카테고리별 색상 및 라벨
  const getCalorieStyle = (category: string, isToday: boolean) => {
    const styles = {
      none: {
        color: 'bg-gray-500',
        label: '기록없음',
        textColor: 'text-gray-400'
      },
      low: {
        color: 'bg-gradient-to-t from-yellow-600 to-yellow-400',
        label: '부족',
        textColor: 'text-yellow-400'
      },
      normal: {
        color: 'bg-gradient-to-t from-green-600 to-green-400',
        label: '정상',
        textColor: 'text-green-400'
      },
      high: {
        color: 'bg-gradient-to-t from-red-600 to-red-400',
        label: '과다',
        textColor: 'text-red-400'
      }
    };

    const style = styles[category as keyof typeof styles] || styles.none;

    if (isToday && category !== 'none') {
      return {
        ...style,
        color: style.color + ' shadow-lg ring-2 ring-white/20',
        textColor: 'text-white font-bold'
      };
    }

    return style;
  };

  // 실제 API 데이터 사용 - 요일 순서를 목금토일월화수로 재정렬
  const dayOrder = ['목', '금', '토', '일', '월', '화', '수'];
  const weeklyData = weeklyCalories.length > 0
    ? dayOrder.map(day => weeklyCalories.find(data => data.day === day) || { day, date: '', total_kcal: 0, is_today: false })
    : [];

  // 체중 데이터도 같은 순서로 재정렬
  const orderedWeights = weeklyWeights.length > 0
    ? dayOrder.map(day => weeklyWeights.find(data => data.day === day) || { day, date: '', weight: null, has_record: false, is_today: false })
    : [];

  // 체중 차트 설정 상수
  const WEIGHT_CONFIG = {
    MIN_VALID_WEIGHT: 30,
    MAX_VALID_WEIGHT: 200,
    CHART_PADDING: 0.1,
    MIN_RANGE: 0.8,
    HEIGHT_MIN: 20,
    HEIGHT_MAX: 80,
    HEIGHT_SCALE: 60
  };

  console.log('🔍 렌더링 데이터:', {
    weeklyData,
    dashboardData: dashboardData?.weekly_calories
  });

  return (
    <React.Fragment>
      <UserInfo />
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl flex flex-col items-center justify-center space-y-6 animate-fade-in">

          {/* 📊 깔끔한 칼로리 차트 - 선 없이 0부터 시작 */}
          <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-left">주간 칼로리 섭취량</h2>
              <div className="text-right text-sm">
                {dashboardData && (
                  <>
                    <div className="text-gray-300">
                      주간 총합: <span className="text-green-400 font-bold text-lg">{dashboardData.weekly_calories?.total_week_calories?.toLocaleString() || 0}</span>kcal
                    </div>
                    <div className="text-gray-300">
                      일평균: <span className="text-blue-400 font-bold text-lg">{dashboardData.weekly_calories?.avg_daily_calories?.toLocaleString() || 0}</span>kcal
                    </div>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
              </div>
            ) : weeklyData.length > 0 ? (
              <div className="relative bg-gray-900/20 rounded-xl p-4">
                {/* 📊 깔끔한 차트 - 기준선 없이 0부터 시작 */}
                <div className="grid grid-cols-7 gap-3 h-64 items-end relative">
                  {weeklyData.map((data, index) => {
                    const category = getCalorieCategory(data.total_kcal);
                    const style = getCalorieStyle(category, data.is_today);

                    // 🧮 실제 데이터 기준으로 높이 계산 (0부터 시작)
                    const maxCalories = Math.max(...weeklyData.map(d => d.total_kcal), 2500);
                    const heightPercent = data.total_kcal > 0
                      ? Math.max(3, (data.total_kcal / maxCalories) * 100)
                      : 0;

                    console.log(`📊 ${data.day}: ${data.total_kcal}kcal = ${heightPercent.toFixed(1)}% 높이 (최대: ${maxCalories})`);

                    return (
                      <div key={index} className="flex flex-col h-full group relative">
                        {/* 📊 막대 영역 - 완전히 0부터 시작 */}
                        <div className="w-full h-full flex items-end justify-center relative">
                          {data.total_kcal > 0 ? (
                            <div
                              className={`w-full ${style.color} rounded-t-lg transition-all duration-700 hover:brightness-110 relative shadow-lg`}
                              style={{
                                height: `${heightPercent}%`,
                                animationDelay: `${index * 100}ms`
                              }}
                            >

                            </div>
                          ) : (
                            /* ❌ 데이터 없음 - 아주 작은 회색 막대 */
                            <div className="w-full h-1 bg-gray-600/30 rounded-full"></div>
                          )}
                        </div>

                        {/* 🏷️ 하단 라벨 - 통일된 높이 */}
                        <div className="mt-3 text-center w-full h-16 flex flex-col justify-start">
                          <div className={`text-sm font-bold ${data.is_today ? 'text-green-400' : 'text-gray-300'}`}>
                            {data.day}
                          </div>
                          {data.is_today && (
                            <div className="text-xs text-green-400 font-bold animate-pulse">오늘</div>
                          )}
                          <div className={`text-xs mt-1 font-medium ${style.textColor}`}>
                            {style.label}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {data.total_kcal > 0 ? `${data.total_kcal.toLocaleString()}` : '0'}
                          </div>
                        </div>

                        {/* 🎈 호버 툴팁 */}
                        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 whitespace-nowrap pointer-events-none">
                          <div className="font-bold text-center">{data.day}요일</div>
                          <div className="text-center">{data.total_kcal.toLocaleString()}kcal</div>
                          <div className={`text-center font-bold ${style.textColor}`}>{style.label}</div>
                          {/* 툴팁 화살표 */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 📋 범례 - 더 명확하게 */}
                <div className="flex justify-center mt-8 space-x-8 text-sm bg-gray-800/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-t from-green-600 to-green-400 rounded shadow-sm"></div>
                    <span className="font-medium">정상 (1500-2500kcal)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded shadow-sm"></div>
                    <span className="font-medium">부족 (&lt;1500kcal)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-t from-red-600 to-red-400 rounded shadow-sm"></div>
                    <span className="font-medium">과다 (&gt;2500kcal)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-lg">칼로리 데이터가 없습니다</p>
                  <p className="text-sm">식사를 기록해보세요!</p>
                </div>
              </div>
            )}
          </div>
          {/* 주간 체중 변화 - 검증 로직 추가 */}
          <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-left">주간 체중 변화</h2>
              <div className="flex items-center space-x-4">
                {dashboardData?.weight_data && (
                  <div className="text-right text-sm">
                    <div className="text-gray-300">
                      현재: <span className="text-green-400 font-bold text-lg">{dashboardData.weight_data.latest_weight?.toFixed(1) || 'N/A'}</span>kg
                    </div>
                    {dashboardData.weight_data.weight_change !== null && dashboardData.weight_data.weight_change_period && (
                      <div className={`${dashboardData.weight_data.weight_change > 0 ? 'text-red-400' :
                        dashboardData.weight_data.weight_change < 0 ? 'text-blue-400' : 'text-gray-400'
                        }`}>
                        {dashboardData.weight_data.weight_change_period}: {dashboardData.weight_data.weight_change > 0 ? '+' : ''}{dashboardData.weight_data.weight_change?.toFixed(1)}kg
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setIsWeightModalOpen(true)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  기록하기
                </button>
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
              </div>
            ) : orderedWeights.length > 0 ? (
              <WeightChart weights={orderedWeights} />
                // �  전체 데이터 기준으로 한 번만 범위 계산
                const validWeights = orderedWeights
                  .filter(w => w.weight !== null && w.weight >= 30 && w.weight <= 200)
                  .map(w => w.weight!);

                if (validWeights.length === 0) {
                  return (
                    <div className="h-64 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-6xl mb-4">⚖️</div>
                        <p className="text-lg">체중 기록이 없습니다</p>
                        <p className="text-sm">체중을 기록해보세요!</p>
                      </div>
                    </div>
                  );
                }

                // 체중 변화를 더 잘 보이게 하기 위해 범위를 좁게 설정
                const minWeight = Math.min(...validWeights) - 0.1;
                const maxWeight = Math.max(...validWeights) + 0.1;
                const weightRange = Math.max(maxWeight - minWeight, 0.8); // 최소 0.8kg 범위 보장

                console.log(`📊 체중 범위: ${minWeight.toFixed(1)}kg ~ ${maxWeight.toFixed(1)}kg (범위: ${weightRange.toFixed(1)}kg)`);

                return (
                  <div className="relative bg-gray-900/20 rounded-xl p-4">
                    {/* 📊 깔끔한 체중 차트 - 목금토일월화수 순서, 포인트만 표시 */}
                    <div className="grid grid-cols-7 gap-3 h-64 items-end relative">
                      {orderedWeights.map((weightData, index) => {
                        const hasWeight = weightData.weight !== null && weightData.weight > 0;
                        const weight = weightData.weight || 0;

                        // 체중 검증 (비정상적인 값 필터링)
                        const isValidWeight = hasWeight && weight >= 30 && weight <= 200;

                        if (!isValidWeight) {
                          return (
                            <div key={index} className="flex flex-col h-full group relative">
                              <div className="w-full h-full flex items-end justify-center relative">
                                <div className="w-full h-1 bg-gray-600/30 rounded-full"></div>
                              </div>
                              <div className="mt-3 text-center w-full h-16 flex flex-col justify-start">
                                <div className={`text-sm font-bold ${weightData.is_today ? 'text-green-400' : 'text-gray-300'}`}>
                                  {weightData.day}
                                </div>
                                {weightData.is_today && (
                                  <div className="text-xs text-green-400 font-bold animate-pulse">오늘</div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">기록없음</div>
                              </div>
                            </div>
                          );
                        }

                        // 전체 범위 기준으로 높이 계산
                        const heightPercent = Math.max(20, Math.min(80, ((weight - minWeight) / weightRange) * 60 + 20));

                        console.log(`⚖️ ${weightData.day}: ${weight}kg -> ${heightPercent.toFixed(1)}% 높이`);

                        return (
                          <div key={index} className="flex flex-col h-full group relative">
                            {/* 📊 체중 포인트 영역 */}
                            <div className="w-full h-full flex items-end justify-center relative">
                              {isValidWeight ? (
                                <div
                                  className="w-full flex justify-center relative"
                                  style={{ height: `${heightPercent}%` }}
                                >
                                  {/* 체중 포인트 */}
                                  <div
                                    className={`w-6 h-6 rounded-full border-2 shadow-lg transition-all duration-700 hover:scale-110 ${weightData.is_today
                                      ? 'bg-green-400 border-green-200 ring-2 ring-white/30 animate-pulse'
                                      : 'bg-blue-500 border-blue-300'
                                      }`}
                                    style={{
                                      position: 'absolute',
                                      bottom: '0',
                                      animationDelay: `${index * 100}ms`
                                    }}
                                  />


                                </div>
                              ) : (
                                /* 기록 없음 또는 비정상 값 */
                                <div className="w-full h-1 bg-gray-600/30 rounded-full"></div>
                              )}
                            </div>

                            {/* 🏷️ 하단 라벨 - 통일된 높이 */}
                            <div className="mt-3 text-center w-full h-16 flex flex-col justify-start">
                              <div className={`text-sm font-bold ${weightData.is_today ? 'text-green-400' : 'text-gray-300'}`}>
                                {weightData.day}
                              </div>
                              {weightData.is_today && (
                                <div className="text-xs text-green-400 font-bold animate-pulse">오늘</div>
                              )}
                              {isValidWeight ? (
                                <>
                                  <div className="text-xs text-blue-400 mt-1 font-medium">기록됨</div>
                                  <div className="text-xs text-gray-400 mt-1">{weight.toFixed(1)}kg</div>
                                </>
                              ) : hasWeight ? (
                                <div className="text-xs text-red-400 mt-1">비정상값</div>
                              ) : (
                                <div className="text-xs text-gray-500 mt-1">기록없음</div>
                              )}
                            </div>

                            {/* 🎈 호버 툴팁 */}
                            <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 whitespace-nowrap pointer-events-none">
                              <div className="font-bold text-center">{weightData.day}요일</div>
                              {isValidWeight ? (
                                <div className="text-center">{weight.toFixed(1)}kg</div>
                              ) : (
                                <div className="text-center text-gray-400">기록없음</div>
                              )}
                              {/* 툴팁 화살표 */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 📋 체중 범례 */}
                    <div className="flex justify-center mt-8 space-x-8 text-sm bg-gray-800/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
                        <span className="font-medium">체중 기록</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-400 rounded-full shadow-sm animate-pulse"></div>
                        <span className="font-medium">오늘</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-600/30 rounded-full shadow-sm"></div>
                        <span className="font-medium">기록없음</span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">⚖️</div>
                  <p className="text-lg">체중 기록이 없습니다</p>
                  <p className="text-sm">체중을 기록해보세요!</p>
                </div>
              </div>
            )}
          </div>

          {/* 최근 식사 기록 */}
          <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-left">최근 식사 기록</h2>
              <button
                onClick={handleReset}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                새 분석
              </button>
            </div>

            {recentMeals.length > 0 ? (
              <div className="space-y-3">
                {recentMeals.map((meal) => (
                  <div key={meal.id} className="flex items-center space-x-4 p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors">
                    {/* 이미지 */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-700 flex-shrink-0">
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
                      <div className={`w-full h-full flex items-center justify-center text-gray-500 text-sm ${meal.imageUrl ? 'hidden' : ''}`}>
                        🍽️
                      </div>
                    </div>

                    {/* 식사 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-bold text-white text-lg truncate">{meal.foodName}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${meal.nutriScore === 'A' ? 'bg-green-500 text-white' :
                          meal.nutriScore === 'B' ? 'bg-yellow-500 text-black' :
                            meal.nutriScore === 'C' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                          {meal.nutriScore}등급
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-300">
                        <span>{meal.date}</span>
                        <span className="font-medium">{
                          meal.mealType === 'breakfast' ? '🌅 아침' :
                            meal.mealType === 'lunch' ? '☀️ 점심' :
                              meal.mealType === 'dinner' ? '🌙 저녁' : '🍪 간식'
                        }</span>
                        <span className="font-bold text-green-400">{meal.calories}kcal</span>
                      </div>
                    </div>

                    {/* 영양소 정보 */}
                    <div className="hidden md:flex space-x-4 text-sm">
                      <div className="text-center bg-blue-500/20 px-3 py-2 rounded-lg">
                        <p className="text-blue-400 font-bold text-lg">{meal.protein}g</p>
                        <p className="text-xs text-gray-400">단백질</p>
                      </div>
                      <div className="text-center bg-yellow-500/20 px-3 py-2 rounded-lg">
                        <p className="text-yellow-400 font-bold text-lg">{meal.carbs}g</p>
                        <p className="text-xs text-gray-400">탄수화물</p>
                      </div>
                      <div className="text-center bg-red-500/20 px-3 py-2 rounded-lg">
                        <p className="text-red-400 font-bold text-lg">{meal.fat}g</p>
                        <p className="text-xs text-gray-400">지방</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">🍽️</div>
                  <p className="text-lg">최근 식사 기록이 없습니다</p>
                  <p className="text-sm">식사를 기록해보세요!</p>
                </div>
              </div>
            )}
          </div>

          {/* 게임화 요소 */}
          <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-left">오늘의 성과</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  주간 리포트
                </button>
                <button
                  onClick={() => setIsInsightModalOpen(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  고급 분석
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 오늘 칼로리 */}
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 font-medium">오늘 칼로리</span>
                  <span className="text-2xl">🔥</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {dashboardData?.today_stats?.total_calories?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-400">kcal</div>
              </div>

              {/* 식사 횟수 */}
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-400 font-medium">식사 횟수</span>
                  <span className="text-2xl">🍽️</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {dashboardData?.today_stats?.meal_count || 0}
                </div>
                <div className="text-sm text-gray-400">회</div>
              </div>

              {/* 포인트 */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl p-4 border border-yellow-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-400 font-medium">포인트</span>
                  <span className="text-2xl">⭐</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {gamificationData.points.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">점</div>
              </div>
            </div>
          </div>

          {/* 네비게이션 버튼들 */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <button
              onClick={handleGoToCalendar}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              📅 캘린더 보기
            </button>
            <button
              onClick={handleGoToChallenges}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🏆 챌린지 참여
            </button>
          </div>
        </div>
      </div>

      {/* 모달들 */}
      <WeightRecordModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        onSave={handleSaveWeight}
      />
      <WeeklyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        weeklyData={weeklyData}
        weightData={weeklyWeights}
      />
      <AdvancedInsightModal
        isOpen={isInsightModalOpen}
        onClose={() => setIsInsightModalOpen(false)}
        dashboardData={dashboardData}
      />
    </>
  );
}