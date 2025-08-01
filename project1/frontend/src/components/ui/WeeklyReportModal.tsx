import React, { useState, useEffect } from 'react';
import FormattedAiResponse from './FormattedAiResponse';
import { apiClient } from '@/lib/api';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      generateWeeklyReport();
    }
  }, [isOpen]);

  const generateWeeklyReport = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('📊 주간 리포트 생성 시작...');

      // 대시보드 데이터 가져오기
      const dashboardData = await apiClient.getDashboardData();
      console.log('📊 대시보드 데이터:', dashboardData);

      // 주간 데이터 준비
      const weeklyCalories = dashboardData.weekly_calories?.days || [];
      const recentMeals = dashboardData.recent_meals || [];
      const weightData = dashboardData.weight_data || {};

      // 주간 통계 계산
      const validCalories = weeklyCalories
        .filter((day: any) => day.has_data && day.total_kcal > 0)
        .map((day: any) => day.total_kcal);

      const avgCalories = validCalories.length > 0
        ? Math.round(validCalories.reduce((sum: number, cal: number) => sum + cal, 0) / validCalories.length)
        : 0;

      const maxCalories = validCalories.length > 0 ? Math.max(...validCalories) : 0;
      const minCalories = validCalories.length > 0 ? Math.min(...validCalories) : 0;

      // 영양소 통계 계산
      const totalProtein = recentMeals.reduce((sum: number, meal: any) => sum + (meal.protein || 0), 0);
      const totalCarbs = recentMeals.reduce((sum: number, meal: any) => sum + (meal.carbs || 0), 0);
      const totalFat = recentMeals.reduce((sum: number, meal: any) => sum + (meal.fat || 0), 0);

      // 등급 분포 계산
      const gradeCount = recentMeals.reduce((acc: any, meal: any) => {
        acc[meal.nutriScore] = (acc[meal.nutriScore] || 0) + 1;
        return acc;
      }, {});

      const requestData = {
        type: 'weekly_report',
        meal_data: {
          weekly_avg_calories: avgCalories,
          max_calories: maxCalories,
          min_calories: minCalories,
          weekly_meal_count: recentMeals.length,
          recorded_days: validCalories.length,
          weight_change: weightData.weight_change || 0,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
          grade_distribution: gradeCount,
          daily_breakdown: weeklyCalories.map((day: any) => ({
            day: day.day,
            calories: day.total_kcal || 0,
            has_data: day.has_data,
            is_today: day.is_today
          })),
          recent_meals: recentMeals.slice(0, 10).map((meal: any) => ({
            food_name: meal.foodName,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            grade: meal.nutriScore,
            date: meal.date,
            meal_type: meal.mealType
          }))
        }
      };

      console.log('📊 주간 리포트 요청 데이터:', requestData);

      const response = await fetch('http://localhost:8000/api/ai/coaching/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      const responseText = await response.text();
      console.log('📊 주간 리포트 응답:', responseText);

      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
        throw new Error('인증이 필요하거나 서버 오류가 발생했습니다.');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const result = JSON.parse(responseText);

      if (result.success && result.coaching) {
        setWeeklyReport(result.coaching);
      } else {
        throw new Error(result.message || '주간 리포트 생성에 실패했습니다.');
      }

    } catch (error) {
      console.error('📊 주간 리포트 생성 실패:', error);
      setError(error instanceof Error ? error.message : '주간 리포트 생성 중 오류가 발생했습니다.');

      // 폴백 리포트 생성
      setWeeklyReport(generateFallbackReport());
    } finally {
      setIsLoading(false);
    }
  };

  const getCsrfToken = () => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return value;
      }
    }
    return null;
  };

  const generateFallbackReport = () => {
    return `# 📊 주간 영양 분석 리포트

## 🎯 이번 주 요약
이번 주 식사 기록을 분석한 결과를 알려드립니다.

### 📈 주요 지표
- **기록된 날**: 7일 중 7일 (100%)
- **평균 칼로리**: 1,620kcal/일
- **목표 달성률**: 81%

### 💡 AI 조언
꾸준한 식사 기록 관리를 잘하고 계시네요! 단백질 섭취를 조금 더 늘리시면 더욱 균형잡힌 식단이 될 것 같습니다.

### 🎯 다음 주 목표
- 단백질 섭취량 증가
- 균형잡힌 영양소 비율 유지
- 꾸준한 식사 기록 지속

*AI 분석 서비스에 일시적인 문제가 있어 기본 리포트를 표시합니다.*`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in p-4 pb-8">
      <div className="w-full max-w-lg bg-gray-800 border border-[var(--border-color)] rounded-2xl flex flex-col">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
          <h2 className="text-xl font-bold text-[var(--point-green)]">주간 AI 리포트</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-48 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
              <div className="text-center">
                <p className="text-white font-medium">AI가 주간 식사 기록을 분석하고 있습니다...</p>
                <p className="text-gray-400 text-sm mt-2">일주일치 데이터를 종합 분석 중</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 p-8">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="font-medium mb-2">주간 리포트 생성 실패</p>
              <p className="text-sm text-gray-400">{error}</p>
              <button
                onClick={generateWeeklyReport}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                다시 시도
              </button>
            </div>
          ) : weeklyReport ? (
            <div className="text-left text-white">
              <FormattedAiResponse text={weeklyReport} />
            </div>
          ) : (
            <div className="text-center text-gray-400 p-8">
              <div className="text-4xl mb-4">📊</div>
              <p>주간 리포트를 생성할 데이터가 부족합니다.</p>
              <p className="text-sm mt-2">더 많은 식사 기록을 추가해보세요.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 text-white font-bold py-3 rounded-lg"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportModal;