'use client';

import React, { useState, useEffect } from 'react';
import { X, ChefHat, Lightbulb, TrendingUp, Star, Clock, Utensils } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface AIRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'personalized' | 'alternatives' | 'nutrition_focused' | 'meal_plan';
  initialData?: any;
}

interface RecommendationResult {
  type: string;
  result: any;
  generated_at: string;
}

export function AIRecommendationModal({
  isOpen,
  onClose,
  initialType = 'personalized',
  initialData = {}
}: AIRecommendationModalProps) {
  const [activeTab, setActiveTab] = useState(initialType);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [formData, setFormData] = useState({
    meal_type: 'lunch',
    food_name: '',
    nutrient: 'protein',
    target_calories: 2000,
    count: 5
  });

  const tabs = [
    { id: 'personalized', name: '맞춤 추천', icon: Star },
    { id: 'alternatives', name: '건강한 대안', icon: TrendingUp },
    { id: 'nutrition_focused', name: '영양소 중심', icon: Utensils },
    { id: 'meal_plan', name: '식단 계획', icon: Clock }
  ];

  const loadRecommendations = async (type: string, options: any = {}) => {
    setLoading(true);
    try {
      const response = await apiClient.getSpecialRecommendations(type as any, {
        ...formData,
        ...options
      });
      
      if (response.success) {
        setResult(response.data);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      // 기본 데이터 설정
      setResult({
        type,
        result: getDefaultResult(type),
        generated_at: new Date().toISOString()
      });
    }
    setLoading(false);
  };

  const getDefaultResult = (type: string) => {
    switch (type) {
      case 'alternatives':
        return [
          { name: '현미밥', calories: 112, grade: 'A', reason: '칼로리가 낮고 식이섬유가 풍부해요' },
          { name: '닭가슴살', calories: 165, grade: 'A', reason: '단백질이 풍부하고 지방이 적어요' }
        ];
      case 'nutrition_focused':
        return [
          { name: '계란', calories: 155, nutrient_value: 13, grade: 'A', reason: '단백질 함량이 높아요' },
          { name: '두부', calories: 76, nutrient_value: 8, grade: 'A', reason: '식물성 단백질이 풍부해요' }
        ];
      case 'meal_plan':
        return {
          breakfast: { target_calories: 500, recommended_foods: [{ name: '오트밀', calories: 150 }] },
          lunch: { target_calories: 700, recommended_foods: [{ name: '비빔밥', calories: 380 }] },
          dinner: { target_calories: 600, recommended_foods: [{ name: '생선구이', calories: 200 }] },
          snack: { target_calories: 200, recommended_foods: [{ name: '사과', calories: 80 }] }
        };
      default:
        return [
          { name: '김치찌개', calories: 320, grade: 'B', score: 85, category: '찌개류' },
          { name: '불고기', calories: 450, grade: 'C', score: 75, category: '고기류' }
        ];
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecommendations(activeTab);
    }
  }, [isOpen, activeTab]);

  const renderPersonalizedRecommendations = (recommendations: any[]) => (
    <div className="space-y-3">
      {recommendations.map((food, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {index + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium">{food.name}</h4>
              <span className={`px-2 py-1 rounded-full text-xs ${
                food.grade === 'A' ? 'bg-green-100 text-green-600' :
                food.grade === 'B' ? 'bg-blue-100 text-blue-600' :
                'bg-yellow-100 text-yellow-600'
              }`}>
                {food.grade}등급
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {food.calories}kcal • {food.category} • 추천점수 {food.score}점
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAlternatives = (alternatives: any[]) => (
    <div className="space-y-3">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">대안을 찾을 음식</label>
        <input
          type="text"
          value={formData.food_name}
          onChange={(e) => setFormData({ ...formData, food_name: e.target.value })}
          placeholder="예: 라면, 치킨, 피자"
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={() => loadRecommendations('alternatives', { food_name: formData.food_name })}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          대안 찾기
        </button>
      </div>
      
      {alternatives.map((alt, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium">{alt.name}</h4>
              <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">
                {alt.grade}등급
              </span>
            </div>
            <div className="text-sm text-gray-600">{alt.reason}</div>
            <div className="text-sm text-gray-500">{alt.calories}kcal</div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderNutritionFocused = (foods: any[]) => (
    <div className="space-y-3">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">중점 영양소</label>
        <select
          value={formData.nutrient}
          onChange={(e) => setFormData({ ...formData, nutrient: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="protein">단백질</option>
          <option value="carbs">탄수화물</option>
          <option value="fat">지방</option>
          <option value="fiber">식이섬유</option>
          <option value="calcium">칼슘</option>
          <option value="iron">철분</option>
        </select>
        <button
          onClick={() => loadRecommendations('nutrition_focused', { nutrient: formData.nutrient })}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          추천받기
        </button>
      </div>
      
      {foods.map((food, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
            <Utensils className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium">{food.name}</h4>
              <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs">
                {food.grade}등급
              </span>
            </div>
            <div className="text-sm text-gray-600">{food.reason}</div>
            <div className="text-sm text-gray-500">
              {food.calories}kcal • {formData.nutrient}: {food.nutrient_value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMealPlan = (plan: any) => (
    <div className="space-y-4">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">목표 칼로리</label>
        <input
          type="number"
          value={formData.target_calories}
          onChange={(e) => setFormData({ ...formData, target_calories: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={() => loadRecommendations('meal_plan', { target_calories: formData.target_calories })}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          식단 생성
        </button>
      </div>
      
      {Object.entries(plan).map(([mealType, mealData]: [string, any]) => (
        <div key={mealType} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium capitalize">
              {mealType === 'breakfast' ? '🌅 아침' :
               mealType === 'lunch' ? '🍽️ 점심' :
               mealType === 'dinner' ? '🌙 저녁' : '🍪 간식'}
            </h4>
            <span className="text-sm text-gray-500">
              목표: {mealData.target_calories}kcal
            </span>
          </div>
          <div className="space-y-2">
            {mealData.recommended_foods?.map((food: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span>{food.name}</span>
                <span className="text-gray-500">{food.calories}kcal</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-primary font-medium">
            총 {mealData.total_calories || mealData.target_calories}kcal
          </div>
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!result) return null;

    switch (activeTab) {
      case 'personalized':
        return renderPersonalizedRecommendations(Array.isArray(result.result) ? result.result : []);
      case 'alternatives':
        return renderAlternatives(Array.isArray(result.result) ? result.result : []);
      case 'nutrition_focused':
        return renderNutritionFocused(Array.isArray(result.result) ? result.result : []);
      case 'meal_plan':
        return renderMealPlan(result.result);
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <ChefHat className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">🤖 AI 음식 추천</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary bg-primary/5'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* 내용 */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {renderContent()}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {result && new Date(result.generated_at).toLocaleString('ko-KR')} 생성
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}