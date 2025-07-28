'use client';

import React from 'react';
import { User, UserProfile } from '@/types';

interface ProfileViewProps {
  user: User;
  profile: UserProfile;
  onEditClick: () => void;
}

export function ProfileView({ user, profile, onEditClick }: ProfileViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGenderText = (gender?: string) => {
    switch (gender) {
      case 'male': return '남성';
      case 'female': return '여성';
      default: return '미설정';
    }
  };

  return (
    <div className="space-y-6">
      {/* 프로필 헤더 */}
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {profile.profile_image ? (
              <img
                src={profile.profile_image}
                alt="프로필 이미지"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border-2 border-gray-200 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{profile.nickname}</h2>
          <p className="text-gray-400 flex items-center mt-1">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {user.email}
          </p>
          <p className="text-gray-500 flex items-center mt-1">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 2m8-2l2 2m-2-2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V9" />
            </svg>
            가입일: {formatDate(user.date_joined)}
          </p>
        </div>

        <button
          onClick={onEditClick}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--point-green)] text-black font-bold rounded-lg hover:bg-green-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>수정</span>
        </button>
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-white mb-3">기본 정보</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">닉네임</span>
              <span className="font-medium text-white">{profile.nickname}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">이메일</span>
              <span className="font-medium text-white">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">성별</span>
              <span className="font-medium text-white">{getGenderText(profile.gender)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">나이</span>
              <span className="font-medium text-white">{profile.age ? `${profile.age}세` : '미설정'}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-white mb-3">신체 정보</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">키</span>
              <span className="font-medium text-white">{profile.height ? `${profile.height}cm` : '미설정'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">몸무게</span>
              <span className="font-medium text-white">{profile.weight ? `${profile.weight}kg` : '미설정'}</span>
            </div>
            {profile.height && profile.weight && (
              <div className="flex justify-between">
                <span className="text-gray-400">BMI</span>
                <span className="font-medium text-[var(--point-green)]">
                  {(profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 계정 상태 */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-white mb-3">계정 상태</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${user.is_active ? 'bg-[var(--point-green)]' : 'bg-red-500'}`}></div>
            <span className="text-sm text-white">
              {user.is_active ? '활성 계정' : '비활성 계정'}
            </span>
          </div>
          <div className="text-sm text-gray-400">
            가입일: {formatDate(user.date_joined)}
          </div>
          <div className="text-sm text-gray-400">
            최종 수정: {formatDate(profile.updated_at)}
          </div>
        </div>
      </div>

      {/* 추가 정보 */}
      <div className="bg-gray-800/50 border border-[var(--point-green)]/30 rounded-lg p-4">
        <h3 className="text-sm font-medium text-[var(--point-green)] mb-2">프로필 완성도</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">완성도</span>
            <span className="font-medium text-[var(--point-green)]">
              {Math.round(
                ([
                  profile.nickname,
                  profile.gender,
                  profile.age,
                  profile.height,
                  profile.weight
                ].filter(Boolean).length / 5) * 100
              )}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-[var(--point-green)] h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.round(
                  ([
                    profile.nickname,
                    profile.gender,
                    profile.age,
                    profile.height,
                    profile.weight
                  ].filter(Boolean).length / 5) * 100
                )}%` 
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            프로필을 완성하면 더 정확한 칼로리 추천을 받을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}