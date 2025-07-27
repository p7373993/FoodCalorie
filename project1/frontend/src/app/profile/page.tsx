'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserProfile, ProfileUpdateData } from '@/types';
import { ProfileView } from '@/components/profile/ProfileView';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm';
import UserInfo from '@/components/auth/UserInfo';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'password'>('view');

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const userData = localStorage.getItem('user');
    const profileData = localStorage.getItem('profile');
    
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
      if (profileData) {
        setProfile(JSON.parse(profileData));
      }
    } catch (error) {
      console.error('Failed to parse user data:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleProfileUpdate = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    // localStorage 업데이트
    localStorage.setItem('profile', JSON.stringify(updatedProfile));
    setActiveTab('view');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid-pattern">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--point-green)] mx-auto"></div>
          <p className="mt-4 text-gray-400">프로필 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid-pattern">
        <div className="text-center">
          <p className="text-gray-400">사용자 정보를 불러올 수 없습니다.</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-[var(--point-green)] text-black font-bold rounded-lg hover:bg-green-400 transition-colors"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <UserInfo />
      <div className="min-h-screen bg-grid-pattern py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">프로필 관리</h1>
            <p className="mt-2 text-gray-400">개인 정보를 관리하고 업데이트하세요</p>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--border-color)] rounded-2xl shadow-sm mb-6">
            <div className="border-b border-[var(--border-color)]">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('view')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'view'
                      ? 'border-[var(--point-green)] text-[var(--point-green)]'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                >
                  프로필 보기
                </button>
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'edit'
                      ? 'border-[var(--point-green)] text-[var(--point-green)]'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                >
                  프로필 수정
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'password'
                      ? 'border-[var(--point-green)] text-[var(--point-green)]'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                >
                  비밀번호 변경
                </button>
              </nav>
            </div>

            {/* 탭 컨텐츠 */}
            <div className="p-6">
              {activeTab === 'view' && (
                <ProfileView 
                  user={user} 
                  profile={profile} 
                  onEditClick={() => setActiveTab('edit')}
                />
              )}
              {activeTab === 'edit' && (
                <ProfileEditForm 
                  user={user}
                  profile={profile} 
                  onSave={handleProfileUpdate}
                  onCancel={() => setActiveTab('view')}
                />
              )}
              {activeTab === 'password' && (
                <PasswordChangeForm 
                  onSuccess={() => setActiveTab('view')}
                  onCancel={() => setActiveTab('view')}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}