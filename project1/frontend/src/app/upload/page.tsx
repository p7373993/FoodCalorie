'use client';

import React, { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserInfo from '@/components/auth/UserInfo';
import { useAuthState } from '@/contexts/AuthContext';
import { FoodRecommendations } from '@/components/dashboard/FoodRecommendations';
import { AIRecommendationModal } from '@/components/ui/AIRecommendationModal';

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthState();
  const [isAIRecommendationOpen, setIsAIRecommendationOpen] = useState(false);
  
  // 로그인 상태 확인
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [router, isAuthenticated, isLoading]);
  
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      const file = event.target.files[0];
      
      // 로컬 이미지 URL 생성 (미리보기용)
      const imageUrl = URL.createObjectURL(file);
      sessionStorage.setItem('uploadedImage', imageUrl);
      
      try {
        // API 클라이언트를 통해 백엔드 MLServer API에 이미지 업로드
        const { apiClient } = await import('@/lib/api');
        const result = await apiClient.uploadImageToMLServer(file);
        
        console.log('업로드 결과:', result);
        
        if (result.success && result.data?.task_id) {
          sessionStorage.setItem('mlTaskId', result.data.task_id);
          console.log('MLServer 작업 시작:', result.data.task_id);
          router.push('/loading');
        } else {
          console.error('MLServer 응답 오류:', result.error || '알 수 없는 오류');
          // 에러가 있어도 로딩 페이지로 이동 (데모용)
          router.push('/loading');
        }
      } catch (error) {
        console.error('MLServer 업로드 에러:', error);
        // 에러가 발생해도 로딩 페이지로 이동 (데모용)
        router.push('/loading');
      }
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <>
      <UserInfo />
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center p-4 pt-8">
        <div className="w-full max-w-2xl text-center flex flex-col items-center space-y-12 relative">
          <header className="animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-black" style={{ color: 'var(--point-green)' }}>
              체감
            </h1>
            <p className="text-lg md:text-xl mt-4 animate-slogan-typing" style={{ color: 'var(--text-light)' }}>
              오로지 한 장으로 변화한다
            </p>
          </header>
          
          <main className="w-full animate-fade-in-delay-1 space-y-8">
            <label 
              htmlFor="food-upload" 
              className="cursor-pointer bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-full p-4 md:p-6 flex items-center justify-center w-full max-w-lg mx-auto transition-all duration-300 hover:bg-gray-700/70 hover:border-green-400/50 hover:shadow-[0_0_25px_0_rgba(0,255,163,0.5)]"
            >
              <span className="text-2xl mr-4">📷</span>
              <span className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-light)' }}>
                음식 사진 올리기
              </span>
            </label>
            <input 
              type="file" 
              id="food-upload" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />

            {/* AI 추천 섹션 */}
            <div className="w-full max-w-lg mx-auto">
              <div className="text-center mb-4">
                <p className="text-gray-400 text-sm">또는</p>
              </div>
              
              <button
                onClick={() => setIsAIRecommendationOpen(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-6 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
              >
                <span className="text-2xl mr-4">🤖</span>
                <span className="text-lg">AI 음식 추천받기</span>
              </button>
            </div>

            {/* 간단한 추천 미리보기 */}
            <div className="w-full max-w-2xl mx-auto">
              <FoodRecommendations mealType="lunch" className="bg-gray-800/30 backdrop-blur-sm border border-gray-700" />
            </div>
          </main>
          
          <footer className="text-gray-500 text-sm animate-fade-in-delay-2">
            <p>© 2024 Chegam. All Rights Reserved.</p>
          </footer>
        </div>

        {/* AI 추천 모달 */}
        <AIRecommendationModal
          isOpen={isAIRecommendationOpen}
          onClose={() => setIsAIRecommendationOpen(false)}
          initialType="personalized"
        />
      </div>
    </>
  );
} 