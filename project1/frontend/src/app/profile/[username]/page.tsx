'use client';

import { BadgeCollection } from '@/components/profile/BadgeCollection';
import { useEffect, useState, use } from 'react';
import { apiClient } from '@/lib/api';
import { MealLog } from '@/types';

interface ProfilePageProps {
  params: { username: string };
}

interface UserStats {
  total_records: number;
  total_calories: number;
  avg_calories: number;
  recent_records: MealLog[];
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username } = use(params);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      setLoadingStats(true);
      try {
        const stats = await apiClient.getUserProfileStats(username);
        setUserStats(stats);
      } catch (error) {
        console.error("Failed to fetch user stats:", error);
        setErrorStats('네트워크 오류 또는 서버 오류가 발생했습니다.');
      } finally {
        setLoadingStats(false);
      }
    };

    fetchUserStats();
  }, [username]);

  return (
    <div className="space-y-8">
      {/* 프로필 헤더 */}
      <div className="flex items-center space-x-6 rounded-2xl border bg-white text-card-foreground shadow-lg p-8">
        <div className="w-24 h-24 rounded-full bg-pastel-blue flex items-center justify-center shadow-lg">
          {/* 캐릭터/아바타 이미지 (샘플) */}
          <span className="text-5xl">🧑‍🎤</span>
        </div>
        <div>
          <h1 className="text-3xl font-noto font-extrabold text-foreground mb-1">{username}님의 프로필</h1>
          <p className="text-base text-muted-foreground font-noto">나의 뱃지와 챌린지 기록을 확인하세요</p>
        </div>
      </div>

      {/* 사용자 통계 */}
      <div className="rounded-2xl border bg-white text-card-foreground shadow-lg p-8">
        <h2 className="text-2xl font-nanum mb-6">나의 통계</h2>
        {loadingStats ? (
          <p>통계 로딩 중...</p>
        ) : errorStats ? (
          <p className="text-destructive">{errorStats}</p>
        ) : userStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <h3 className="text-xl font-bold">총 기록</h3>
              <p className="text-3xl text-primary">{userStats.total_records}</p>
            </div>
            <div className="card p-4 text-center">
              <h3 className="text-xl font-bold">총 섭취 칼로리</h3>
              <p className="text-3xl text-primary">{userStats.total_calories} kcal</p>
            </div>
            <div className="card p-4 text-center">
              <h3 className="text-xl font-bold">평균 섭취 칼로리</h3>
              <p className="text-3xl text-primary">{userStats.avg_calories} kcal</p>
            </div>
            <div className="card p-4 col-span-full">
              <h3 className="text-xl font-bold mb-2">최근 식사 기록</h3>
              {userStats.recent_records.length > 0 ? (
                <ul>
                  {userStats.recent_records.map((record) => (
                    <li key={record.id} className="mb-1 text-muted-foreground">
                      {record.date} - {record.foodName} ({record.calories} kcal)
                    </li>
                  ))}
                </ul>
              ) : (
                <p>최근 식사 기록이 없습니다.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* 뱃지 컬렉션 */}
      <div className="rounded-2xl border bg-white text-card-foreground shadow-lg p-8">
        <BadgeCollection username={username} />
      </div>
    </div>
  );
}