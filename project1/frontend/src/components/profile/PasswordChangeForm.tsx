'use client';

import React, { useState } from 'react';

interface PasswordChangeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

export function PasswordChangeForm({ onSuccess, onCancel }: PasswordChangeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    current_password: '',
    new_password: '',
    new_password_confirm: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.current_password) {
      errors.current_password = '현재 비밀번호를 입력해주세요.';
    }

    if (!formData.new_password) {
      errors.new_password = '새 비밀번호를 입력해주세요.';
    } else if (formData.new_password.length < 8) {
      errors.new_password = '비밀번호는 8자 이상이어야 합니다.';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.new_password)) {
      errors.new_password = '비밀번호는 영문 대소문자와 숫자를 포함해야 합니다.';
    }

    if (!formData.new_password_confirm) {
      errors.new_password_confirm = '비밀번호 확인을 입력해주세요.';
    } else if (formData.new_password !== formData.new_password_confirm) {
      errors.new_password_confirm = '비밀번호가 일치하지 않습니다.';
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
      // const response = await fetch('/api/auth/password/change/', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      //   },
      //   body: JSON.stringify(formData)
      // });

      // 시뮬레이션된 응답
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 성공 시 폼 리셋 및 성공 콜백 호출
      setFormData({
        current_password: '',
        new_password: '',
        new_password_confirm: ''
      });
      onSuccess();
    } catch (error) {
      console.error('Password change failed:', error);
      setError('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 입력 시 해당 필드의 에러 제거
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' };
    
    let strength = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ];
    
    strength = checks.filter(Boolean).length;
    
    if (strength <= 2) return { strength, text: '약함', color: 'text-red-400' };
    if (strength <= 3) return { strength, text: '보통', color: 'text-yellow-400' };
    if (strength <= 4) return { strength, text: '강함', color: 'text-[var(--point-green)]' };
    return { strength, text: '매우 강함', color: 'text-[var(--point-green)]' };
  };

  const passwordStrength = getPasswordStrength(formData.new_password);

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <svg className="w-6 h-6 text-[var(--point-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-xl font-semibold text-white">비밀번호 변경</h2>
        </div>
        <p className="text-sm text-gray-400">
          보안을 위해 현재 비밀번호를 입력한 후 새 비밀번호를 설정하세요.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 현재 비밀번호 */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            현재 비밀번호 <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              value={formData.current_password}
              onChange={(e) => handleInputChange('current_password', e.target.value)}
              type={showCurrentPassword ? 'text' : 'password'}
              className="w-full px-3 py-2 pr-10 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--point-green)] focus:border-transparent"
              placeholder="현재 비밀번호를 입력하세요"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showCurrentPassword ? (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {formErrors.current_password && (
            <p className="mt-1 text-sm text-red-400">{formErrors.current_password}</p>
          )}
        </div>

        {/* 새 비밀번호 */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            새 비밀번호 <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              value={formData.new_password}
              onChange={(e) => handleInputChange('new_password', e.target.value)}
              type={showNewPassword ? 'text' : 'password'}
              className="w-full px-3 py-2 pr-10 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--point-green)] focus:border-transparent"
              placeholder="새 비밀번호를 입력하세요"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showNewPassword ? (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {formErrors.new_password && (
            <p className="mt-1 text-sm text-red-400">{formErrors.new_password}</p>
          )}
          
          {/* 비밀번호 강도 표시 */}
          {formData.new_password && (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.strength <= 2 ? 'bg-red-500' :
                      passwordStrength.strength <= 3 ? 'bg-yellow-500' :
                      passwordStrength.strength <= 4 ? 'bg-[var(--point-green)]' : 'bg-[var(--point-green)]'
                    }`}
                    style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                  ></div>
                </div>
                <span className={`text-xs font-medium ${passwordStrength.color}`}>
                  {passwordStrength.text}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                <p>비밀번호는 다음 조건을 만족해야 합니다:</p>
                <ul className="mt-1 space-y-1">
                  <li className={formData.new_password.length >= 8 ? 'text-[var(--point-green)]' : 'text-gray-500'}>
                    • 8자 이상
                  </li>
                  <li className={/[a-z]/.test(formData.new_password) ? 'text-[var(--point-green)]' : 'text-gray-500'}>
                    • 영문 소문자 포함
                  </li>
                  <li className={/[A-Z]/.test(formData.new_password) ? 'text-[var(--point-green)]' : 'text-gray-500'}>
                    • 영문 대문자 포함
                  </li>
                  <li className={/\d/.test(formData.new_password) ? 'text-[var(--point-green)]' : 'text-gray-500'}>
                    • 숫자 포함
                  </li>
                  <li className={/[!@#$%^&*(),.?":{}|<>]/.test(formData.new_password) ? 'text-[var(--point-green)]' : 'text-gray-500'}>
                    • 특수문자 포함 (권장)
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 새 비밀번호 확인 */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            새 비밀번호 확인 <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              value={formData.new_password_confirm}
              onChange={(e) => handleInputChange('new_password_confirm', e.target.value)}
              type={showConfirmPassword ? 'text' : 'password'}
              className="w-full px-3 py-2 pr-10 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--point-green)] focus:border-transparent"
              placeholder="새 비밀번호를 다시 입력하세요"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showConfirmPassword ? (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {formErrors.new_password_confirm && (
            <p className="mt-1 text-sm text-red-400">{formErrors.new_password_confirm}</p>
          )}
        </div>

        {/* 보안 팁 */}
        <div className="bg-gray-800/50 border border-[var(--point-green)]/30 rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--point-green)] mb-2">보안 팁</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• 다른 사이트에서 사용하지 않는 고유한 비밀번호를 사용하세요</li>
            <li>• 개인정보(이름, 생일 등)를 포함하지 마세요</li>
            <li>• 정기적으로 비밀번호를 변경하세요</li>
            <li>• 비밀번호를 다른 사람과 공유하지 마세요</li>
          </ul>
        </div>

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
            <span>{isLoading ? '변경 중...' : '비밀번호 변경'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}