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

  useEffect(() => {
    // 게임화 데이터 로드 (임시 비활성화)
    const loadGamificationData = async () => {
      try {
        // 임시로 기본값 설정
        setGamificationData({
          points: 0,
          badges: []
        });
      } catch (error) {
        console.error('Error loading gamification data:', error);
      }
    };

    // 최근 식사 기록 로드
    const loadRecentMeals = async () => {
      try {
        const data = await apiClient.getMeals();
        
        // 최근 5개 식사만 표시
        const meals = (data.results || data || []).slice(0, 5);
        setRecentMeals(meals);
      } catch (error) {
        console.error('Error loading recent meals:', error);
      }
    };

    loadGamificationData();
    loadRecentMeals();
  }, []);

  const handleSaveWeight = async (weight: string) => {
    if (!weight) return;
    
    try {
      // 체중 저장
      await fetch('/api/weight/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: parseFloat(weight) })
      });

      // 게임화 포인트 업데이트
      const gamificationResponse = await fetch('/api/gamification/update/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_weight' })
      });

      const gamificationResult = await gamificationResponse.json();
      if (gamificationResult.profile) {
        setGamificationData({
          points: gamificationResult.profile.points,
          badges: gamificationResult.profile.badge_names || []
        });
      }
    } catch (e) { 
      console.error("Error saving weight: ", e); 
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

  const weeklyData = [ 
    { day: '월', kcal: 1800 }, 
    { day: '화', kcal: 2200 }, 
    { day: '수', kcal: 1900 }, 
    { day: '목', kcal: 2500 }, 
    { day: '금', kcal: 2300 }, 
    { day: '토', kcal: 2700 }, 
    { day: '일', kcal: 1600 }, 
  ];
  const maxKcal = 3000;

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
            {weeklyData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center justify-end">
                <div className="w-full h-full flex items-end">
                  <div 
                    className="w-full bg-[var(--point-green)] rounded-t-md animate-bar-up" 
                    style={{ 
                      height: `${(data.kcal / maxKcal) * 100}%`, 
                      animationDelay: `${index * 100}ms` 
                    }}
                  ></div>
                </div>
                <span className="text-xs mt-2">{data.day}</span>
              </div>
            ))}
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
          <div className="h-48 flex items-center justify-center text-gray-400">
            {weightHistory.length > 1 ? (
              `최근 체중: ${weightHistory[0].weight}kg`
            ) : (
              "체중 기록이 더 필요합니다."
            )}
          </div>
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
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        meal.nutriScore === 'A' ? 'bg-green-500' :
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