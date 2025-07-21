'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SignUpFormData {
  username: string;
  email: string;
  password: string;
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
      const response = await fetch('http://localhost:8000/api/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 card-cute">
        {/* 페이지 헤더 */}
        <div className="text-center space-y-2 mb-14">
          <h1 className="text-3xl font-noto text-foreground mb-1">회원가입</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 사용자 이름 입력 필드 */}
          <div>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                {...register('username', {
                  required: '사용자 이름을 입력해주세요.',
                })}
                type="text"
                placeholder="사용자 이름을 입력하세요."
                className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white font-noto text-base shadow-sm placeholder:text-xs placeholder:text-muted-foreground"
              />
            </div>
            {errors.username && (
              <p className="text-sm text-destructive mt-1 font-noto">{errors.username.message}</p>
            )}
          </div>

          {/* 이메일 입력 필드 */}
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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
                className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white font-noto text-base shadow-sm placeholder:text-xs placeholder:text-muted-foreground"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive mt-1 font-noto">{errors.email.message}</p>
            )}
          </div>

          {/* 비밀번호 입력 필드 */}
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                {...register('password', {
                  required: '비밀번호를 입력해주세요.',
                  minLength: {
                    value: 6,
                    message: '비밀번호는 최소 6자 이상이어야 합니다.',
                  },
                })}
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 입력하세요."
                className="w-full pl-10 pr-12 py-3 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white font-noto text-base shadow-sm placeholder:text-xs placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive mt-1 font-noto">{errors.password.message}</p>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3 font-noto">
              {error}
            </div>
          )}

          {/* 회원가입 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl py-3 px-4 text-base font-bold shadow-md font-noto"
            style={{ background: '#011936', color: '#fff' }}
          >
            {isLoading ? '회원가입 중...' : '회원가입'}
          </button>
          {/* 로그인 페이지로 이동 버튼 */}
          <Link
            href="/login"
            className="w-full rounded-2xl py-3 px-4 text-base font-bold shadow-md font-noto text-[#011936] bg-white border border-[#011936] flex items-center justify-center mt-2"
            style={{}}
          >
            로그인 페이지로
          </Link>
        </form>
      </div>
    </div>
  );
}
