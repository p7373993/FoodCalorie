'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { BarChart, PieChart } from '@/components/charts'; // 차트 컴포넌트가 있다고 가정

interface StatisticsData {
  daily_avg: number;
  weekly_avg: number;
  monthly_avg: number;
  pie_data: { name: string; value: number }[];
  grade_distribution: { grade: string; calories: number; count: number }[];
  score_distribution: number[];
  total_records: number;
  total_calories: number;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const stats = await apiClient.getUserStatistics();
        setStats(stats);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
        setError('네트워크 오류 또는 서버 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-4">통계 데이터 로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive">오류: {error}</div>;
  }

  if (!stats) {
    return <div className="p-4">통계 데이터를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-8 p-4">
      <h1 className="text-3xl font-bold mb-6">나의 영양 통계</h1>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 text-center">
          <h2 className="text-xl font-bold">일일 평균 칼로리</h2>
          <p className="text-3xl text-primary">{stats.daily_avg} kcal</p>
        </div>
        <div className="card p-6 text-center">
          <h2 className="text-xl font-bold">주간 평균 칼로리</h2>
          <p className="text-3xl text-primary">{stats.weekly_avg} kcal</p>
        </div>
        <div className="card p-6 text-center">
          <h2 className="text-xl font-bold">월간 평균 칼로리</h2>
          <p className="text-3xl text-primary">{stats.monthly_avg} kcal</p>
        </div>
      </div>

      {/* 음식 종류별 비율 (파이 차트) */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">음식 종류별 섭취 비율</h2>
        {stats.pie_data.length > 0 ? (
          <PieChart data={stats.pie_data} />
        ) : (
          <p>데이터가 없습니다.</p>
        )}
      </div>

      {/* 등급별 분포 (바 차트 또는 히트맵) */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">칼로리 등급별 분포</h2>
        {stats.grade_distribution.length > 0 ? (
          <BarChart data={stats.grade_distribution.map(d => ({ name: d.grade, value: d.count }))} />
        ) : (
          <p>데이터가 없습니다.</p>
        )}
      </div>

      {/* 점수 분포 (바 차트) */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">영양 점수 분포</h2>
        {stats.score_distribution.length > 0 ? (
          <BarChart data={stats.score_distribution.map(s => ({ name: String(s), value: 1 }))} />
        ) : (
          <p>데이터가 없습니다.</p>
        )}
      </div>

      {/* 총 기록 및 총 칼로리 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6 text-center">
          <h2 className="text-xl font-bold">총 식사 기록</h2>
          <p className="text-3xl text-primary">{stats.total_records} 건</p>
        </div>
        <div className="card p-6 text-center">
          <h2 className="text-xl font-bold">총 섭취 칼로리</h2>
          <p className="text-3xl text-primary">{stats.total_calories} kcal</p>
        </div>
      </div>
    </div>
  );
}
