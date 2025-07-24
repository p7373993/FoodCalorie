'use client';

import React, { useState, useEffect } from 'react';
import { ChallengeRoom } from '@/types';
import { apiClient } from '@/lib/api';
import ChallengeRoomCard from './ChallengeRoomCard';

interface ChallengeRoomListProps {
  onRoomSelect?: (room: ChallengeRoom) => void;
  showJoinButton?: boolean;
}

const ChallengeRoomList: React.FC<ChallengeRoomListProps> = ({
  onRoomSelect,
  showJoinButton = true,
}) => {
  const [rooms, setRooms] = useState<ChallengeRoom[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<ChallengeRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [calorieFilter, setCalorieFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  useEffect(() => {
    loadChallengeRooms();
  }, []);

  useEffect(() => {
    filterRooms();
  }, [rooms, searchTerm, calorieFilter]);

  const loadChallengeRooms = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getChallengeRooms();
      
      if (response.success && response.data) {
        setRooms(response.data);
        setError(null);
      } else {
        setError(response.error || '챌린지 방 목록을 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Error loading challenge rooms:', err);
      setError('챌린지 방 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterRooms = () => {
    let filtered = rooms;

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 칼로리 범위 필터링
    if (calorieFilter !== 'all') {
      filtered = filtered.filter(room => {
        switch (calorieFilter) {
          case 'low':
            return room.target_calorie <= 1500;
          case 'medium':
            return room.target_calorie > 1500 && room.target_calorie <= 2000;
          case 'high':
            return room.target_calorie > 2000;
          default:
            return true;
        }
      });
    }

    setFilteredRooms(filtered);
  };

  const handleRoomClick = (room: ChallengeRoom) => {
    if (onRoomSelect) {
      onRoomSelect(room);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--point-green)]"></div>
        <p className="mt-4 text-gray-400">챌린지 방 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">오류가 발생했습니다</h3>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={loadChallengeRooms}
          className="bg-[var(--point-green)] text-black font-bold py-2 px-4 rounded-lg hover:bg-green-400 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* 검색 및 필터 섹션 */}
      <div className="mb-6 space-y-4">
        {/* 검색바 */}
        <div className="relative">
          <input
            type="text"
            placeholder="챌린지 방 이름이나 설명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--card-bg)] text-white px-4 py-3 pl-12 rounded-lg border border-gray-600 focus:border-[var(--point-green)] focus:outline-none transition-colors"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* 칼로리 필터 */}
        <div className="flex flex-wrap gap-2">
          <span className="text-gray-300 text-sm self-center">칼로리 범위:</span>
          {[
            { key: 'all', label: '전체' },
            { key: 'low', label: '1500kcal 이하' },
            { key: 'medium', label: '1500-2000kcal' },
            { key: 'high', label: '2000kcal 초과' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCalorieFilter(key as any)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                calorieFilter === key
                  ? 'bg-[var(--point-green)] text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">
          챌린지 방 ({filteredRooms.length}개)
        </h2>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-gray-400 hover:text-white text-sm"
          >
            검색 초기화
          </button>
        )}
      </div>

      {/* 챌린지 방 목록 */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchTerm || calorieFilter !== 'all' ? '검색 결과가 없습니다' : '아직 생성된 챌린지 방이 없습니다'}
          </h3>
          <p className="text-gray-400">
            {searchTerm || calorieFilter !== 'all' 
              ? '다른 검색어나 필터를 시도해보세요.' 
              : '첫 번째 챌린지 방이 곧 만들어질 예정입니다!'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <ChallengeRoomCard
              key={room.id}
              room={room}
              onSelect={() => handleRoomClick(room)}
              showJoinButton={showJoinButton}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChallengeRoomList; 