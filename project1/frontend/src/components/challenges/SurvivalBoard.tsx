'use client';

import React, { useState, useEffect } from 'react';
import { Users, Trophy, Calendar, Target, Skull, Heart, Crown } from 'lucide-react';
import { format, getDaysInMonth, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { apiClient } from '@/lib/api';
import { Challenge, ChallengeParticipant } from '@/types';

// ChallengeProgress 타입 정의 (간단 버전)
interface ChallengeProgress {
  id: string;
  date: string;
  target_achieved: boolean;
  actual_value?: number;
  notes?: string;
}

interface SurvivalBoardProps {
  challengeId: string;
}

export function SurvivalBoard({ challengeId }: SurvivalBoardProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'survived' | 'eliminated'>('survived');
  const [progressRecords, setProgressRecords] = useState<ChallengeProgress[]>([]); // 변수명 변경

  useEffect(() => {
    const loadChallenge = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getChallengeDetails(challengeId);
        // 필드명/타입 매핑 보정
        const mapped = {
          id: data.id,
          name: data.name,
          description: data.description,
          startDate: data.startDate || data.start_date,
          endDate: data.endDate || data.end_date,
          targetType: data.targetType || data.target_type,
          targetValue: data.targetValue || data.target_value,
          isActive: data.isActive ?? data.is_active ?? true,
          participants: Array.isArray(data.participants)
            ? data.participants
                .filter((p: any) => p && p.user)
                .map((p: any) => ({
                  ...p,
                  user: p.user || { id: '', username: '', nickname: '', email: '', profilePicture: '' }
                }))
            : [],
        };
        setChallenge(mapped);
      } catch (error) {
        console.error('Failed to load challenge:', error);
        // 임시 데이터 사용
        setChallenge({
          id: challengeId,
          name: '7일 칼로리 챌린지',
          description: '7일 동안 매일 1800kcal 이하로 식사하기',
          startDate: '2025-01-15',
          endDate: '2025-01-21',
          targetType: 'calorie',
          targetValue: 1800,
          isActive: true,
          participants: [
            {
              id: '1',
              user: {
                id: '1',
                username: 'user1',
                email: 'user1@example.com',
                nickname: '다이어트왕',
                profilePicture: '/api/placeholder/40/40'
              },
              status: 'survived',
              currentStreak: 5
            }
          ]
        });
      }
      setLoading(false);
    };

    // 진행상황 불러오기
    const loadProgress = async () => {
      try {
        const res = await apiClient.getChallengeProgress(challengeId);
        // API 응답이 { success, data, ... } 형태일 경우
        if (res.data && res.data.length > 0) setProgressRecords(res.data);
        else if (res.length > 0) setProgressRecords(res);
        else {
          // 더미 진행상황 데이터 삽입 (테스트용)
          setProgressRecords([
            { id: '1', date: '2025-07-31', target_achieved: true },
            { id: '2', date: '2025-08-01', target_achieved: true },
            { id: '3', date: '2025-08-02', target_achieved: false },
            { id: '4', date: '2025-08-03', target_achieved: true },
            { id: '5', date: '2025-08-04', target_achieved: true },
            { id: '6', date: '2025-08-05', target_achieved: false },
            { id: '7', date: '2025-08-06', target_achieved: true }
          ]);
        }
      } catch (error) {
        // 더미 진행상황 데이터 삽입 (에러 시)
        setProgressRecords([
          { id: '1', date: '2025-07-31', target_achieved: true },
          { id: '2', date: '2025-08-01', target_achieved: true },
          { id: '3', date: '2025-08-02', target_achieved: false },
          { id: '4', date: '2025-08-03', target_achieved: true },
          { id: '5', date: '2025-08-04', target_achieved: true },
          { id: '6', date: '2025-08-05', target_achieved: false },
          { id: '7', date: '2025-08-06', target_achieved: true }
        ]);
      }
    };

    loadChallenge();
    loadProgress();
  }, [challengeId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4" />
            <div className="h-4 bg-muted rounded w-2/3 mb-2" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">챌린지 정보를 불러오는 중...</div>
      </div>
    );
  }

  // 진행상황 히트맵용 달력 데이터 생성
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(challenge.startDate));
  useEffect(() => {
    setCalendarMonth(new Date(challenge.startDate));
  }, [challenge.startDate]);

  const daysInMonth = getDaysInMonth(calendarMonth);
  const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const startDay = firstDayOfMonth.getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i + 1));
  const leadingEmpty = Array.from({ length: startDay });
  const totalCells = startDay + daysInMonth;
  const trailingEmpty = Array.from({ length: (7 - (totalCells % 7)) % 7 });

  // 날짜별 성공/실패/미기록 매핑
  const progressMap = progressRecords.reduce((acc, rec) => {
    acc[rec.date] = rec.target_achieved;
    return acc;
  }, {} as Record<string, boolean>);

  // streak 계산
  const streak = (() => {
    let max = 0, cur = 0;
    calendarDays.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (progressMap[dateStr]) {
        cur += 1;
        max = Math.max(max, cur);
      } else {
        cur = 0;
      }
    });
    return max;
  })();

  // 히트맵용 성공률 계산
  const calendarTotalDays = calendarDays.length;
  const successDays = calendarDays.filter(date => progressMap[format(date, 'yyyy-MM-dd')]).length;
  const successRate = calendarTotalDays > 0 ? Math.round((successDays / calendarTotalDays) * 100) : 0;

  // 기존 전체 기간 대비 진행률 계산
  const periodTotalDays = Math.max(1, Math.ceil((new Date(challenge.endDate).getTime() - new Date(challenge.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const daysPassed = Math.max(0, Math.min(periodTotalDays, Math.ceil((new Date().getTime() - new Date(challenge.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1));
  const periodProgress = Math.round((daysPassed / periodTotalDays) * 100);

  const calculateDaysLeft = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 생존자/탈락자 분리 및 방어
  const survivedParticipants = Array.isArray(challenge?.participants) ? challenge.participants.filter(p => p?.status === 'survived' && p?.user) : [];
  const eliminatedParticipants = Array.isArray(challenge?.participants) ? challenge.participants.filter(p => p?.status === 'eliminated' && p?.user) : [];

  // 생존자를 연속 기록 순으로 정렬 (user가 없을 때도 방어)
  const sortedSurvived = [...survivedParticipants].sort((a, b) => (b?.currentStreak || 0) - (a?.currentStreak || 0));

  const ParticipantCard = ({ participant, isEliminated = false }: { participant: ChallengeParticipant; isEliminated?: boolean }) => {
    const isLeader = !isEliminated && participant.id === sortedSurvived[0]?.id;
    
    return (
      <div className={`card p-4 transition-all ${
        isEliminated 
          ? 'opacity-60 bg-muted/20' 
          : 'hover:shadow-md'
      }`}>
        <div className="flex items-center space-x-3">
          {/* 프로필 이미지 */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {participant.user?.profilePicture ? (
                <img
                  src={participant.user.profilePicture}
                  alt={participant.user.nickname || '프로필'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-nanum">
                  {participant.user?.nickname?.charAt(0) || '?'}
                </span>
              )}
            </div>
            {isLeader && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                <Crown className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* 사용자 정보 */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium font-nanum">{participant.user?.nickname || '알 수 없음'}</h3>
              {isLeader && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  리더
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              @{participant.user?.username || '알 수 없음'}
            </p>
          </div>

          {/* 상태 표시 */}
          <div className="flex flex-col items-end space-y-1">
            <div className={`flex items-center space-x-1 ${
              isEliminated ? 'text-destructive' : 'text-primary'
            }`}>
              {isEliminated ? (
                <Skull className="w-4 h-4" />
              ) : (
                <Heart className="w-4 h-4" />
              )}
              <span className="text-sm font-medium font-nanum">
                {isEliminated ? '탈락' : '생존'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-nanum">
              {isEliminated ? (
                participant.eliminationDate && 
                `${format(new Date(participant.eliminationDate), 'M월 d일')} 탈락`
              ) : (
                `${participant.currentStreak}일 연속`
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const daysLeft = calculateDaysLeft(challenge.endDate);

  // 참여자 셀 현황판용 (번호 부여, user 방어)
  const allParticipants = Array.isArray(challenge?.participants) ? challenge.participants.map((p, idx) => ({ ...p, number: idx + 1, user: p.user || { id: '', username: '', nickname: '', email: '', profilePicture: '' } })) : [];
  const total = allParticipants.length;
  const survived = survivedParticipants.length;
  const eliminated = eliminatedParticipants.length;
  const progress = total > 0 ? Math.round((survived / total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* 챌린지 정보 + 전체 기간 대비 진행률 (상단) */}
      <div className="flex flex-col md:flex-row gap-8 items-center justify-center card p-8">
        <div className="flex-1 min-w-[240px]">
          <h2 className="text-2xl font-nanum mb-2">챌린지 정보</h2>
          <p className="text-muted-foreground mb-4 text-base font-nanum">{challenge.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <div className="text-base text-muted-foreground font-nanum">기간</div>
                <div className="font-medium font-nanum">
                  {format(new Date(challenge.startDate), 'M월 d일')} - {format(new Date(challenge.endDate), 'M월 d일')}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <div className="text-base text-muted-foreground font-nanum">목표</div>
                <div className="font-medium font-nanum">
                  {challenge.targetValue}
                  {challenge.targetType === 'calorie' && 'kcal'}
                  {challenge.targetType === 'macro' && 'g'}
                  {challenge.targetType === 'weight' && 'kg'}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <div className="text-base text-muted-foreground font-nanum">참여자</div>
                <div className="font-medium font-nanum">{challenge.participants.length}명</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-primary" />
              <div>
                <div className="text-base text-muted-foreground font-nanum">
                  {challenge.isActive ? '남은 기간' : '완료'}
                </div>
                <div className="font-medium font-nanum">
                  {challenge.isActive ? (daysLeft > 0 ? `${daysLeft}일` : '종료') : '완료'}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* 전체 기간 대비 진행률 원형 그래프 (확대) */}
        <div className="flex flex-col items-center justify-center min-w-[160px]">
          <span className="text-lg text-primary font-nanum mb-2">기간 진행률</span>
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 rotate-[-90deg]" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="52" fill="none" stroke="#eee" strokeWidth="12" />
              <circle
                cx="64" cy="64" r="52" fill="none"
                stroke="#38bdf8" strokeWidth="12"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - periodProgress / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center text-3xl font-nanum text-sky-400">{periodProgress}%</span>
            <span className="absolute bottom-4 left-0 right-0 text-base text-muted-foreground text-center font-nanum">{daysPassed} / {periodTotalDays}일</span>
          </div>
        </div>
      </div>

      {/* 진행상황(Progress) 히트맵 시각화 */}
      <div className="card p-6">
        <h2 className="text-xl font-nanum mb-2">챌린지 진행 히트맵</h2>
        <div className="mb-2 flex items-center gap-6">
          <span className="font-nanum">최장 streak: <b>{streak}</b>일</span>
          <span className="font-nanum">성공률: <b>{successRate}%</b></span>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일','월','화','수','목','금','토'].map(day => (
              <div key={day} className="text-center text-xs text-muted-foreground font-nanum">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {leadingEmpty.map((_, idx) => <div key={`empty-start-${idx}`} />)}
            {calendarDays.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const status = progressMap[dateStr];
              let bg = 'bg-gray-200';
              if (status === true) bg = 'bg-green-400';
              else if (status === false) bg = 'bg-red-400';
              return (
                <div
                  key={dateStr}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-nanum text-xs text-white ${bg}`}
                  title={dateStr + (status === true ? ' 성공' : status === false ? ' 실패' : ' 미기록')}
                >
                  {format(date, 'd')}
                </div>
              );
            })}
            {trailingEmpty.map((_, idx) => <div key={`empty-end-${idx}`} />)}
          </div>
          <div className="flex gap-4 mt-2 text-xs font-nanum">
            <span className="flex items-center"><span className="inline-block w-4 h-4 rounded bg-green-400 mr-1" />성공</span>
            <span className="flex items-center"><span className="inline-block w-4 h-4 rounded bg-red-400 mr-1" />실패</span>
            <span className="flex items-center"><span className="inline-block w-4 h-4 rounded bg-gray-200 mr-1" />미기록</span>
          </div>
        </div>
      </div>

      {/* 진행상황(Progress) 시각화 */}
      <div className="card p-6">
        <h2 className="text-xl font-nanum mb-2">나의 챌린지 진행상황</h2>
        {progressRecords.length === 0 ? (
          <div className="text-muted-foreground">진행상황 데이터가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[320px] text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1">날짜</th>
                  <th className="px-2 py-1">달성</th>
                  <th className="px-2 py-1">실제값</th>
                  <th className="px-2 py-1">메모</th>
                </tr>
              </thead>
              <tbody>
                {progressRecords.map((p) => (
                  <tr key={p.id} className={p.target_achieved ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="px-2 py-1">{p.date}</td>
                    <td className="px-2 py-1 font-bold">{p.target_achieved ? '성공' : '실패'}</td>
                    <td className="px-2 py-1">{p.actual_value ?? '-'}</td>
                    <td className="px-2 py-1">{p.notes ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 참여자 현황판 + 생존율 (하단) */}
      <div className="flex flex-col md:flex-row gap-8 items-center justify-center card p-8">
        {/* 서바이벌 보드판 */}
        <div className="flex-1 min-w-[320px]">
          <h2 className="text-2xl font-nanum mb-2">참여자 현황</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-2 rounded-xl bg-muted/40">
            {allParticipants.map((p) => (
              <div
                key={p.id}
                className={`flex flex-col items-center justify-center rounded-lg border p-1 h-20 transition-all
                  ${p.status === 'survived' ? 'bg-yellow-100 border-yellow-300' : 'bg-gray-200 border-gray-300 opacity-40'}
                `}
                title={p.user.nickname}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden mb-1 border border-white">
                  {p.user.profilePicture ? (
                    <img src={p.user.profilePicture} alt={p.user.nickname} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-nanum">{p.user.nickname.charAt(0)}</span>
                  )}
                </div>
                <span className="text-base font-nanum">{p.number}</span>
                <span className="text-xs font-nanum truncate max-w-[56px]">{p.user.nickname}</span>
              </div>
            ))}
          </div>
        </div>
        {/* 생존율 원형 그래프 (확대) */}
        <div className="flex flex-col items-center justify-center min-w-[160px]">
          <span className="text-lg text-primary font-nanum mb-2">생존율</span>
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 rotate-[-90deg]" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="52" fill="none" stroke="#eee" strokeWidth="12" />
              <circle
                cx="64" cy="64" r="52" fill="none"
                stroke="#fbbf24" strokeWidth="12"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - progress / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center text-3xl font-nanum text-primary">{progress}%</span>
            <span className="absolute bottom-4 left-0 right-0 text-base text-muted-foreground text-center font-nanum">{survived} / {total}명</span>
          </div>
        </div>
      </div>
    </div>
  );
} 