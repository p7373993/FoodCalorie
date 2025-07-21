# Diet Survival - 다이어트 생존 게임

AI 기반 영양 분석과 소셜 게임화를 통한 다이어트 관리 서비스입니다.

## 🎯 프로젝트 소개

Diet Survival은 식사 사진을 AI로 분석하여 영양 정보를 자동으로 추출하고, 챌린지 형태의 게임화 요소를 통해 재미있게 다이어트를 관리할 수 있는 웹 애플리케이션입니다.

### 주요 기능

- 🔐 **인증 시스템**: 카카오 소셜 로그인 및 이메일/비밀번호 로그인
- 📸 **AI 식사 분석**: 사진 업로드만으로 영양 정보 자동 추출
- 📊 **대시보드**: 월별 식사 기록과 영양 분석 결과 시각화
- 🏆 **챌린지 시스템**: 다른 사용자들과 함께하는 다이어트 챌린지
- 🎮 **게임화**: 생존 게임 형태의 다이어트 관리
- 🤖 **AI 코치**: 개인화된 다이어트 조언 제공

## 🛠️ 기술 스택

### Frontend
- **Next.js 15** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링
- **Framer Motion** - 애니메이션
- **Recharts** - 데이터 시각화
- **React Hook Form** - 폼 관리

### Backend
- **Python** - 백엔드 API
- **Django** - 웹 프레임워크 (예정)

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.0.0 이상
- Python 3.11 이상
- npm 또는 yarn

### 설치 및 실행

1. **프로젝트 클론**
```bash
git clone <repository-url>
cd project
```

2. **Frontend 의존성 설치**
```bash
cd frontend
npm install
```

3. **환경 변수 설정**
```bash
# .env.local 파일 생성
NEXT_PUBLIC_KAKAO_CLIENT_ID=your_kakao_client_id_here
NEXT_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. **Frontend 개발 서버 실행**
```bash
npm run dev
```

5. **브라우저에서 확인**
[http://localhost:3000](http://localhost:3000)에서 애플리케이션을 확인할 수 있습니다.

### 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 린트 검사
npm run lint
```

## 📁 프로젝트 구조

```
project/
├── frontend/                 # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/             # App Router 페이지
│   │   │   ├── login/       # 로그인 페이지
│   │   │   ├── auth/        # 인증 관련 페이지
│   │   │   ├── dashboard/   # 대시보드 페이지
│   │   │   ├── log/         # 식사 로그 페이지
│   │   │   ├── challenges/  # 챌린지 페이지
│   │   │   └── profile/     # 프로필 페이지
│   │   ├── components/      # 재사용 가능한 컴포넌트
│   │   │   ├── auth/        # 인증 관련 컴포넌트
│   │   │   ├── dashboard/   # 대시보드 컴포넌트
│   │   │   └── layout/      # 레이아웃 컴포넌트
│   │   ├── lib/             # 유틸리티 및 API 클라이언트
│   │   ├── types/           # TypeScript 타입 정의
│   │   └── utils/           # 헬퍼 함수
│   ├── public/              # 정적 파일
│   └── package.json
├── main.py                  # Python 백엔드 (예정)
└── README.md
```

## 🎨 주요 컴포넌트

### 인증 시스템
- **LoginPage**: 메인 로그인 페이지
- **KakaoLoginButton**: 카카오 소셜 로그인 버튼
- **LoginForm**: 이메일/비밀번호 로그인 폼
- **HelperLinks**: SSO, 비밀번호 찾기 등 헬퍼 링크

### 대시보드
- **InteractiveCalendar**: 월별 식사 기록 달력
- **AICoachTip**: AI 코치의 개인화된 조언
- **NutritionDonutChart**: 영양소 비율 시각화

### 식사 로그
- **MealUploader**: 사진 업로드 및 AI 분석
- 드래그 앤 드롭 지원
- 실시간 영양 정보 자동 추출

### 챌린지
- **ChallengeList**: 추천 챌린지 목록
- **SurvivalBoard**: 생존 게임 보드
- 실시간 참가자 현황

## 🔧 환경 설정

### 환경 변수

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# 카카오 로그인 설정
NEXT_PUBLIC_KAKAO_CLIENT_ID=your_kakao_client_id_here
NEXT_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback

# API 설정
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 테스트 계정

개발 환경에서 사용할 수 있는 테스트 계정:
- **일반 사용자**
  - 이메일: test@example.com
  - 비밀번호: password123
- **관리자 계정**
  - 이메일: admin@example.com
  - 비밀번호: admin1234

## 📝 API 문서

### 인증 관련 API

- `POST /api/auth/login` - 이메일/비밀번호 로그인
- `POST /api/auth/kakao/callback` - 카카오 로그인 콜백 처리

### 식사 로그 관련 API

- `GET /api/logs/monthly` - 월별 식사 기록 조회
- `GET /api/logs/daily` - 일별 영양 분석 리포트
- `POST /api/logs/analyze-image` - 이미지 AI 분석
- `POST /api/logs` - 식사 로그 생성

### 챌린지 관련 API

- `GET /api/challenges/recommended` - 추천 챌린지 목록
- `GET /api/challenges/my-list` - 내 챌린지 목록
- `GET /api/challenges/:id` - 챌린지 상세 정보

### AI 코치 관련 API

- `GET /api/ai/coaching-tip` - AI 코치 조언

## 🔐 인증 플로우

### 카카오 로그인
1. 사용자가 "Continue with Kakao" 버튼 클릭
2. 카카오 OAuth 페이지로 리다이렉트
3. 사용자가 카카오 계정으로 로그인
4. 카카오에서 인증 코드와 함께 콜백 URL로 리다이렉트
5. 서버에서 인증 코드를 액세스 토큰으로 교환
6. 카카오 사용자 정보 조회
7. 로컬 사용자 정보 생성/업데이트
8. JWT 토큰 생성 및 쿠키 설정
9. 대시보드로 리다이렉트

### 이메일 로그인
1. 사용자가 이메일과 비밀번호 입력
2. 서버에서 사용자 인증
3. 인증 성공 시 JWT 토큰 생성
4. 쿠키에 토큰 설정
5. 대시보드로 리다이렉트

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 이슈를 생성해 주세요.

---

**Diet Survival** - AI와 함께하는 스마트한 다이어트 관리 🧠💪
