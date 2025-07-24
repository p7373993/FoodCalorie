'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'CALORIE_LIMIT' | 'PROTEIN_MINIMUM';
  goal: number;
  creator: string;
  participant_count: number;
}

export default function ChallengeListPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    const loadChallenges = async () => {
      try {
        const response = await fetch('/api/challenges/');
        const data = await response.json();
        setChallenges(data);
      } catch (error) {
        console.error('Error loading challenges:', error);
      }
    };

    loadChallenges();
  }, []);

  const handleGoToCreate = () => {
    router.push('/challenges/create');
  };

  const handleGoToDetail = (challenge: Challenge) => {
    router.push(`/challenges/${challenge.id}`);
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  return (
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col space-y-6 animate-fade-in">
        <header className="w-full flex justify-between items-center">
          <h1 className="text-4xl font-black" style={{ color: 'var(--point-green)' }}>챌린지</h1>
          <div>
            <button 
              onClick={handleGoToCreate} 
              className="bg-[var(--point-green)] text-black font-bold py-2 px-4 rounded-lg mr-2"
            >
              새 챌린지 만들기
            </button>
            <button 
              onClick={handleBack} 
              className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              뒤로
            </button>
          </div>
        </header>

        <div className="space-y-4">
          {challenges.map(c => (
            <button 
              key={c.id} 
              onClick={() => handleGoToDetail(c)} 
              className="w-full bg-[var(--card-bg)] p-6 rounded-2xl text-left flex justify-between items-center hover:border-[var(--point-green)] border border-transparent transition-colors"
            >
              <div>
                <h2 className="text-xl font-bold">{c.title}</h2>
                <p className="text-sm text-gray-400 mt-1">{c.description}</p>
                <p className="text-sm text-gray-300 mt-2">
                  목표: {c.goal}{c.type === 'CALORIE_LIMIT' ? 'kcal 이하' : 'g 이상'}
                </p>
              </div>
              <p className="text-sm text-gray-500">참가자: {c.participant_count}명</p>
            </button>
          ))}
          
          {challenges.length === 0 && (
            <div className="w-full bg-[var(--card-bg)] p-6 rounded-2xl text-center">
              <p className="text-gray-400">아직 생성된 챌린지가 없습니다.</p>
              <p className="text-gray-500 text-sm mt-2">첫 번째 챌린지를 만들어보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}