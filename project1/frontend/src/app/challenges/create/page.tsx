'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateChallengePage() {
  const router = useRouter();
  const [title, setTitle] = useState(''); 
  const [description, setDescription] = useState(''); 
  const [type, setType] = useState<'CALORIE_LIMIT' | 'PROTEIN_MINIMUM'>('CALORIE_LIMIT'); 
  const [goal, setGoal] = useState(2000);

  const handleCreate = async () => { 
    if (!title || !description) return; 
    
    try { 
      const response = await fetch('/api/challenges/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type,
          goal
        })
      });

      if (response.ok) {
        // 게임화 포인트 업데이트
        await fetch('/api/gamification/update/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_challenge' })
        });

        router.push('/challenges');
      }
    } catch (e) { 
      console.error('Error creating challenge:', e); 
    } 
  };

  const handleBack = () => {
    router.push('/challenges');
  };

  return (
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col space-y-6 animate-fade-in">
        <header className="w-full flex justify-between items-center">
          <h1 className="text-4xl font-black" style={{ color: 'var(--point-green)' }}>새 챌린지</h1>
          <button 
            onClick={handleBack} 
            className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            취소
          </button>
        </header>

        <div className="w-full bg-[var(--card-bg)] p-6 rounded-2xl space-y-4 text-left">
          <div>
            <label className="font-bold">챌린지 제목</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full bg-gray-900 p-2 rounded-md mt-1 text-white"
              placeholder="챌린지 제목을 입력하세요"
            />
          </div>

          <div>
            <label className="font-bold">설명</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-gray-900 p-2 rounded-md mt-1 text-white h-24 resize-none"
              placeholder="챌린지에 대한 설명을 입력하세요"
            />
          </div>

          <div>
            <label className="font-bold">종류</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value as any)} 
              className="w-full bg-gray-900 p-2 rounded-md mt-1 text-white"
            >
              <option value="CALORIE_LIMIT">하루 칼로리 제한</option>
              <option value="PROTEIN_MINIMUM">하루 최소 단백질</option>
            </select>
          </div>

          <div>
            <label className="font-bold">
              목표값 ({type === 'CALORIE_LIMIT' ? 'kcal 이하' : 'g 이상'})
            </label>
            <input 
              type="number" 
              value={goal} 
              onChange={e => setGoal(Number(e.target.value))} 
              className="w-full bg-gray-900 p-2 rounded-md mt-1 text-white"
              min="1"
            />
          </div>

          <button 
            onClick={handleCreate} 
            disabled={!title || !description}
            className="w-full bg-[var(--point-green)] text-black font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            생성하기
          </button>
        </div>
      </div>
    </div>
  );
}