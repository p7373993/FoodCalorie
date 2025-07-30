'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Calendar, Award, Target } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface NutritionStats {
  total_calories: number;
  avg_calories: number;
  total_carbs: number;
  total_protein: number;
  total_fat: number;
}

interface NutritionAnalysisData {
  period: string;
  nutrition_stats: NutritionStats;
  grade_distribution: Record<string, number>;
  daily_calories: Array<{
    date: string;
    calories: number;
  }>;
  total_meals: number;
}

interface NutritionAnalysisProps {
  className?: string;
}

export function NutritionAnalysis({ className = '' }: NutritionAnalysisProps) {
  const [data, setData] = useState<NutritionAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const loadAnalysis = async (selectedPeriod: 'week' | 'month') => {
    setLoading(true);
    try {
      const response = await apiClient.getNutritionAnalysis(selectedPeriod);
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to load nutrition analysis:', error);
      // 기본 데이터
      setData({
        period: selectedPeriod,
        nutrition_stats: {
          total_calories: 14000,
          avg_calories: 2000,
          total_carbs: 1400,
          total_protein: 420,
          total_fat: 455
        },
        grade_distribution: { A: 5, B: 8, C: 6, D: 2, E: 1 },
        daily_calories: [],
        total_meals: 22
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalysis(period);
  }, [period]);

  const calculateNutritionRatio = (stats: NutritionStats) => {
    const totalCalories = stats.total_calories || 1;
    const carbsCalories = stats.total_carbs * 4;
    const proteinCalories = stats.total_protein * 4;
    const fatCalories = stats.total_fat * 9;
    const totalMacroCalories = carbsCalories + proteinCalories + fatCalories || 1;

    return {
      carbs: Math.round((carbsCalories / totalMacroCalories) * 100),
      protein: Math.round((proteinCalories / totalMacroCalories) * 100),
      fat: Math.round((fatCalories / totalMacroCalories) * 100)
    };
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      case 'E': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthScore = (gradeDistribution: Record<string, number>) => {
    const total = Object.values(gradeDistribution).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0;

    const scores = { A: 5, B: 4, C: 3, D: 2, E: 1 };
    const totalScore = Object.entries(gradeDistribution).reduce(
      (sum, [grade, count]) => sum + (scores[grade as keyof typeof scores] || 0) * count,
      0
    );
    
    return Math.round((totalScore / (total * 5)) * 100);
  };

  if (loading) {
    return (
      <div className={`card p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">영양 분석</h3>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const nutritionRatio = calculateNutritionRatio(data.nutrition_stats);
  const healthScore = getHealthScore(data.grade_distribution);

  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">📊 영양 분석</h3>
        </div>
        
        {/* 기간 선택 */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {(['week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                period === p
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {p === 'week' ? '주간' : '월간'}
            </button>
          ))}
        </div>
      </div>

      {/* 건강 점수 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">건강 점수</span>
          <span className="text-2xl font-bold text-primary">{healthScore}점</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              healthScore >= 80 ? 'bg-green-500' :
              healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {healthScore >= 80 ? '훌륭해요! 🎉' :
           healthScore >= 60 ? '좋아요! 👍' : '개선이 필요해요 💪'}
        </p>
      </div>

      {/* 영양소 비율 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3">영양소 비율</h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>탄수화물</span>
              <span>{nutritionRatio.carbs}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${nutritionRatio.carbs}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>단백질</span>
              <span>{nutritionRatio.protein}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${nutritionRatio.protein}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>지방</span>
              <span>{nutritionRatio.fat}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${nutritionRatio.fat}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 등급 분포 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3">음식 등급 분포</h4>
        <div className="flex space-x-1 h-6 rounded-lg overflow-hidden">
          {Object.entries(data.grade_distribution).map(([grade, count]) => {
            const total = Object.values(data.grade_distribution).reduce((sum, c) => sum + c, 0);
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            return (
              <div
                key={grade}
                className={`${getGradeColor(grade)} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
                title={`${grade}등급: ${count}개 (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          {Object.entries(data.grade_distribution).map(([grade, count]) => (
            <span key={grade}>{grade}: {count}</span>
          ))}
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-primary">
            {Math.round(data.nutrition_stats.avg_calories)}
          </div>
          <div className="text-xs text-gray-500">평균 칼로리</div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-primary">
            {data.total_meals}
          </div>
          <div className="text-xs text-gray-500">총 식사 수</div>
        </div>
      </div>

      {/* 상세 보기 버튼 */}
      <div className="mt-4 text-center">
        <button className="text-sm text-primary hover:text-primary/80 transition-colors">
          상세 분석 보기 →
        </button>
      </div>
    </div>
  );
}