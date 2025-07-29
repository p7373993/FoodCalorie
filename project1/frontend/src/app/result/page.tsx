'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FormattedAiResponse from '@/components/ui/FormattedAiResponse';
import { apiClient } from '@/lib/api';
import dynamic from 'next/dynamic';
import UserInfo from '@/components/auth/UserInfo';

// 현재 시간을 기반으로 식사 타입을 자동 판단하는 함수
const getMealTypeByTime = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
  if (typeof window === 'undefined') return 'lunch'; // 서버에서는 기본값

  const now = new Date();
  const hour = now.getHours();

  if (hour >= 6 && hour < 11) return 'breakfast';  // 06:00~11:00 아침
  if (hour >= 11 && hour < 15) return 'lunch';     // 11:00~15:00 점심
  if (hour >= 15 && hour < 18) return 'snack';     // 15:00~18:00 간식
  if (hour >= 18 && hour < 23) return 'dinner';    // 18:00~23:00 저녁

  // 23:00~06:00는 간식으로 처리
  return 'snack';
};

// 백엔드에서 이미 변환된 결과를 그대로 사용하는 함수
const processBackendResult = (backendResult: any) => {
  try {
    console.log('백엔드 결과 처리:', backendResult);

    // 백엔드에서 이미 변환된 결과가 있는지 확인
    if (backendResult.result && typeof backendResult.result === 'object') {
      // 백엔드에서 변환된 결과 사용
      const result = backendResult.result;

      // 백엔드 결과 구조에 맞게 반환
      return {
        food_name: result.food_name || '분석된 음식',
        total_mass: result.total_mass || 0,
        total_calories: result.total_calories || 0,
        total_protein: result.total_protein || 0,
        total_carbs: result.total_carbs || 0,
        total_fat: result.total_fat || 0,
        overall_grade: result.overall_grade || 'UNKNOWN',
        confidence_score: result.confidence_score || 0.5,
        food_details: result.food_details || [],
        needs_manual_input: result.needs_manual_input || false,
        original_result: result
      };
    } else {
      // 원본 ML 결과인 경우 (백엔드 변환 실패)
      console.log('원본 ML 결과 감지, 프론트엔드에서 처리');
      const mlResult = backendResult.result || backendResult;
      const massEstimation = mlResult.mass_estimation || {};
      const foods = massEstimation.foods || [];
      const totalMass = massEstimation.total_mass_g || 0;

      if (foods.length > 0) {
        const food = foods[0]; // 첫 번째 음식만 처리
        return {
          food_name: food.food_name || '분석된 음식',
          total_mass: totalMass,
          total_calories: 0, // CSV에서 찾지 못했으므로 0
          total_protein: 0,
          total_carbs: 0,
          total_fat: 0,
          overall_grade: 'UNKNOWN',
          confidence_score: food.confidence || 0.5,
          food_details: [{
            name: food.food_name || '분석된 음식',
            mass: food.estimated_mass_g || 0,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            grade: 'UNKNOWN',
            confidence: food.confidence || 0.5,
            needs_manual_input: true
          }],
          needs_manual_input: true,
          original_result: mlResult
        };
      } else {
        return {
          food_name: '분석된 음식',
          total_mass: totalMass,
          total_calories: 0,
          total_protein: 0,
          total_carbs: 0,
          total_fat: 0,
          overall_grade: 'UNKNOWN',
          confidence_score: 0.5,
          food_details: [],
          needs_manual_input: true,
          original_result: mlResult
        };
      }
    }
  } catch (error) {
    console.error('백엔드 결과 처리 오류:', error);
    return {
      food_name: '처리 오류',
      total_mass: 0,
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
      overall_grade: 'UNKNOWN',
      confidence_score: 0.5,
      food_details: [],
      needs_manual_input: true
    };
  }
};

