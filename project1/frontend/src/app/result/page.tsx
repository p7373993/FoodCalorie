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
        setAnalysisResult(result);
      } catch (error) {
        console.error('Error parsing analysis result:', error);
      }
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
            calories: analysisResult?.result?.calories || 580,
            food_name: analysisResult?.result?.food_type || '분석된 음식'
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
          calories: analysisResult?.result?.calories || 580,
          analysis_data: analysisResult?.result || { food_type: '분석된 음식' },
          ml_task_id: sessionStorage.getItem('mlTaskId'),
          estimated_mass: analysisResult?.result?.estimated_mass,
          confidence_score: analysisResult?.result?.confidence_score
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
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center flex flex-col items-center justify-center space-y-6">
        <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6 space-y-6 animate-fade-in-slow">
          <img 
            src={imageUrl || "https://placehold.co/600x400/121212/eaeaea?text=분석된+음식+사진"} 
            alt="분석된 음식 사진" 
            className="rounded-lg w-full h-auto object-contain max-h-60"
          />
          
          <div>
            <h2 className="text-lg text-gray-400">총 칼로리</h2>
            <p className="text-6xl font-black my-2" style={{ color: 'var(--point-green)' }}>
              {analysisResult?.result?.calories || 580} <span className="text-4xl">kcal</span>
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div className="bg-[var(--point-green)] h-2.5 rounded-full" style={{ width: "29%" }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">일일 권장량의 29%</p>
          </div>
          
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