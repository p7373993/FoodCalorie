'use client';

import React, { useState } from 'react';
import { User, UserProfile, ProfileUpdateData } from '@/types';

interface ProfileEditFormProps {
  user: User;
  profile: UserProfile;
  onSave: (updatedProfile: UserProfile) => void;
  onCancel: () => void;
}

interface FormData {
  nickname: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | '';
  age: number | '';
  height: number | '';
  weight: number | '';
}

export function ProfileEditForm({ user, profile, onSave, onCancel }: ProfileEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(profile.profile_image || null);
  const [formData, setFormData] = useState<FormData>({
    nickname: profile.nickname,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    gender: profile.gender || '',
    age: profile.age || '',
    height: profile.height || '',
    weight: profile.weight || ''
  });
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.nickname) {
      errors.nickname = '닉네임을 입력해주세요.';
    } else if (formData.nickname.length < 2) {
      errors.nickname = '닉네임은 2자 이상이어야 합니다.';
    } else if (formData.nickname.length > 50) {
      errors.nickname = '닉네임은 50자 이하여야 합니다.';
    }

    if (formData.last_name && formData.last_name.length > 30) {
      errors.last_name = '성은 30자 이하여야 합니다.';
    }

    if (formData.first_name && formData.first_name.length > 30) {
      errors.first_name = '이름은 30자 이하여야 합니다.';
    }

    if (formData.age && (Number(formData.age) < 1 || Number(formData.age) > 150)) {
      errors.age = '올바른 나이를 입력해주세요.';
    }

    if (formData.height && (Number(formData.height) < 50 || Number(formData.height) > 300)) {
      errors.height = '올바른 키를 입력해주세요.';
    }

    if (formData.weight && (Number(formData.weight) < 10 || Number(formData.weight) > 500)) {
      errors.weight = '올바른 몸무게를 입력해주세요.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      // API 호출 시뮬레이션 (실제로는 백엔드 API를 호출해야 함)
      const updateData: ProfileUpdateData = {
        nickname: formData.nickname,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        gender: formData.gender || undefined,
        age: formData.age ? Number(formData.age) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined
      };

      // 시뮬레이션된 응답
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedProfile: UserProfile = {
        ...profile,
        nickname: formData.nickname,
        gender: formData.gender || undefined,
        age: formData.age ? Number(formData.age) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        updated_at: new Date().toISOString()
      };

      // 사용자 정보도 업데이트
      const updatedUser: User = {
        ...user,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined
      };

      // localStorage 업데이트
      localStorage.setItem('user', JSON.stringify(updatedUser));

      onSave(updatedProfile);
    } catch (error) {
      console.error('Profile update failed:', error);
      setError('프로필 업데이트에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 입력 시 해당 필드의 에러 제거
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* 프로필 이미지 */}
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="프로필 이미지"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border-2 border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>
        <div>
          <h3 className="text-sm font-medium text-white">프로필 이미지</h3>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG 파일을 업로드하세요 (최대 5MB)</p>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            닉네임 <span className="text-red-400">*</span>
          </label>
          <input
            value={formData.nickname}
            onChange={(e) => handleInputChange('nickname', e.target.value)}
            type="text"
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--point-green)] focus:border-transparent"
            placeholder="닉네임을 입력하세요"
          />
          {formErrors.nickname && (
            <p className="mt-1 text-sm text-red-400">{formErrors.nickname}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">성별</label>
          <select
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--point-green)] focus:border-transparent"
          >
            <option value="">선택하세요</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">성</label>
          <input
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            type="text"
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--point-green)] focus:border-transparent"
            placeholder="성을 입력하세요"
          />
          {formErrors.last_name && (
            <p className="mt-1 text-sm text-red-400">{formErrors.last_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">이름</label>
          <input
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            type="text"
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--point-green)] focus:border-transparent"
            placeholder="이름을 입력하세요"
          />
          {formErrors.first_name && (
            <p className="mt-1 text-sm text-red-400">{formErrors.first_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">나이</label>
          <input
            value={formData.age}
            onChange={(e) => handleInputChange('age', e.target.value)}
            type="number"
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--point-green)] focus:border-transparent"
            placeholder="나이를 입력하세요"
          />
          {formErrors.age && (
            <p className="mt-1 text-sm text-red-400">{formErrors.age}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">키 (cm)</label>
          <input
            value={formData.height}
            onChange={(e) => handleInputChange('height', e.target.value)}
            type="number"
            step="0.1"
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--point-green)] focus:border-transparent"
            placeholder="키를 입력하세요"
          />
          {formErrors.height && (
            <p className="mt-1 text-sm text-red-400">{formErrors.height}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">몸무게 (kg)</label>
          <input
            value={formData.weight}
            onChange={(e) => handleInputChange('weight', e.target.value)}
            type="number"
            step="0.1"
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--point-green)] focus:border-transparent"
            placeholder="몸무게를 입력하세요"
          />
          {formErrors.weight && (
            <p className="mt-1 text-sm text-red-400">{formErrors.weight}</p>
          )}
        </div>
      </div>

      {/* BMI 계산 표시 */}
      {formData.height && formData.weight && (
        <div className="bg-gray-800/50 border border-[var(--point-green)]/30 rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--point-green)] mb-2">BMI 계산</h3>
          <p className="text-sm text-gray-300">
            현재 BMI: {' '}
            <span className="font-bold text-[var(--point-green)]">
              {(Number(formData.weight) / Math.pow(Number(formData.height) / 100, 2)).toFixed(1)}
            </span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            정상 BMI 범위: 18.5 - 24.9
          </p>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800/50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>취소</span>
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--point-green)] text-black font-bold rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>{isLoading ? '저장 중...' : '저장'}</span>
        </button>
      </div>
    </form>
  );
}