'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, Star, Clock, Utensils, RefreshCw, TrendingUp } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface FoodRecommendation {
  name: string;
  calories: number;
  grade: string;
  score: number;
  category: string;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface FoodRecommendationsProps {
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  className?: string;
}

export function FoodRecommendations({ 
  mealType = 'lunch', 
  className = '' 
}: FoodRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<FoodRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMealType, setCurrentMealType] = useState(mealType);

  const loadRecommendations = async (type: string) => {
    setLoading(true);
    try {
      const response = await apiClient.getFoodRecommendations(type, 5);
      if (response.success) {
        setRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      // 기본 추천 데이터
      setRecommendations([
        { name: '비빔밥', calories: 380, grade: 'B', score: 85, category: '밥류' },
        { name: '김치찌개', calories: 320, grade: 'B', score: 80, category: '찌개류' },
        { name: '계란후라이', calories: 180, grade: 'A', score: 75, category: '계란류' }
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRecommendations(currentMealType);
  }, [currentMealType]);

  const getMealTypeIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '🍽️';
      case 'dinner': return '🌙';
      case 'snack': return '🍪';
      default: return '🍽️';
    }
  };

  const getMealTypeName = (type: string) => {
    switch (type) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      case 'snack': return '간식';
      default: return '식사';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      case 'E': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className={`card p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <ChefHat className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">음식 추천</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <ChefHat className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">🤖 AI 음식 추천</h3>
        </div>
        <button
          onClick={() => loadRecommendations(currentMealType)}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* 식사 타입 선택 */}
      <div className="flex space-x-2 mb-4">
        {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
          <button
            key={type}
            onClick={() => setCurrentMealType(type)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              currentMealType === type
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {getMealTypeIcon(type)} {getMealTypeName(type)}
          </button>
        ))}
      </div>

      {/* 추천 목록 */}
      <div className="space-y-3">
        {recommendations.slice(0, 3).map((food, index) => (
          <div
            key={index}
            className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center text-white font-bold">
              {index + 1}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-sm">{food.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(food.grade)}`}>
                  {food.grade}등급
                </span>
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{food.calories}kcal</span>
                </span>
                <span>{food.category}</span>
                {food.score && (
                  <span className="flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{food.score}점</span>
                  </span>
                )}
              </div>
            </div>

            <button className="px-3 py-1 bg-primary text-white text-xs rounded-md hover:bg-primary/90 transition-colors">
              선택
            </button>
          </div>
        ))}
      </div>

      {/* 더보기 버튼 */}
      <div className="mt-4 text-center">
        <button className="text-sm text-primary hover:text-primary/80 transition-colors">
          더 많은 추천 보기 →
        </button>
      </div>
    </div>
  );
}