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
  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [gamificationData, setGamificationData] = useState<GamificationData>({ points: 0, badges: [] });
  const [recentMeals, setRecentMeals] = useState<MealEntry[]>([]);

  // 인증 확인 중이면 로딩 화면 표시
  if (isLoading || !canRender) {
    return <AuthLoadingScreen message="대시보드를 불러오고 있습니다..." />;
  }

  // 대시보드 데이터 상태 추가
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [weeklyCalories, setWeeklyCalories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // 실제 데이터 또는 기본값 사용
  const weeklyData = weeklyCalories.length > 0 ? weeklyCalories : [
    { day: '월', total_kcal: 0 }, { day: '화', total_kcal: 0 }, { day: '수', total_kcal: 0 },
    { day: '목', total_kcal: 0 }, { day: '금', total_kcal: 0 }, { day: '토', total_kcal: 0 }, { day: '일', total_kcal: 0 }
  ];

  // 최대값 계산 (실제 데이터 기반)
  const maxKcal = Math.max(3000, ...weeklyData.map(d => d.total_kcal || d.kcal || 0)) || 3000;

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
            <h2 className="text-xl font-bold text-left mb-4">주간 칼로리 섭취량</h2>
            <div className="flex justify-between items-end h-48 space-x-2">
              {weeklyData.map((data, index) => {
                const calories = data.total_kcal || data.kcal || 0;
                const heightPercentage = Math.max(2, (calories / maxKcal) * 100);

                console.log(`📊 ${data.day}: ${calories}kcal → ${heightPercentage.toFixed(1)}%`);

                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end">
                    <div className="w-full h-full flex items-end">
                      <div
                        className={`w-full rounded-t-md transition-all duration-500 ${calories > 0 ? 'bg-[var(--point-green)]' : 'bg-gray-600 opacity-30'
                          }`}
                        style={{
                          height: `${heightPercentage}%`,
                          minHeight: calories > 0 ? '8px' : '2px'
                        }}
                      ></div>
                    </div>
                    <div className="mt-2 text-center">
                      <span className="text-xs font-medium">{data.day}</span>
                      <p className="text-xs text-gray-400">{calories}kcal</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 주간 체중 변화 */}
          <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-left">주간 체중 변화</h2>
              <button
                onClick={() => setIsWeightModalOpen(true)}
                className="bg-[var(--point-green)] text-black font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105"
              >
                기록하기
              </button>
            </div>
            {dashboardData && dashboardData.weight_data ? (
              <div className="space-y-4">
                {/* 체중 차트 */}
                <div className="h-48 relative">
                  {dashboardData.weight_data.weekly_weights.some((day: any) => day.has_record) ? (
                    <div className="flex justify-between items-end h-full space-x-2">
                      {dashboardData.weight_data.weekly_weights.map((day: any, index: number) => {
                        // 체중 범위 계산
                        const recordedWeights = dashboardData.weight_data.weekly_weights
                          .filter((d: any) => d.has_record && d.weight)
                          .map((d: any) => d.weight);

                        let minWeight = 60, maxWeight = 100;
                        if (recordedWeights.length > 0) {
                          minWeight = Math.min(...recordedWeights) - 5;
                          maxWeight = Math.max(...recordedWeights) + 5;
                        }
                        const weightRange = maxWeight - minWeight;

                        return (
                          <div key={index} className="flex-1 flex flex-col items-center justify-end">
                            <div className="w-full h-full flex items-end relative group">
                              {day.has_record && day.weight ? (
                                <>
                                  {/* 체중 막대 */}
                                  <div
                                    className={`w-full rounded-t-md transition-all duration-500 ${day.is_today ? 'bg-yellow-500' : 'bg-blue-500'
                                      }`}
                                    style={{
                                      height: `${Math.max(20, ((day.weight - minWeight) / weightRange) * 85)}%`,
                                      minHeight: '16px'
                                    }}
                                  ></div>

                                  {/* 호버 시 상세 정보 */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                    <p className="font-bold">{day.date}</p>
                                    <p>체중: {day.weight}kg</p>
                                  </div>
                                </>
                              ) : (
                                /* 기록이 없는 날 */
                                <div className="w-full h-2 bg-gray-600 opacity-30 rounded-t-md"></div>
                              )}
                            </div>

                            <div className="mt-2 text-center">
                              <span className={`text-xs font-medium ${day.is_today ? 'text-yellow-400' :
                                day.has_record ? 'text-blue-400' : 'text-gray-500'
                                }`}>
                                {day.day}
                              </span>
                              {day.has_record && (
                                <p className="text-xs text-gray-400 mt-1">{day.weight}kg</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
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

                {/* 체중 통계 */}
                {dashboardData.weight_data.latest_weight && (
                  <div className="bg-gray-800/30 rounded-lg p-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">최근 체중</span>
                      <span className="font-bold text-blue-400">{dashboardData.weight_data.latest_weight}kg</span>
                    </div>
                    {dashboardData.weight_data.weight_change !== null && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-300">변화량</span>
                        <span className={`font-bold ${dashboardData.weight_data.weight_change > 0 ? 'text-red-400' :
                          dashboardData.weight_data.weight_change < 0 ? 'text-green-400' : 'text-gray-400'
                          }`}>
                          {dashboardData.weight_data.weight_change > 0 ? '+' : ''}{dashboardData.weight_data.weight_change}kg
                          {dashboardData.weight_data.weight_trend === 'increasing' ? ' ↗️' :
                            dashboardData.weight_data.weight_trend === 'decreasing' ? ' ↘️' : ' ➡️'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
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
            <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6 text-left flex flex-col justify-center">
              <h2 className="text-xl font-bold mb-2">나의 활동</h2>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[var(--point-green)]">{gamificationData.points}</p>
                  <p className="text-sm text-gray-400">포인트</p>
                </div>
                <div className="flex-1">
                  <p className="font-bold mb-1">획득 배지</p>
                  <div className="flex space-x-2">
                    {gamificationData.badges.length > 0 ? (
                      gamificationData.badges.map(b => (
                        <span key={b} title={b} className="text-2xl">🏅</span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">아직 배지가 없어요.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6 text-left flex flex-col justify-center">
              <h2 className="text-xl font-bold mb-2">AI 분석</h2>
              <p className="text-sm text-gray-400 mb-4">AI로 나의 활동을 분석하고 조언을 받으세요.</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg transition-transform hover:scale-105"
                >
                  주간 리포트
                </button>
                <button
                  onClick={() => setIsInsightModalOpen(true)}
                  className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg transition-transform hover:scale-105"
                >
                  고급 인사이트
                </button>
              </div>
            </div>
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
        <AdvancedInsightModal
          isOpen={isInsightModalOpen}
          onClose={() => setIsInsightModalOpen(false)}
        />
      </div>
    </>
  );
}