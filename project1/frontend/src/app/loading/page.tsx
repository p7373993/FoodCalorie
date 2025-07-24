'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoadingPage() {
  const router = useRouter();
  const tips = [
    "물은 칼로리가 없어요. 하루 8잔 이상 마시면 신진대사에 도움이 됩니다.",
    "식사 전 물 한 컵은 포만감을 주어 과식을 막아줍니다.",
    "음식은 천천히, 20번 이상 씹어보세요. 뇌가 포만감을 느낄 시간을 벌 수 있어요."
  ];
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex(prevIndex => (prevIndex + 1) % tips.length);
    }, 4000);
    return () => clearInterval(tipInterval);
  }, [tips.length]);

  useEffect(() => {
    const taskId = sessionStorage.getItem('mlTaskId');

    if (taskId) {
      // WebSocket 연결로 실시간 진행상황 수신
      const wsUrl = `ws://localhost:8000/mlserver/ws/task/${taskId}/`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'task_completed') {
          // 분석 완료 시 결과 저장하고 결과 페이지로 이동
          sessionStorage.setItem('analysisResult', JSON.stringify(data.data));
          router.push('/result');
        } else if (data.type === 'task_failed') {
          // 분석 실패 시 에러 처리
          console.error('Analysis failed:', data.data.error);
          router.push('/result'); // 에러가 있어도 결과 페이지로 이동
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // WebSocket 연결 실패 시 5초 후 결과 페이지로 이동
        setTimeout(() => {
          router.push('/result');
        }, 5000);
      };

      return () => {
        ws.close();
      };
    } else {
      // taskId가 없으면 5초 후 결과 페이지로 이동 (기존 동작)
      const timer = setTimeout(() => {
        router.push('/result');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [router]);

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center p-4 pt-8">
      <div className="w-full max-w-2xl text-center flex flex-col items-center space-y-8 animate-fade-in">
        <div className="animate-logo-pulse">
          <h1 className="text-6xl font-black" style={{ color: 'var(--point-green)' }}>체감</h1>
        </div>
        <p className="text-xl" style={{ color: 'var(--text-light)' }}>AI가 사진을 분석하고 있습니다...</p>
        <div className="w-full bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6 min-h-[120px] flex flex-col justify-center items-center">
          <h3 className="text-lg font-bold" style={{ color: 'var(--point-green)' }}>오늘의 다이어트 팁!</h3>
          <p className="text-md mt-2 text-gray-300 transition-opacity duration-500">{tips[currentTipIndex]}</p>
        </div>
        <button
          onClick={handleCancel}
          className="w-full max-w-xs bg-gray-700 text-white font-bold py-3 rounded-lg transition-transform hover:scale-105"
        >
          분석 취소
        </button>
      </div>
    </div>
  );
}