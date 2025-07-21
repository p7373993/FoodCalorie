'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, Target, Trophy, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api';
import { Challenge } from '@/types';
import Link from 'next/link';
import { SurvivalBoard } from './SurvivalBoard';

export function ChallengeList() {
  const [recommendedChallenges, setRecommendedChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommended' | 'my'>('recommended');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    target_type: 'calorie',
    target_value: '',
    max_participants: '',
    max_failures: '',
    meal_count: '',
  });
  const [formError, setFormError] = useState('');
  const [joinLoading, setJoinLoading] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [myCalorieChallenge, setMyCalorieChallenge] = useState<Challenge | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    setForm({
      name: '', description: '', start_date: '', end_date: '',
      target_type: 'calorie', target_value: '', max_participants: '', max_failures: '', meal_count: ''
    });
    setFormError('');
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    // 필수값 체크
    if (!form.name || !form.description || !form.start_date || !form.end_date || !form.target_type || !form.target_value) {
      setFormError('모든 필수 항목을 입력하세요.');
      return;
    }
    try {
      const payload: any = {
        name: form.name,
        description: form.description,
        startDate: form.start_date, // camelCase로 변환
        endDate: form.end_date,
        targetType: form.target_type,
        targetValue: Number(form.target_value),
        isActive: true,
      };
      if (form.max_participants) payload.maxParticipants = Number(form.max_participants);
      if (form.max_failures) payload.maxFailures = Number(form.max_failures);
      if (form.meal_count) payload.mealCount = Number(form.meal_count);
      await apiClient.createChallenge(payload);
      closeModal();
      // 챌린지 목록 새로고침
      setLoading(true);
      const [recommended, my] = await Promise.all([
        apiClient.getRecommendedChallenges(),
        apiClient.getMyChallenges()
      ]);
      setRecommendedChallenges(recommended);
      setMyChallenges(my);
      setLoading(false);
    } catch (error) {
      setFormError('챌린지 생성에 실패했습니다.');
    }
  };

  const handleJoin = async (challengeId: string) => {
    setJoinLoading(challengeId);
    setJoinError(null);
    try {
      await apiClient.joinChallenge(challengeId);
      // 목록 새로고침
      setLoading(true);
      const [recommended, my] = await Promise.all([
        apiClient.getRecommendedChallenges(),
        apiClient.getMyChallenges()
      ]);
      setRecommendedChallenges(recommended);
      setMyChallenges(my);
      setLoading(false);
    } catch (error) {
      setJoinError('참여에 실패했습니다.');
    }
    setJoinLoading(null);
  };

  const handleShowDetail = async (challengeId: string) => {
    try {
      const detail = await apiClient.getChallengeDetails(challengeId);
      setSelectedChallenge(detail);
      setShowDetailModal(true);
    } catch (error) {
      alert('챌린지 상세 정보를 불러오지 못했습니다.');
    }
  };

  const handleLeave = async (challengeId: string) => {
    setLeaveLoading(challengeId);
    setLeaveError(null);
    try {
      await apiClient.leaveChallenge(challengeId);
      setShowDetailModal(false);
      // 목록 새로고침
      setLoading(true);
      const [recommended, my] = await Promise.all([
        apiClient.getRecommendedChallenges(),
        apiClient.getMyChallenges()
      ]);
      setRecommendedChallenges(recommended);
      setMyChallenges(my);
      setLoading(false);
    } catch (error) {
      setLeaveError('탈퇴에 실패했습니다.');
    }
    setLeaveLoading(null);
  };

  useEffect(() => {
    const loadChallenges = async () => {
      setLoading(true);
      try {
        const [recommended, my] = await Promise.all([
          apiClient.getRecommendedChallenges(),
          apiClient.getMyChallenges()
        ]);
        setRecommendedChallenges(recommended);
        setMyChallenges(my);
      } catch (error) {
        console.error('Failed to load challenges:', error);
        setRecommendedChallenges([]); // 에러 발생 시 빈 배열로 설정
        setMyChallenges([]); // 에러 발생 시 빈 배열로 설정
      }
      setLoading(false);
    };

    loadChallenges();
  }, []);

  useEffect(() => {
    // 내 칼로리 챌린지 참여 여부 확인
    const calorie = myChallenges.find(c => c.targetType === 'calorie');
    setMyCalorieChallenge(calorie || null);
  }, [myChallenges]);

  // 챌린지 삭제 핸들러
  const handleDelete = async (challengeId: string) => {
    setDeleteLoading(challengeId);
    setDeleteError(null);
    try {
      await apiClient.deleteChallenge(challengeId);
      // 목록 새로고침
      setLoading(true);
      const [recommended, my] = await Promise.all([
        apiClient.getRecommendedChallenges(),
        apiClient.getMyChallenges()
      ]);
      setRecommendedChallenges(recommended);
      setMyChallenges(my);
      setLoading(false);
    } catch (error: any) {
      setDeleteError('삭제에 실패했습니다.');
    }
    setDeleteLoading(null);
  };

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case 'calorie': return '칼로리';
      case 'macro': return '영양소';
      case 'weight': return '체중';
      default: return type;
    }
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'calorie': return Zap;
      case 'macro': return Target;
      case 'weight': return Trophy;
      default: return Target;
    }
  };

  const calculateDaysLeft = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const ChallengeCard = ({ challenge }: { challenge: Challenge }) => {
    const TargetIcon = getTargetIcon(challenge.targetType);
    const daysLeft = calculateDaysLeft(challenge.endDate);
    const participants = Array.isArray(challenge.participants) ? challenge.participants : [];
    const isMyCalorie = myCalorieChallenge && myCalorieChallenge.id !== challenge.id && challenge.targetType === 'calorie';
    const isOwner = participants[0]?.user?.username === localStorage.getItem('username');
    
    return (
      <div className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TargetIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-nanum font-nanum">{challenge.name}</h3>
              <p className="text-sm text-muted-foreground font-nanum">
                {getTargetTypeLabel(challenge.targetType)} 목표
              </p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            challenge.isActive 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {challenge.isActive ? '진행 중' : '종료'}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 font-nanum">
          {challenge.description}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>기간</span>
            </div>
            <div className="text-sm font-medium mt-1">
              {format(new Date(challenge.startDate), 'M월 d일')} - {format(new Date(challenge.endDate), 'M월 d일')}
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>참여자</span>
            </div>
            <div className="text-sm font-medium mt-1">
              {participants.length}명
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-nanum">
            <span className="text-muted-foreground">목표: </span>
            <span className="font-medium font-nanum">
              {challenge.targetValue}
              {challenge.targetType === 'calorie' && 'kcal'}
              {challenge.targetType === 'macro' && 'g'}
              {challenge.targetType === 'weight' && 'kg'}
            </span>
          </div>
          
          {challenge.isActive && (
            <div className="text-sm font-nanum">
              <span className="text-muted-foreground">남은 기간: </span>
              <span className="font-medium text-primary font-nanum">
                {daysLeft > 0 ? `${daysLeft}일` : '종료'}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex gap-2 mt-4">
            <button
              className="btn-primary flex-1"
              onClick={() => handleJoin(challenge.id)}
              disabled={isMyCalorie}
              title={isMyCalorie ? '칼로리 챌린지는 한 번에 하나만 참여할 수 있습니다.' : ''}
            >
              참여하기
            </button>
            <Link href={`/challenges/${challenge.id}`} legacyBehavior>
              <a className="btn-secondary">자세히보기</a>
            </Link>
            {isOwner && (
              <button
                className="btn-destructive ml-2"
                onClick={() => handleDelete(challenge.id)}
                disabled={deleteLoading === challenge.id}
              >
                {deleteLoading === challenge.id ? '삭제 중...' : '삭제'}
              </button>
            )}
          </div>
          {joinError && <div className="text-red-500 text-sm mt-2">{joinError}</div>}
          {deleteError && <div className="text-red-500 text-sm mt-2">{deleteError}</div>}
          {isMyCalorie && <div className="text-yellow-600 text-xs mt-1">칼로리 챌린지는 한 번에 하나만 참여할 수 있습니다.</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 탭 메뉴 */}
      <div className="flex space-x-4 border-b border-border">
        <button
          onClick={() => setActiveTab('recommended')}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'recommended'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          추천 챌린지
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'my'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          내 챌린지
        </button>
      </div>

      {/* 챌린지 생성 버튼 */}
      <div className="flex justify-end">
        <button className="btn-primary flex items-center space-x-2" onClick={openModal}>
          <Plus className="w-4 h-4" />
          <span>새 챌린지 생성</span>
        </button>
      </div>

      {/* 챌린지 생성 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">새 챌린지 생성</h2>
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <input name="name" value={form.name} onChange={handleFormChange} placeholder="챌린지명*" className="input w-full" required />
              <textarea name="description" value={form.description} onChange={handleFormChange} placeholder="설명*" className="input w-full" required />
              <div className="flex space-x-2">
                <input type="date" name="start_date" value={form.start_date} onChange={handleFormChange} className="input w-1/2" required />
                <input type="date" name="end_date" value={form.end_date} onChange={handleFormChange} className="input w-1/2" required />
              </div>
              <div className="flex space-x-2">
                <select name="target_type" value={form.target_type} onChange={handleFormChange} className="input w-1/2" required>
                  <option value="calorie">칼로리</option>
                  <option value="macro">영양소</option>
                  <option value="weight">체중</option>
                </select>
                <input name="target_value" value={form.target_value} onChange={handleFormChange} placeholder="목표값*" className="input w-1/2" required />
              </div>
              <input name="max_participants" value={form.max_participants} onChange={handleFormChange} placeholder="최대 참가자 수(선택)" className="input w-full" type="number" min="1" />
              <input name="max_failures" value={form.max_failures} onChange={handleFormChange} placeholder="최대 실패 가능 횟수(선택)" className="input w-full" type="number" min="1" />
              <input name="meal_count" value={form.meal_count} onChange={handleFormChange} placeholder="하루 식사 횟수(선택)" className="input w-full" type="number" min="1" />
              {formError && <div className="text-red-500 text-sm">{formError}</div>}
              <div className="flex justify-end space-x-2 mt-2">
                <button type="button" className="btn-secondary" onClick={closeModal}>취소</button>
                <button type="submit" className="btn-primary">생성</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 챌린지 그리드 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3 mb-4" />
                <div className="h-12 bg-muted rounded mb-4" />
                <div className="h-8 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'recommended' ? (recommendedChallenges || []) : (myChallenges || [])).map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && (
        <>
          {activeTab === 'recommended' && (recommendedChallenges || []).length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">추천 챌린지가 없습니다</h3>
              <p className="text-muted-foreground">
                새로운 챌린지가 곧 추가될 예정입니다
              </p>
            </div>
          )}
          {activeTab === 'my' && (myChallenges || []).length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">참여 중인 챌린지가 없습니다</h3>
              <p className="text-muted-foreground">
                추천 챌린지에서 원하는 챌린지를 찾아보세요
              </p>
            </div>
          )}
        </>
      )}
      {/* 상세 모달 */}
      {showDetailModal && selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full relative">
            <button className="absolute top-2 right-2" onClick={() => setShowDetailModal(false)}>
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-2">{selectedChallenge.name}</h2>
            <p className="mb-4 text-muted-foreground">{selectedChallenge.description}</p>
            <div className="mb-4">
              <SurvivalBoard challengeId={selectedChallenge.id} />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="btn-destructive px-4 py-2"
                onClick={() => handleLeave(selectedChallenge.id)}
                disabled={leaveLoading === selectedChallenge.id}
              >
                {leaveLoading === selectedChallenge.id ? '탈퇴 중...' : '챌린지 탈퇴'}
              </button>
              <button className="btn-secondary px-4 py-2" onClick={() => setShowDetailModal(false)}>
                닫기
              </button>
            </div>
            {leaveError && <div className="text-red-500 mt-2">{leaveError}</div>}
          </div>
        </div>
      )}
    </div>
  );
} 