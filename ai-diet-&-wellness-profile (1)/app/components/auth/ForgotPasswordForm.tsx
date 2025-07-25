'use client';

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { AuthApiError } from '../../../lib/authApi';
import { PasswordResetData } from '../../../types';
import LoadingSpinner from '../LoadingSpinner';

export default function ForgotPasswordForm() {
  const [formData, setFormData] = useState<PasswordResetData>({
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { requestPasswordReset } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await requestPasswordReset(formData);
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: '요청 처리 중 오류가 발생했습니다.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // 입력 시 해당 필드 에러 제거
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="mt-8 space-y-6">
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                이메일이 전송되었습니다
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  {formData.email}로 비밀번호 재설정 링크를 보내드렸습니다.
                  이메일을 확인하시고 링크를 클릭하여 비밀번호를 재설정해주세요.
                </p>
                <p className="mt-2">
                  이메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <a
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            로그인 페이지로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {errors.general && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{errors.general}</div>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          이메일 주소
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`appearance-none relative block w-full px-3 py-2 border ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
            placeholder="가입하신 이메일을 입력하세요"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <LoadingSpinner size="sm" />
              <span className="ml-2">전송 중...</span>
            </div>
          ) : (
            '비밀번호 재설정 링크 전송'
          )}
        </button>
      </div>

      <div className="text-center">
        <a
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          로그인 페이지로 돌아가기
        </a>
      </div>
    </form>
  );
}