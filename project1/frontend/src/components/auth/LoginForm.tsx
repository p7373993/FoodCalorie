'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('로그인 응답:', result);
        
        // 로그인 성공 시 사용자 정보와 토큰을 localStorage에 저장
        if (result.success && result.auth) {
          localStorage.setItem('access_token', result.auth.access_token);
          localStorage.setItem('refresh_token', result.auth.refresh_token);
          localStorage.setItem('user', JSON.stringify(result.user));
          localStorage.setItem('profile', JSON.stringify(result.profile));
        }
        // 로그인 성공 시 이미지 업로드 화면으로 이동 (핵심 기능)
        router.push('/upload');
      } else {
        const errorData = await response.json();
        setError(errorData.message || '로그인에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
            placeholder="이메일을 입력하세요"
            className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-800 text-white text-base placeholder-gray-400"
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
                value: 6,
                message: '비밀번호는 최소 6자 이상이어야 합니다.',
              },
            })}
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호를 입력하세요"
            className="w-full pl-10 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-800 text-white text-base placeholder-gray-400"
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
        {/* 비밀번호 찾기 링크 */}
        <div className="flex justify-end mt-1">
          <Link href="/auth/forgot-password" className="text-xs text-gray-400 hover:text-green-400 transition-colors">
            비밀번호 찾기
          </Link>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-xl p-3">
          {error}
        </div>
      )}

      {/* 로그인 버튼 */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl py-3 px-4 text-base font-bold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '로그인 중...' : '로그인'}
      </button>
      
      {/* 회원가입 버튼 */}
      <Link
        href="/signup"
        className="w-full rounded-xl py-3 px-4 text-base font-bold text-green-400 bg-transparent border border-green-400 hover:bg-green-400 hover:text-black transition-colors flex items-center justify-center"
      >
        회원가입
      </Link>
    </form>
  );
}