import { NextRequest, NextResponse } from 'next/server';

const mockUsers = [
  {
    id: '1',
    email: 'test@example.com',
    password: 'password123',
    name: '테스트 사용자',
    role: 'user',
  },
  {
    id: '2',
    email: 'admin@example.com',
    password: 'admin1234',
    name: '관리자',
    role: 'admin',
  },
];

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // 입력 검증
    if (!email || !password) {
      return NextResponse.json(
        { message: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 인증 (mock 데이터에서 찾기)
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
      // JWT 토큰 생성 (실제로는 서버에서 생성)
      const mockToken = 'mock_jwt_token_' + Date.now();
      
      const response = NextResponse.json(
        { 
          message: '로그인 성공',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
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
    } else {
      return NextResponse.json(
        { message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 