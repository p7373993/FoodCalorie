'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SignUpFormData {
  email: string;
  password: string;
  password_confirm: string;
  nickname: string;
}

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>();

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const requestData = {
        email: data.email,
        password: data.password,
        password_confirm: data.password_confirm,
        nickname: data.nickname,
      };

      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const result = await response.json();
        // 회원가입 성공 시 로그인 페이지로 이동
        router.push('/login?registered=true');
      } else {
        const errorData = await response.json();
        setError(errorData.message || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* 페이지 헤더 */}
        <div className="text-center space-y-2 mb-14">
          <h1 className="text-5xl font-bold text-green-400 mb-4">체감</h1>
          <p className="text-lg text-gray-300">오로지 한 장으로 변화한!</p>
          <h2 className="text-2xl font-bold text-white mt-8">회원가입</h2>
        </div>

        <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 닉네임 입력 필드 */}
            <div>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...register('nickname', {
                    required: '닉네임을 입력해주세요.',
                  })}
                  type="text"
                  placeholder="닉네임을 입력하세요."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-800 text-white text-base placeholder-gray-400"
                />
              </div>
              {errors.nickname && (
                <p className="text-sm text-red-400 mt-1">{errors.nickname.message}</p>
              )}
            </div>

            {/* 이메일 입력 필드 */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...register('email', {
                    required: '이메일을 입력해주세요.',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '유효한 이메일 주소를 입력해주세요.',
                    },
                  })}
                  type="email"
                  placeholder="이메일을 입력하세요."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-800 text-white text-base placeholder-gray-400"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* 비밀번호 입력 필드 */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...register('password', {
                    required: '비밀번호를 입력해주세요.',
                    minLength: {
                      value: 8,
                      message: '비밀번호는 최소 8자 이상이어야 합니다.',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요."
                  className="w-full pl-10 pr-12 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-800 text-white text-base placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-green-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* 비밀번호 확인 입력 필드 */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...register('password_confirm', {
                    required: '비밀번호 확인을 입력해주세요.',
                  })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 다시 입력하세요."
                  className="w-full pl-10 pr-12 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-800 text-white text-base placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-green-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password_confirm && (
                <p className="text-sm text-red-400 mt-1">{errors.password_confirm.message}</p>
              )}
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-xl p-3">
                {error}
              </div>
            )}

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl py-3 px-4 text-base font-bold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '회원가입 중...' : '회원가입'}
            </button>
            {/* 로그인 페이지로 이동 버튼 */}
            <Link
              href="/login"
              className="w-full rounded-2xl py-3 px-4 text-base font-bold text-green-400 bg-transparent border border-green-400 hover:bg-green-400 hover:text-black transition-colors flex items-center justify-center mt-2"
            >
              로그인 페이지로
            </Link>
          </form>
        </div>

        {/* 저작권 */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">© 2024 Chegam. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}