function ResultPageContent() {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [aiCoaching, setAiCoaching] = useState('');
  const [isCoachingLoading, setIsCoachingLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showFoodDetails, setShowFoodDetails] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(getMealTypeByTime());

  useEffect(() => {
    // 세션 스토리지에서 이미지 URL과 분석 결과 가져오기
    const storedImageUrl = sessionStorage.getItem('uploadedImage');
    const storedResult = sessionStorage.getItem('analysisResult');

    if (storedImageUrl) {
      setImageUrl(storedImageUrl);
    }

    if (storedResult) {
      try {
        const result = JSON.parse(storedResult);
        console.log('분석 결과 파싱:', result);

        // 백엔드에서 변환된 결과 처리
        const processedResult = processBackendResult(result);
        console.log('처리된 결과:', processedResult);
        setAnalysisResult(processedResult);
      } catch (error) {
        console.error('Error parsing analysis result:', error);
        console.error('Stored result:', storedResult);
        // 파싱 실패 시 기본값 설정
        setAnalysisResult({
          food_name: '분석 오류 - 세션 스토리지 확인 필요',
          total_mass: 0,
          total_calories: 0,
          total_protein: 0,
          total_carbs: 0,
          total_fat: 0,
          overall_grade: 'UNKNOWN',
          confidence_score: 0.5,
          food_details: [],
          needs_manual_input: true
        });
      }
    } else {
      console.log('세션 스토리지에 분석 결과가 없습니다.');
      // 세션 스토리지에 결과가 없는 경우
      setAnalysisResult({
        food_name: '분석 결과 없음 - 다시 업로드해주세요',
        total_mass: 0,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        overall_grade: 'UNKNOWN',
        confidence_score: 0.5,
        food_details: [],
        needs_manual_input: true
      });
    }
  }, []);

  const handleGetCoaching = async () => {
    setIsCoachingLoading(true);
    setAiCoaching('');

    try {
      const response = await fetch('/api/ai/coaching/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'detailed_meal_analysis',
          meal_data: {
            food_name: analysisResult?.food_name || '분석된 음식',
            calories: analysisResult?.total_calories || 0,
            protein: analysisResult?.total_protein || 0,
            carbs: analysisResult?.total_carbs || 0,
            fat: analysisResult?.total_fat || 0,
            mass: analysisResult?.total_mass || 0,
            grade: analysisResult?.overall_grade || 'B',
            confidence: analysisResult?.confidence_score || 0.5,
            food_details: analysisResult?.food_details || [],
            needs_manual_input: analysisResult?.needs_manual_input || false
          }
        })
      });

      const result = await response.json();
      if (result.coaching) {
        setAiCoaching(result.coaching);
      } else {
        setAiCoaching("AI 코칭을 받는데 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("AI Coaching Error:", error);
      setAiCoaching("오류가 발생했습니다. 네트워크 연결을 확인해주세요.");
    } finally {
      setIsCoachingLoading(false);
    }
  };

  const handleNavigate = async () => {
    try {
      let finalImageUrl = imageUrl;

      // MLServer에서 이미 저장된 이미지 URL 사용 (중복 업로드 방지)
      const mlTaskId = sessionStorage.getItem('mlTaskId');
      if (mlTaskId) {
        try {
          // API 클라이언트를 통해 MLServer 작업에서 이미지 URL 가져오기
          const taskData = await apiClient.getMLServerTaskStatus(mlTaskId);
          if (taskData.success && taskData.data.image_file) {
            finalImageUrl = taskData.data.image_file;
            console.log('MLServer에서 이미지 URL 가져옴:', finalImageUrl);
          }
        } catch (error) {
          console.error('MLServer 이미지 URL 가져오기 실패:', error);
        }
      }

      // blob URL인 경우에만 새로 업로드 (fallback)
      if (imageUrl && imageUrl.startsWith('blob:') && !finalImageUrl.startsWith('/media/')) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], 'meal-image.jpg', { type: 'image/jpeg' });

          const uploadResult = await apiClient.uploadImageFile(file);
          finalImageUrl = uploadResult.image_url;

          console.log('Fallback 이미지 업로드 완료:', finalImageUrl);
        } catch (uploadError) {
          console.error('이미지 업로드 실패:', uploadError);
          finalImageUrl = '';
        }
      }

      // 식단 데이터를 백엔드에 저장
      const mealData = {
        date: new Date().toISOString().split('T')[0],
        mealType: selectedMealType, // 사용자가 선택한 식사 시간
        foodName: analysisResult?.food_name || '분석된 음식',
        calories: analysisResult?.total_calories || 0,
        protein: analysisResult?.total_protein || 0,
        carbs: analysisResult?.total_carbs || 0,
        fat: analysisResult?.total_fat || 0,
        nutriScore: analysisResult?.overall_grade || 'B',
        imageUrl: finalImageUrl || '',
        time: new Date().toTimeString().split(' ')[0]
      };

      console.log('🍽️ 식단 데이터 저장 시작...');
      console.log('데이터:', mealData);

      try {
        console.log('API 호출 전 데이터 검증:', {
          date: mealData.date,
          mealType: mealData.mealType,
          foodName: mealData.foodName,
          calories: mealData.calories,
          dataType: typeof mealData.calories
        });

        const mealResult = await apiClient.createMeal(mealData);
        console.log('✅ 식단 저장 성공:', mealResult);
      } catch (error) {
        console.error('❌ 식단 저장 실패:', error);
        console.error('에러 상세:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : 'No stack'
        });
        alert(`식단 저장에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }

      // 게임화 포인트 업데이트 (임시 비활성화)
      // await fetch('/api/gamification/update/', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ action: 'record_meal' })
      // });

      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving meal:', error);
      // 에러가 있어도 대시보드로 이동
      router.push('/dashboard');
    }
  };

  const handleReset = () => {
    sessionStorage.removeItem('uploadedImage');
    router.push('/');
  };



  return (
    <>
      <UserInfo />
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center p-4">
        <div className="w-full max-w-4xl flex flex-col space-y-6 animate-fade-in">

          {/* 헤더 */}
          <header className="text-center py-6">
            <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'NanumGothic', color: 'var(--point-green)' }}>
              분석 완료
            </h1>
            <p className="text-gray-400">AI가 분석한 음식 정보를 확인하고 저장하세요</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 왼쪽: 이미지 및 기본 정보 */}
            <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600 space-y-6">
              <img
                src={imageUrl || "https://placehold.co/600x400/121212/eaeaea?text=분석된+음식+사진"}
                alt="분석된 음식 사진"
                className="rounded-xl w-full h-auto object-cover max-h-80"
              />

              {/* 음식 기본 정보 */}
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--point-green)', fontFamily: 'NanumGothic' }}>
                  {analysisResult?.food_name || '분석된 음식'}
                </h2>
                <div className="flex justify-center items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">질량:</span>
                    <span className="text-white font-medium">
                      {Math.round((analysisResult?.total_mass || 0) * 10) / 10}g
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${analysisResult?.overall_grade === 'A' ? 'bg-green-500' :
                      analysisResult?.overall_grade === 'B' ? 'bg-yellow-500' :
                        analysisResult?.overall_grade === 'C' ? 'bg-orange-500' : 'bg-red-500'
                    }`}>
                    등급 {analysisResult?.overall_grade || 'B'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">신뢰도:</span>
                    <span className="text-white font-medium">
                      {Math.round((analysisResult?.confidence_score || 0.5) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 식사 시간 선택 */}
              <div>
                <h3 className="text-lg font-bold mb-4 text-center" style={{ color: 'var(--point-green)', fontFamily: 'NanumGothic' }}>
                  식사 시간 선택
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'breakfast', label: '아침', icon: '🌅', time: '06:00-11:00' },
                    { key: 'lunch', label: '점심', icon: '☀️', time: '11:00-15:00' },
                    { key: 'snack', label: '간식', icon: '🍪', time: '15:00-18:00' },
                    { key: 'dinner', label: '저녁', icon: '🌙', time: '18:00-23:00' }
                  ].map((meal) => (
                    <button
                      key={meal.key}
                      onClick={() => setSelectedMealType(meal.key as any)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${selectedMealType === meal.key
                          ? 'border-[var(--point-green)] bg-[var(--point-green)]/10 text-[var(--point-green)]'
                          : 'border-gray-600 bg-gray-800/30 text-gray-300 hover:border-gray-500 hover:bg-gray-800/50'
                        }`}
                    >
                      <div className="text-2xl mb-2">{meal.icon}</div>
                      <div className="font-medium mb-1">{meal.label}</div>
                      <div className="text-xs text-gray-500">{meal.time}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽: 영양 정보 및 상세 */}
            <div className="space-y-6">

              {/* 칼로리 정보 */}
              <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
                <h3 className="text-lg font-bold mb-4 text-center" style={{ color: 'var(--point-green)', fontFamily: 'NanumGothic' }}>
                  칼로리 정보
                </h3>
                <div className="text-center mb-4">
                  <p className="text-5xl font-black mb-2" style={{ color: 'var(--point-green)' }}>
                    {analysisResult?.total_calories || 0}
                  </p>
                  <p className="text-xl text-gray-400">kcal</p>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                  <div
                    className="bg-[var(--point-green)] h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((analysisResult?.total_calories || 0) / 2000 * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  일일 권장량 (2000kcal)의 {Math.round((analysisResult?.total_calories || 0) / 2000 * 100)}%
                </p>
              </div>

              {/* 영양소 정보 */}
              <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
                <h3 className="text-lg font-bold mb-4 text-center" style={{ color: 'var(--point-green)', fontFamily: 'NanumGothic' }}>
                  영양소 분석
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-800/30 rounded-xl">
                    <div className="text-2xl mb-2">🥩</div>
                    <p className="text-sm text-gray-400 mb-1">단백질</p>
                    <p className="text-xl font-bold text-blue-400">
                      {analysisResult?.total_protein || 0}g
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-800/30 rounded-xl">
                    <div className="text-2xl mb-2">🍞</div>
                    <p className="text-sm text-gray-400 mb-1">탄수화물</p>
                    <p className="text-xl font-bold text-yellow-400">
                      {analysisResult?.total_carbs || 0}g
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-800/30 rounded-xl">
                    <div className="text-2xl mb-2">🥑</div>
                    <p className="text-sm text-gray-400 mb-1">지방</p>
                    <p className="text-xl font-bold text-red-400">
                      {analysisResult?.total_fat || 0}g
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 칼로리 */}
          <div>
            <h2 className="text-lg text-gray-400">총 칼로리</h2>
            <p className="text-6xl font-black my-2" style={{ color: 'var(--point-green)' }}>
              {analysisResult?.total_calories || 0} <span className="text-4xl">kcal</span>
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div className="bg-[var(--point-green)] h-2.5 rounded-full" style={{
                width: `${Math.min((analysisResult?.total_calories || 0) / 2000 * 100, 100)}%`
              }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">
              일일 권장량의 {Math.round((analysisResult?.total_calories || 0) / 2000 * 100)}%
            </p>
          </div>

          {/* 영양소 정보 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400">단백질</p>
              <p className="text-xl font-bold text-blue-400">
                {analysisResult?.total_protein || 0}g
              </p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400">탄수화물</p>
              <p className="text-xl font-bold text-yellow-400">
                {analysisResult?.total_carbs || 0}g
              </p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400">지방</p>
              <p className="text-xl font-bold text-red-400">
                {analysisResult?.total_fat || 0}g
              </p>
            </div>
          </div>

          {/* 음식별 상세 정보 */}
          {analysisResult?.food_details && analysisResult.food_details.length > 0 && (
            <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
              <button
                onClick={() => setShowFoodDetails(!showFoodDetails)}
                className="w-full flex items-center justify-between p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors"
              >
                <h3 className="text-lg font-bold" style={{ color: 'var(--point-green)', fontFamily: 'NanumGothic' }}>
                  음식별 상세 정보
                </h3>
                <span className={`text-gray-400 transition-transform ${showFoodDetails ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {showFoodDetails && (
                <div className="mt-4 space-y-3 animate-fade-in">
                  {analysisResult.food_details.map((food: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-800/20 rounded-xl border border-gray-700">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">{food.name}</span>
                          {food.matched_name && food.matched_name !== food.name && (
                            <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                              매칭: {food.matched_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {food.needs_manual_input ? (
                            <span className="px-3 py-1 rounded-full text-xs bg-gray-600 text-white">
                              수동입력필요
                            </span>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${food.grade === 'A' ? 'bg-green-500' :
                                food.grade === 'B' ? 'bg-yellow-500' :
                                  food.grade === 'C' ? 'bg-orange-500' :
                                    food.grade === 'D' ? 'bg-red-500' :
                                      food.grade === 'E' ? 'bg-red-700' : 'bg-gray-500'
                              }`}>
                              {food.grade === 'UNKNOWN' ? '미확인' : food.grade}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                            {Math.round(food.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      {food.needs_manual_input ? (
                        <div className="text-center py-6 bg-yellow-900/20 rounded-lg border border-yellow-600">
                          <div className="text-3xl mb-2">⚠️</div>
                          <p className="text-yellow-400 text-sm mb-3">
                            데이터베이스에 없는 음식입니다
                          </p>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                            영양정보 직접 입력
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">질량</p>
                            <p className="text-sm font-medium text-white">
                              {Math.round((food.mass || 0) * 10) / 10}g
                            </p>
                          </div>
                          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">칼로리</p>
                            <p className="text-sm font-medium text-white">{food.calories}kcal</p>
                          </div>
                          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">단백질</p>
                            <p className="text-sm font-medium text-blue-400">{food.protein}g</p>
                          </div>
                          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">탄수화물</p>
                            <p className="text-sm font-medium text-yellow-400">{food.carbs}g</p>
                          </div>
                          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">지방</p>
                            <p className="text-sm font-medium text-red-400">{food.fat}g</p>
                          </div>
                        </div>
                      )}

                      {!food.found_in_db && !food.needs_manual_input && (
                        <div className="mt-3 p-2 bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                          <p className="text-xs text-yellow-400">
                            ⚠️ 추정값입니다. 정확한 정보를 위해 직접 입력을 권장합니다.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 수동 입력 필요 알림 */}
          {analysisResult?.needs_manual_input && (
            <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-yellow-600">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">⚠️</div>
                <div>
                  <h3 className="text-lg font-bold text-yellow-400 mb-2" style={{ fontFamily: 'NanumGothic' }}>
                    영양정보 입력 필요
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    일부 음식이 데이터베이스에 없어 정확한 영양정보를 제공할 수 없습니다.
                    더 정확한 분석을 위해 영양정보를 직접 입력해주세요.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI 식단 코칭 */}
          <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
            <button
              onClick={handleGetCoaching}
              disabled={isCoachingLoading}
              className="w-full bg-gradient-to-r from-[var(--point-green)] to-green-400 text-black font-bold py-4 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ fontFamily: 'NanumGothic' }}
            >
              {isCoachingLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  <span>AI가 분석 중...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <span className="text-xl">🤖</span>
                  <span>AI 식단 코칭 받기</span>
                  <span className="text-xl">✨</span>
                </div>
              )}
            </button>

            {aiCoaching && (
              <div className="mt-6 p-6 bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl border border-gray-700/50 animate-fade-in">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-3xl">🤖</span>
                  <h4 className="text-xl font-bold text-[var(--point-green)]" style={{ fontFamily: 'NanumGothic' }}>
                    AI 영양 코치의 조언
                  </h4>
                </div>
                <div className="prose prose-invert max-w-none">
                  <FormattedAiResponse text={aiCoaching} />
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleNavigate}
              className="bg-[var(--point-green)] text-black font-bold py-4 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              style={{ fontFamily: 'NanumGothic' }}
            >
              <div className="flex items-center justify-center space-x-2">
                <span>📊</span>
                <span>대시보드로 이동</span>
              </div>
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-700 text-white font-bold py-4 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:bg-gray-600"
              style={{ fontFamily: 'NanumGothic' }}
            >
              <div className="flex items-center justify-center space-x-2">
                <span>🔄</span>
                <span>다시 분석하기</span>
              </div>
            </button>
          </div>

          {/* 푸터 */}
          <footer className="text-center py-6 text-gray-500 text-sm">
            <p>분석 결과는 AI 추정값이며, 실제 영양정보와 다를 수 있습니다.</p>
          </footer>
        </div>
      </div>
    </>
  );
}

// Dynamic import로 클라이언트에서만 렌더링
const DynamicResultPage = dynamic(() => Promise.resolve(ResultPageContent), {
  ssr: false,
  loading: () => (
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--point-green)] mx-auto mb-4"></div>
        <p className="text-gray-400">결과를 불러오는 중...</p>
      </div>
    </div>
  )
});

export default function ResultPage() {
  return <DynamicResultPage />;
}