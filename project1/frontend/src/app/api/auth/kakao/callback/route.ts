import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { message: '인증 코드가 없습니다.' },
        { status: 400 }
      );
    }

    // 카카오 토큰 교환 (실제 구현에서는 카카오 API 호출)
    // 여기서는 임시로 모의 응답
    const mockKakaoResponse = {
      access_token: 'mock_kakao_access_token_' + Date.now(),
      token_type: 'bearer',
      refresh_token: 'mock_kakao_refresh_token_' + Date.now(),
      expires_in: 21600,
      scope: 'profile_nickname profile_image',
      refresh_token_expires_in: 5184000
    };

    // 카카오 사용자 정보 가져오기 (실제 구현에서는 카카오 API 호출)
    const mockKakaoUser = {
      id: 'mock_kakao_user_id',
      connected_at: new Date().toISOString(),
      properties: {
        nickname: '카카오 사용자',
        profile_image: 'https://via.placeholder.com/100x100',
        thumbnail_image: 'https://via.placeholder.com/100x100'
      },
      kakao_account: {
        profile_needs_agreement: false,
        profile: {
          nickname: '카카오 사용자',
          thumbnail_image_url: 'https://via.placeholder.com/100x100',
          profile_image_url: 'https://via.placeholder.com/100x100'
        },
        email_needs_agreement: false,
        is_email_valid: true,
        is_email_verified: true,
        email: 'kakao@example.com'
      }
    };

    // 사용자 정보를 데이터베이스에 저장하거나 업데이트
    // 여기서는 임시 사용자 정보 생성
    const user = {
      id: mockKakaoUser.id,
      email: mockKakaoUser.kakao_account.email,
      name: mockKakaoUser.properties.nickname,
      profileImage: mockKakaoUser.properties.profile_image,
      provider: 'kakao'
    };

    // JWT 토큰 생성 (실제로는 서버에서 생성)
    const mockToken = 'mock_jwt_token_kakao_' + Date.now();

    const response = NextResponse.json(
      {
        message: '카카오 로그인 성공',
        user,
        token: mockToken
      },
      { status: 200 }
    );

    // 쿠키에 토큰 설정
    response.cookies.set('authToken', mockToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7일
    });

    return response;

  } catch (error) {
    console.error('Kakao callback error:', error);
    return NextResponse.json(
      { message: '카카오 로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 