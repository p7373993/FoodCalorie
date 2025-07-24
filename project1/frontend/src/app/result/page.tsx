'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FormattedAiResponse from '@/components/ui/FormattedAiResponse';

export default function ResultPage() {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [aiCoaching, setAiCoaching] = useState(''); 
  const [isCoachingLoading, setIsCoachingLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

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
        
        // ML 서버 원본 결과를 영양 정보로 변환
        const processedResult = convertMLResultToNutrition(result);
        setAnalysisResult(processedResult);
      } catch (error) {
        console.error('Error parsing analysis result:', error);
        // 파싱 실패 시 기본값 설정
        setAnalysisResult({
          food_name: '분석 오류',
          total_mass: 0,
          total_calories: 580,
          total_protein: 20,
          total_carbs: 70,
          total_fat: 15,
          overall_grade: 'B',
          confidence_score: 0.5,
          food_details: []
        });
      }
    }
  }, []);

  // ML 서버 결과를 영양 정보로 변환하는 함수
  const convertMLResultToNutrition = (mlResult: any) => {
    try {
      const result = mlResult.result || mlResult;
      const massEstimation = result.mass_estimation || {};
      const foods = massEstimation.foods || [];
      const totalMass = massEstimation.total_mass_g || 0;

      // 음식별 영양 정보 데이터베이스 (100g당)
      const nutritionDB: { [key: string]: any } = {
        '약과': { calories: 400, protein: 6.0, carbs: 65.0, fat: 12.0, grade: 'C' },
        '밥': { calories: 130, protein: 2.7, carbs: 28.0, fat: 0.3, grade: 'B' },
        '김치': { calories: 20, protein: 1.6, carbs: 3.0, fat: 0.4, grade: 'A' },
        '고기': { calories: 250, protein: 26.0, carbs: 0.0, fat: 15.0, grade: 'B' },
        '닭고기': { calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6, grade: 'A' },
        '돼지고기': { calories: 242, protein: 27.0, carbs: 0.0, fat: 14.0, grade: 'B' },
        '소고기': { calories: 250, protein: 26.0, carbs: 0.0, fat: 15.0, grade: 'B' },
        '생선': { calories: 206, protein: 22.0, carbs: 0.0, fat: 12.0, grade: 'A' },
        '야채': { calories: 25, protein: 2.0, carbs: 5.0, fat: 0.2, grade: 'A' },
        '과일': { calories: 50, protein: 0.5, carbs: 12.0, fat: 0.2, grade: 'A' },
        '빵': { calories: 280, protein: 8.0, carbs: 50.0, fat: 6.0, grade: 'C' },
        '면': { calories: 150, protein: 5.0, carbs: 30.0, fat: 1.0, grade: 'B' },
        '계란': { calories: 155, protein: 13.0, carbs: 1.1, fat: 11.0, grade: 'A' },
        '우유': { calories: 42, protein: 3.4, carbs: 5.0, fat: 1.0, grade: 'A' },
        '치즈': { calories: 113, protein: 7.0, carbs: 1.0, fat: 9.0, grade: 'B' },
      };

      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      const foodDetails: any[] = [];

      if (foods.length > 0) {
        foods.forEach((food: any) => {
          const foodName = food.food_name || '알수없음';
          const foodMass = food.estimated_mass_g || 0;
          const confidence = food.confidence || 0.5;

          // 음식명에서 영양 정보 찾기
          let nutritionInfo = nutritionDB['약과']; // 기본값
          for (const [key, value] of Object.entries(nutritionDB)) {
            if (foodName.includes(key)) {
              nutritionInfo = value;
              break;
            }
          }

          // 실제 질량에 따른 영양소 계산
          const ratio = foodMass / 100.0;
          const foodCalories = nutritionInfo.calories * ratio;
          const foodProtein = nutritionInfo.protein * ratio;
          const foodCarbs = nutritionInfo.carbs * ratio;
          const foodFat = nutritionInfo.fat * ratio;

          foodDetails.push({
            name: foodName,
            mass: foodMass,
            calories: Math.round(foodCalories * 10) / 10,
            protein: Math.round(foodProtein * 10) / 10,
            carbs: Math.round(foodCarbs * 10) / 10,
            fat: Math.round(foodFat * 10) / 10,
            grade: nutritionInfo.grade,
            confidence: confidence
          });

          totalCalories += foodCalories;
          totalProtein += foodProtein;
          totalCarbs += foodCarbs;
          totalFat += foodFat;
        });
      } else {
        // 기본값
        totalCalories = totalMass * 2.5;
        totalProtein = totalMass * 0.1;
        totalCarbs = totalMass * 0.3;
        totalFat = totalMass * 0.05;
      }

      // 전체 등급 계산
      const grades = foodDetails.map(f => f.grade);
      const gradeScores: { [key: string]: number } = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
      const avgScore = grades.length > 0 
        ? grades.reduce((sum, grade) => sum + (gradeScores[grade] || 3), 0) / grades.length 
        : 3;
      
      let overallGrade = 'B';
      if (avgScore >= 3.5) overallGrade = 'A';
      else if (avgScore >= 2.5) overallGrade = 'B';
      else if (avgScore >= 1.5) overallGrade = 'C';
      else overallGrade = 'D';

      return {
        food_name: foods.map((f: any) => f.food_name).join(', ') || '분석된 음식',
        total_mass: Math.round(totalMass * 10) / 10,
        total_calories: Math.round(totalCalories * 10) / 10,
        total_protein: Math.round(totalProtein * 10) / 10,
        total_carbs: Math.round(totalCarbs * 10) / 10,
        total_fat: Math.round(totalFat * 10) / 10,
        overall_grade: overallGrade,
        confidence_score: foods.length > 0 ? foods.reduce((sum: number, f: any) => sum + (f.confidence || 0.5), 0) / foods.length : 0.5,
        food_details: foodDetails,
        original_result: result
      };
    } catch (error) {
      console.error('ML 결과 변환 오류:', error);
      return {
        food_name: '변환 오류',
        total_mass: 0,
        total_calories: 580,
        total_protein: 20,
        total_carbs: 70,
        total_fat: 15,
        overall_grade: 'B',
        confidence_score: 0.5,
        food_details: []
      };
    }
  };

  const handleGetCoaching = async () => {
    setIsCoachingLoading(true); 
    setAiCoaching('');
    
    try {
      const response = await fetch('/api/ai/coaching/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'meal_feedback',
          meal_data: {
            food_name: analysisResult?.food_name || '분석된 음식',
            calories: analysisResult?.total_calories || 580,
            protein: analysisResult?.total_protein || 20,
            carbs: analysisResult?.total_carbs || 70,
            fat: analysisResult?.total_fat || 15,
            mass: analysisResult?.total_mass || 0,
            grade: analysisResult?.overall_grade || 'B',
            food_details: analysisResult?.food_details || []
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
      // 식단 데이터를 백엔드에 저장
      await fetch('/api/meals/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl || '',
          calories: analysisResult?.total_calories || 580,
          protein: analysisResult?.total_protein || 20,
          carbs: analysisResult?.total_carbs || 70,
          fat: analysisResult?.total_fat || 15,
          food_name: analysisResult?.food_name || '분석된 음식',
          estimated_mass: analysisResult?.total_mass || 0,
          confidence_score: analysisResult?.confidence_score || 0.5,
          overall_grade: analysisResult?.overall_grade || 'B',
          analysis_data: analysisResult || {},
          ml_task_id: sessionStorage.getItem('mlTaskId')
        })
      });
      
      // 게임화 포인트 업데이트
      await fetch('/api/gamification/update/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_meal' })
      });
      
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
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center p-4 pt-8">
      <div className="w-full max-w-2xl text-center flex flex-col items-center space-y-6">
        <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6 space-y-6 animate-fade-in-slow">
          <img 
            src={imageUrl || "https://placehold.co/600x400/121212/eaeaea?text=분석된+음식+사진"} 
            alt="분석된 음식 사진" 
            className="rounded-lg w-full h-auto object-contain max-h-60"
          />
          
          {/* 음식 정보 */}
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--point-green)' }}>
              {analysisResult?.food_name || '분석된 음식'}
            </h2>
            <div className="flex justify-center items-center space-x-4 mb-4">
              <span className="text-sm text-gray-400">
                질량: {analysisResult?.total_mass || 0}g
              </span>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                analysisResult?.overall_grade === 'A' ? 'bg-green-500' :
                analysisResult?.overall_grade === 'B' ? 'bg-yellow-500' :
                analysisResult?.overall_grade === 'C' ? 'bg-orange-500' : 'bg-red-500'
              }`}>
                등급 {analysisResult?.overall_grade || 'B'}
              </span>
              <span className="text-sm text-gray-400">
                신뢰도: {Math.round((analysisResult?.confidence_score || 0.5) * 100)}%
              </span>
            </div>
          </div>

          {/* 칼로리 */}
          <div>
            <h2 className="text-lg text-gray-400">총 칼로리</h2>
            <p className="text-6xl font-black my-2" style={{ color: 'var(--point-green)' }}>
              {analysisResult?.total_calories || 580} <span className="text-4xl">kcal</span>
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div className="bg-[var(--point-green)] h-2.5 rounded-full" style={{ 
                width: `${Math.min((analysisResult?.total_calories || 580) / 2000 * 100, 100)}%` 
              }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">
              일일 권장량의 {Math.round((analysisResult?.total_calories || 580) / 2000 * 100)}%
            </p>
          </div>

          {/* 영양소 정보 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400">단백질</p>
              <p className="text-xl font-bold text-blue-400">
                {analysisResult?.total_protein || 20}g
              </p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400">탄수화물</p>
              <p className="text-xl font-bold text-yellow-400">
                {analysisResult?.total_carbs || 70}g
              </p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400">지방</p>
              <p className="text-xl font-bold text-red-400">
                {analysisResult?.total_fat || 15}g
              </p>
            </div>
          </div>

          {/* 음식별 상세 정보 */}
          {analysisResult?.food_details && analysisResult.food_details.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-300">음식별 상세 정보</h3>
              <div className="space-y-2">
                {analysisResult.food_details.map((food: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{food.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          food.grade === 'A' ? 'bg-green-500' :
                          food.grade === 'B' ? 'bg-yellow-500' :
                          food.grade === 'C' ? 'bg-orange-500' : 'bg-red-500'
                        }`}>
                          {food.grade}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(food.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-400">
                      <div>질량: {food.mass}g</div>
                      <div>칼로리: {food.calories}kcal</div>
                      <div>단백질: {food.protein}g</div>
                      <div>지방: {food.fat}g</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-left">
            <button 
              onClick={handleGetCoaching} 
              disabled={isCoachingLoading} 
              className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg transition-transform hover:scale-105 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCoachingLoading ? <span className="spinner"></span> : `✨ AI 식단 코칭 받기`}
            </button>
            {aiCoaching && (
              <div className="mt-4 p-4 bg-gray-800/70 rounded-lg">
                <FormattedAiResponse text={aiCoaching} />
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-slow">
          <button 
            onClick={handleNavigate} 
            className="w-full bg-[var(--point-green)] text-black font-bold py-3 rounded-lg transition-transform hover:scale-105 animate-cta-pulse"
          >
            대시보드 보기
          </button>
          <button 
            onClick={handleReset} 
            className="w-full bg-gray-700 text-white font-bold py-3 rounded-lg transition-transform hover:scale-105"
          >
            다시 분석하기
          </button>
        </div>
      </div>
    </div>
  );
}