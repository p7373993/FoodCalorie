'use client';

import React, { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      const file = event.target.files[0];
      
      // 로컬 이미지 URL 생성 (미리보기용)
      const imageUrl = URL.createObjectURL(file);
      sessionStorage.setItem('uploadedImage', imageUrl);
      
      try {
        // MLServer에 이미지 업로드
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/mlserver/api/upload/', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          sessionStorage.setItem('mlTaskId', result.data.task_id);
        }
      } catch (error) {
        console.error('Error uploading to MLServer:', error);
      }
      
      router.push('/loading');
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center flex flex-col items-center justify-center space-y-12 relative">
        <button 
          onClick={handleGoToDashboard} 
          className="absolute top-0 right-0 bg-gray-800/80 text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 backdrop-blur-sm border border-gray-700"
        >
          대시보드
        </button>
        
        <header className="animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-black" style={{ color: 'var(--point-green)' }}>
            체감
          </h1>
          <p className="text-lg md:text-xl mt-4 animate-slogan-typing" style={{ color: 'var(--text-light)' }}>
            오로지 한 장으로 변화한다
          </p>
        </header>
        
        <main className="w-full animate-fade-in-delay-1">
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
        </main>
        
        <footer className="text-gray-500 text-sm animate-fade-in-delay-2">
          <p>© 2024 Chegam. All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  );
}