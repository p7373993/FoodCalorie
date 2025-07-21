'use client';

import React, { useState, useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api';
import { DailyNutrition } from '@/types';
import { NutritionDonutChart } from './NutritionDonutChart';

interface DailyReportModalProps {
  date: string;
  onClose: () => void;
}

export function DailyReportModal({ date, onClose }: DailyReportModalProps) {
  const [dailyData, setDailyData] = useState<DailyNutrition | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDailyData = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getDailyReport(date);
        setDailyData(data);
      } catch (error) {
        console.error('Failed to load daily data:', error);
        setDailyData(null);
      }
      setLoading(false);
    };

    loadDailyData();
  }, [date]);

  // 삭제 기능
  const handleDelete = async (id: string | number) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;
    try {
      await apiClient.deleteMealLog(id);
      // 삭제 후 데이터 갱신
      const data = await apiClient.getDailyReport(date);
      setDailyData(data);
    } catch (error) {
      alert('삭제에 실패했습니다.');
    }
  };

  const getNutriScoreColor = (score: string) => {
    switch (score) {
      case 'A': return 'nutri-score-a';
      case 'B': return 'nutri-score-b';
      case 'C': return 'nutri-score-c';
      case 'D': return 'nutri-score-d';
      case 'E': return 'nutri-score-e';
      default: return 'nutri-score-c';
    }
  };

  const getMealTypeLabel = (type: string) => {
    switch (type) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      case 'snack': return '간식';
      default: return type;
    }
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '🌞';
      case 'dinner': return '🌙';
      case 'snack': return '🍿';
      default: return '🍽️';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy년 M월 d일');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in border border-border">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-nanum text-foreground">
            {formatDate(date)} 식사 기록
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        ) : dailyData ? (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* 영양소 도넛 차트 */}
              <div className="lg:col-span-1 h-full flex flex-col">
                <NutritionDonutChart
                  carbs={dailyData.totalCarbs}
                  protein={dailyData.totalProtein}
                  fat={dailyData.totalFat}
                  totalCalories={dailyData.totalCalories}
                />
              </div>

              {/* 식사 목록 */}
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {dailyData.meals.map((meal) => (
                    <div key={meal.id} className="bg-white rounded-2xl border border-border shadow p-4">
                      <div className="flex items-start space-x-4">
                        {/* 시간 정보 */}
                        <div className="flex flex-col items-center justify-center w-20 h-20 rounded-lg bg-muted text-muted-foreground font-nanum text-sm">
                          <span>{meal.time || '시간 정보 없음'}</span>
                        </div>

                        {/* 식사 정보 */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getMealIcon(meal.mealType)}</span>
                              <span className="text-sm text-muted-foreground">
                                {getMealTypeLabel(meal.mealType)}
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-muted-foreground mb-0.5">Nutri-score</span>
                              <div className={`px-2 py-1 rounded-full text-6xl font-extrabold drop-shadow ${getNutriScoreColor(meal.nutriScore)}`}>
                                {meal.nutriScore}
                              </div>
                             <button
                               className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                               onClick={() => handleDelete(meal.id)}
                             >
                               삭제
                             </button>
                            </div>
                          </div>
                          
                          <h4 className="font-nanum text-lg mt-1 font-nanum">{meal.foodName}</h4>
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground font-nanum">
                            <span>{meal.calories}kcal</span>
                            <span>탄수화물 {meal.carbs}g</span>
                            <span>단백질 {meal.protein}g</span>
                            <span>지방 {meal.fat}g</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-12">
            <div className="text-muted-foreground">데이터를 불러올 수 없습니다.</div>
          </div>
        )}
      </div>
    </div>
  );
} 