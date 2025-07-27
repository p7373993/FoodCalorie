'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { challengeApi } from '@/lib/challengeApi';

interface ChallengeRoom {
  id: number;
  name: string;
  target_calorie: number;
  tolerance: number;
  description: string;
  dummy_users_count: number;
  participants_count?: number;
}

const ChallengeRoomCard = React.memo(({ room, onJoin }: { 
  room: ChallengeRoom; 
  onJoin: (roomId: number) => void; 
}) => {
  const handleJoin = useCallback(() => {
    onJoin(room.id);
  }, [room.id, onJoin]);

  return (
    <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer" onClick={handleJoin}>
      <div className="flex justify-between items-start mb-4 gap-3">
        <h3 className="text-xl font-bold text-[var(--point-green)] flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{room.name}</h3>
        <span className="bg-[var(--point-green)] text-black px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap flex-shrink-0">
          {room.participants_count || 0}명 참여
        </span>
      </div>
      
      <p className="text-gray-300 mb-4">{room.description}</p>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400">목표 칼로리:</span>
          <span className="ml-2 font-bold">{room.target_calorie}kcal</span>
        </div>
        <div>
          <span className="text-gray-400">허용 오차:</span>
          <span className="ml-2 font-bold">±{room.tolerance}kcal</span>
        </div>
      </div>
    </div>
  );
});

ChallengeRoomCard.displayName = 'ChallengeRoomCard';

export default function ChallengeRoomList() {
  const router = useRouter();
  const [rooms, setRooms] = useState<ChallengeRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 검색 필터링된 방 목록
  const filteredRooms = useMemo(() => {
    if (!searchTerm) return rooms;
    return rooms.filter(room => 
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rooms, searchTerm]);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
                    const response = await challengeApi.getChallengeRooms();
       setRooms(response.data?.results || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch challenge rooms:', err);
      setError('챌린지 방 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleJoinChallenge = useCallback((roomId: number) => {
    router.push(`/challenges/${roomId}`);
  }, [router]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--point-green)] mx-auto mb-4"></div>
          <p className="text-gray-400">챌린지 방을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchRooms}
            className="bg-[var(--point-green)] text-black font-bold py-2 px-4 rounded-lg"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center mb-6" style={{ color: 'var(--point-green)' }}>
          챌린지 방 목록
        </h1>
        
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="챌린지 방 검색..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[var(--point-green)]"
          />
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            {searchTerm ? '검색 결과가 없습니다.' : '현재 활성화된 챌린지가 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map(room => (
            <ChallengeRoomCard 
              key={room.id} 
              room={room} 
              onJoin={handleJoinChallenge} 
            />
          ))}
        </div>
      )}
    </div>
  );
} 