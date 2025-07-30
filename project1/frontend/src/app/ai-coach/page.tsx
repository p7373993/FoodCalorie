'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserInfo from '@/components/auth/UserInfo';
import AuthLoadingScreen from '@/components/ui/AuthLoadingScreen';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { AICoachTip } from '@/components/dashboard/AICoachTip';
import { FoodRecommendations } from '@/components/dashboard/FoodRecommendations';
import { NutritionAnalysis } from '@/components/dashboard/NutritionAnalysis';
import { AIRecommendationModal } from '@/components/ui/AIRecommendationModal';
import { apiClient } from '@/lib/api';
import { Brain, Sparkles, TrendingUp, BarChart3, ChefHat, Target } from 'lucide-react';

export default function AICoachPage() {
  const router = useRouter();
  const { canRender, isLoading } = useRequireAuth();
  const [activeTab, setActiveTab] = useState('coaching');
  const [isAIRecommendationOpen, setIsAIRecommendationOpen] = useState(false);
  const [recommendationType, setRecommendationType] = useState<'personalized' | 'alternatives' | 'nutrition_focused' | 'meal_plan'>('personalized');
  const [coachingData, setCoachingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 인증 확인 중이면 로딩 화면 표시
  if (isLoading || !canRender) {
    return <AuthLoadingScreen message="AI 코치를 불러오고 있습니다..." />;
  }

  const tabs = [
    { id: 'coaching', name: 'AI 코칭', icon: Brain, description: '개인화된 식습관 조언' },
    { id: 'recommendations', name: '음식 추천', icon: ChefHat, description: '맞춤형 음식 추천' },
    { id: 'analysis', name: '영양 분석', icon: BarChart3, description: '상세한 영양 분석' },
    { id: 'insights', name: '인사이트', icon: TrendingUp, description: '식습관 패턴 분석' }
  ];

  const loadCoachingData = async (type: string) => {
    setLoading(true);
    try {
      let response;
      switch (type) {
        case 'daily':
          response = await apiClient.getDailyCoaching();
          break;
        case 'weekly':
          response = await apiClient.getCustomCoaching('weekly');
          break;
        case 'nutrition':
          response = await apiClient.getCustomCoaching('nutrition', 'protein');
          break;
        default:
          response = await apiClient.getDailyCoaching();
      }
      
      if (response.success) {
        setCoachingData(response.data);
      }
    } catch (error) {
      console.error('Failed to load coaching data:', error);
    }
    setLoading(false);
  };

  const openRecommendationModal = (type: 'personalized' | 'alternatives' | 'nutrition_focused' | 'meal_plan') => {
    setRecommendationType(type);
    setIsAIRecommendationOpen(true);
  };

  const renderCoachingTab = () => (
    <div className="space-y-6">
      {/* AI 코칭 팁 */}
      <AICoachTip />
      
      {/* 코칭 타입 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => loadCoachingData('daily')}
          className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-3xl mb-2">🌅</div>
          <h3 className="font-bold text-lg mb-2">일일 코칭</h3>
          <p className="text-sm opacity-90">오늘의 식습관 분석과 조언</p>
        </button>
        
        <button
          onClick={() => loadCoachingData('weekly')}
          className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-3xl mb-2">📊</div>
          <h3 className="font-bold text-lg mb-2">주간 리포트</h3>
          <p className="text-sm opacity-90">7일간의 종합 분석</p>
        </button>
        
        <button
          onClick={() => loadCoachingData('nutrition')}
          className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-3xl mb-2">🥗</div>
          <h3 className="font-bold text-lg mb-2">영양 코칭</h3>
          <p className="text-sm opacity-90">영양소 기반 맞춤 조언</p>
        </button>
      </div>

      {/* 코칭 결과 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      {coachingData && !loading && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-lg">AI 코칭 결과</h3>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {typeof coachingData === 'string' ? coachingData : coachingData.message || JSON.stringify(coachingData)}
            </p>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {new Date().toLocaleString('ko-KR')} 생성
          </div>
        </div>
      )}
    </div>
  );

  const renderRecommendationsTab = () => (
    <div className="space-y-6">
      {/* 추천 타입 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => openRecommendationModal('personalized')}
          className="p-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl text-white hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-3xl mb-2">⭐</div>
          <h3 className="font-bold text-lg mb-2">맞춤 추천</h3>
          <p className="text-sm opacity-90">개인 선호도 기반</p>
        </button>
        
        <button
          onClick={() => openRecommendationModal('alternatives')}
          className="p-6 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl text-white hover:from-green-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-3xl mb-2">🔄</div>
          <h3 className="font-bold text-lg mb-2">건강한 대안</h3>
          <p className="text-sm opacity-90">더 나은 선택지</p>
        </button>
        
        <button
          onClick={() => openRecommendationModal('nutrition_focused')}
          className="p-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-3xl mb-2">💪</div>
          <h3 className="font-bold text-lg mb-2">영양소 중심</h3>
          <p className="text-sm opacity-90">특정 영양소 강화</p>
        </button>
        
        <button
          onClick={() => openRecommendationModal('meal_plan')}
          className="p-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-3xl mb-2">📅</div>
          <h3 className="font-bold text-lg mb-2">식단 계획</h3>
          <p className="text-sm opacity-90">하루 전체 계획</p>
        </button>
      </div>

      {/* 추천 미리보기 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FoodRecommendations mealType="breakfast" />
        <FoodRecommendations mealType="lunch" />
      </div>
    </div>
  );

  const renderAnalysisTab = () => (
    <div className="space-y-6">
      <NutritionAnalysis />
      
      {/* 추가 분석 도구들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-lg">목표 달성률</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>칼로리 목표</span>
                <span>85%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>단백질 목표</span>
                <span>92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-lg">개선 제안</h3>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">🥬 채소 섭취량을 늘려보세요</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">💧 수분 섭취를 늘려보세요</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">🏃 식후 가벼운 운동을 추천해요</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <h3 className="text-2xl font-bold mb-2">🧠 AI 인사이트</h3>
        <p className="opacity-90">당신의 식습관 패턴을 분석했습니다</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h4 className="font-bold text-lg mb-4">📈 식습관 트렌드</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">주말 vs 평일 칼로리</span>
              <span className="text-sm font-medium text-red-600">+15% 높음</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">아침 식사 빈도</span>
              <span className="text-sm font-medium text-green-600">85% 규칙적</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">간식 섭취 패턴</span>
              <span className="text-sm font-medium text-yellow-600">오후 3시 집중</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h4 className="font-bold text-lg mb-4">🎯 개선 포인트</h4>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800 font-medium">나트륨 섭취 주의</p>
              <p className="text-xs text-red-600 mt-1">권장량의 120% 섭취 중</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">식이섬유 부족</p>
              <p className="text-xs text-yellow-600 mt-1">하루 5g 더 필요</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800 font-medium">단백질 섭취 양호</p>
              <p className="text-xs text-green-600 mt-1">목표량 달성 중</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'coaching':
        return renderCoachingTab();
      case 'recommendations':
        return renderRecommendationsTab();
      case 'analysis':
        return renderAnalysisTab();
      case 'insights':
        return renderInsightsTab();
      default:
        return renderCoachingTab();
    }
  };

  return (
    <>
      <UserInfo />
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🤖 AI 코치</h1>
            <p className="text-gray-600">인공지능이 분석한 맞춤형 식습관 조언</p>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex flex-wrap justify-center mb-8">
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-200">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-primary text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">{tab.name}</div>
                      <div className="text-xs opacity-75">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="animate-fade-in">
            {renderTabContent()}
          </div>
        </div>

        {/* AI 추천 모달 */}
        <AIRecommendationModal
          isOpen={isAIRecommendationOpen}
          onClose={() => setIsAIRecommendationOpen(false)}
          initialType={recommendationType}
        />
      </div>
    </>
  );
}