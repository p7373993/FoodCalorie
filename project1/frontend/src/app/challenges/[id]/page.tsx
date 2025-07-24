'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'CALORIE_LIMIT' | 'PROTEIN_MINIMUM';
  goal: number;
  creator: string;
  participants: string[];
  participant_count: number;
}

export default function ChallengeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);

  useEffect(() => {
    const loadChallenge = async () => {
      try {
        const response = await fetch(`/api/challenges/${params.id}/`);
        const data = await response.json();
        setChallenge(data);
        
        // TODO: 현재 사용자가 참가자인지 확인하는 로직 추가
        // setIsParticipant(data.participants.includes(currentUserId));
      } catch (error) {
        console.error('Error loading challenge:', error);
      }
    };

    if (params.id) {
      loadChallenge();
    }
  }, [params.id]);

  const handleJoinChallenge = async () => { 
    if (!challenge) return; 
    
    try { 
      const response = await fetch(`/api/challenges/${challenge.id}/join/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // 게임화 포인트 업데이트
        await fetch('/api/gamification/update/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join_challenge' })
        });

        setIsParticipant(true);
        // 챌린지 데이터 새로고침
        const updatedResponse = await fetch(`/api/challenges/${params.id}/`);
        const updatedData = await updatedResponse.json();
        setChallenge(updatedData);
      }
    } catch (e) { 
      console.error('Error joining challenge:', e); 
    } 
  };

  const handleBack = () => {
    router.push('/challenges');
  };

  if (!challenge) {
    return (
      <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xl">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col space-y-6 animate-fade-in">
        <header className="w-full flex justify-between items-center">
          <h1 className="text-3xl font-black truncate" style={{ color: 'var(--point-green)' }}>
            {challenge.title}
          </h1>
          <button 
            onClick={handleBack} 
            className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            뒤로
          </button>
        </header>

        <div className="w-full bg-[var(--card-bg)] p-6 rounded-2xl space-y-4 text-left">
          <p className="text-gray-300">{challenge.description}</p>
          <p className="font-bold">
            목표: {challenge.goal}{challenge.type === 'CALORIE_LIMIT' ? 'kcal 이하' : 'g 이상'}
          </p>
          <p className="text-sm text-gray-400">
            생성자: {challenge.creator}
          </p>
          
          {!isParticipant && (
            <button 
              onClick={handleJoinChallenge} 
              className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg transition-transform hover:scale-105"
            >
              참가하기
            </button>
          )}
          
          {isParticipant && (
            <div className="w-full bg-green-600/20 border border-green-500 p-3 rounded-lg text-center">
              <p className="text-green-400 font-bold">✓ 참가 중</p>
            </div>
          )}
        </div>

        <div className="w-full bg-[var(--card-bg)] p-6 rounded-2xl text-left">
          <h2 className="text-xl font-bold mb-4">
            참가자 랭킹 ({challenge.participant_count}명)
          </h2>
          <ul className="space-y-2">
            {challenge.participants.map((p, i) => (
              <li key={p} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-md">
                <span className="font-mono text-sm">
                  #{i + 1} {p.substring(0, 12)}...
                </span>
              </li>
            ))}
          </ul>
          
          {challenge.participants.length === 0 && (
            <p className="text-gray-400 text-center">아직 참가자가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}