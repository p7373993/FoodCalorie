'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FormattedAiResponse from '@/components/ui/FormattedAiResponse';

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
          type: 'meal_feedback',
          meal_data: {
            food_name: analysisResult?.food_name || '분석된 음식',
            calories: analysisResult?.total_calories || 0,
            protein: analysisResult?.total_protein || 0,
            carbs: analysisResult?.total_carbs || 0,
            fat: analysisResult?.total_fat || 0,
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
          calories: analysisResult?.total_calories || 0,
          protein: analysisResult?.total_protein || 0,
          carbs: analysisResult?.total_carbs || 0,
          fat: analysisResult?.total_fat || 0,
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
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-300">음식별 상세 정보</h3>
              <div className="space-y-2">
                {analysisResult.food_details.map((food: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{food.name}</span>
                        {food.matched_name && food.matched_name !== food.name && (
                          <span className="text-xs text-gray-500">
                            (매칭: {food.matched_name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {food.needs_manual_input ? (
                          <span className="px-2 py-1 rounded text-xs bg-gray-600 text-white">
                            수동입력필요
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs ${
                            food.grade === 'A' ? 'bg-green-500' :
                            food.grade === 'B' ? 'bg-yellow-500' :
                            food.grade === 'C' ? 'bg-orange-500' :
                            food.grade === 'D' ? 'bg-red-500' :
                            food.grade === 'E' ? 'bg-red-700' : 'bg-gray-500'
                          }`}>
                            {food.grade === 'UNKNOWN' ? '미확인' : food.grade}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {Math.round(food.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    {food.needs_manual_input ? (
                      <div className="text-center py-4">
                        <p className="text-yellow-400 text-sm mb-2">
                          데이터베이스에 없는 음식입니다. 직접 입력해주세요.
                        </p>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                          영양정보 직접 입력
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-400">
                        <div>질량: {food.mass}g</div>
                        <div>칼로리: {food.calories}kcal</div>
                        <div>단백질: {food.protein}g</div>
                        <div>지방: {food.fat}g</div>
                      </div>
                    )}
                    
                    {!food.found_in_db && !food.needs_manual_input && (
                      <div className="mt-2 text-xs text-yellow-400">
                        ⚠️ 추정값입니다. 정확한 정보를 위해 직접 입력을 권장합니다.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 수동 입력 필요 알림 */}
          {analysisResult?.needs_manual_input && (
            <div className="p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-yellow-400">⚠️</span>
                <span className="font-medium text-yellow-400">영양정보 입력 필요</span>
              </div>
              <p className="text-sm text-gray-300">
                일부 음식이 데이터베이스에 없어 정확한 영양정보를 제공할 수 없습니다. 
                더 정확한 분석을 위해 영양정보를 직접 입력해주세요.
              </p>
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