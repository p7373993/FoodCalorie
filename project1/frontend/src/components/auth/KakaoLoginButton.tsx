'use client';

import React from 'react';

export function KakaoLoginButton() {
  const handleKakaoLogin = async () => {
    try {
      // 카카오 OAuth URL로 리다이렉트
      const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI}&response_type=code`;
      window.location.href = kakaoAuthUrl;
    } catch (error) {
      console.error('Kakao login failed:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleKakaoLogin}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl shadow-sm"
      style={{
        background: '#FEE500',
        color: 'rgba(0,0,0,0.85)',
        fontWeight: 700,
        fontSize: '1rem',
        border: 'none',
      }}
    >
      <span className="font-bold" style={{ fontFamily: 'inherit' }}>카카오 로그인</span>
    </button>
  );
} 