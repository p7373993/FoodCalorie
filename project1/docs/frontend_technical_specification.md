# 체감(Chegam) 프론트엔드 기술명세서

## 📋 프로젝트 개요

**프로젝트명**: 체감 (AI 기반 영양 분석과 소셜 게임화를 통한 다이어트 관리 서비스)  
**프론트엔드 기술 스택**: Next.js 15.3.5 + TypeScript + Tailwind CSS  
**개발 환경**: React 19.0.0, Node.js  

---

## 🏗️ 아키텍처 및 기술 스택

### 핵심 기술
- **Next.js 15.3.5**: App Router 기반의 풀스택 React 프레임워크
- **TypeScript 5**: 정적 타입 검사를 통한 개발 안정성 확보
- **React 19.0.0**: 최신 React 기능 활용
- **Tailwind CSS 3.4.3**: 유틸리티 퍼스트 CSS 프레임워크
- **Framer Motion 12.23.0**: 애니메이션 및 인터랙션 라이브러리

### 상태 관리 및 폼
- **React Hook Form 7.60.0**: 고성능 폼 관리
- **Axios 1.10.0**: HTTP 클라이언트 라이브러리

### 데이터 시각화
- **Recharts 3.0.2**: React 기반 차트 라이브러리
- **Lucide React 0.525.0**: 아이콘 라이브러리

### 날짜 처리
- **date-fns 4.1.0**: 날짜 유틸리티 라이브러리

---

## 🎨 디자인 시스템

### 색상 팔레트
```typescript
// Tailwind CSS 커스텀 색상 정의
colors: {
  // 기본 색상
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  
  // 식사 타입별 색상
  meal: {
    breakfast: 'var(--meal-breakfast)',
    lunch: 'var(--meal-lunch)',
    dinner: 'var(--meal-dinner)',
    snack: 'var(--meal-snack)',
  },
  
  // 영양 점수 색상
  nutri: {
    a: 'var(--nutri-score-a)', // A등급 (최고)
    b: 'var(--nutri-score-b)', // B등급
    c: 'var(--nutri-score-c)', // C등급
    d: 'var(--nutri-score-d)', // D등급
    e: 'var(--nutri-score-e)', // E등급 (최저)
  },
  
  // 파스텔 색상
  'pastel-yellow': 'var(--pastel-yellow)',
  'pastel-blue': 'var(--pastel-blue)',
  'pastel-purple': 'var(--pastel-purple)',
  'pastel-pink': 'var(--pastel-pink)',
  'pastel-green': 'var(--pastel-green)',
}
```

### 애니메이션
```typescript
// 커스텀 애니메이션 정의
keyframes: {
  'fade-in': {
    '0%': { opacity: '0', transform: 'translateY(20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  'slide-in': {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(0)' },
  },
}
```

### 폰트
- **나눔손글씨 예쁜 민경체**: 메인 폰트 (한글 친화적)

---

## 📱 페이지 구조

### 라우팅 구조 (App Router)
```
src/app/
├── page.tsx                    # 홈페이지
├── layout.tsx                  # 루트 레이아웃
├── login/
│   └── page.tsx               # 로그인 페이지
├── auth/
│   └── kakao/
│       └── callback/
│           └── page.tsx       # 카카오 로그인 콜백
├── dashboard/
│   └── page.tsx               # 대시보드
├── challenges/
│   ├── page.tsx               # 챌린지 목록
│   └── [id]/
│       └── page.tsx           # 챌린지 상세
├── profile/
│   └── [username]/
│       └── page.tsx           # 사용자 프로필
├── log/
│   └── page.tsx               # 식사 로그
└── admin/
    └── page.tsx               # 관리자 페이지
```

---

## 🧩 컴포넌트 아키텍처

### 컴포넌트 구조
```
src/components/
├── auth/                      # 인증 관련 컴포넌트
│   ├── KakaoLoginButton.tsx   # 카카오 로그인 버튼
│   ├── LoginForm.tsx          # 로그인 폼
│   └── HelperLinks.tsx        # 도움말 링크
├── dashboard/                 # 대시보드 컴포넌트
│   ├── InteractiveCalendar.tsx # 인터랙티브 캘린더
│   ├── NutritionDonutChart.tsx # 영양 도넛 차트
│   ├── AICoachTip.tsx         # AI 코치 팁
│   └── DailyReportModal.tsx   # 일일 리포트 모달
├── challenges/                # 챌린지 관련 컴포넌트
│   ├── ChallengeList.tsx      # 챌린지 목록
│   └── SurvivalBoard.tsx      # 생존 게시판
├── meals/                     # 식사 관련 컴포넌트
│   └── MealUploader.tsx       # 식사 업로더
├── profile/                   # 프로필 관련 컴포넌트
│   └── BadgeCollection.tsx    # 배지 컬렉션
└── layout/                    # 레이아웃 컴포넌트
    ├── Navigation.tsx         # 네비게이션
    └── ConditionalNavigation.tsx # 조건부 네비게이션
```

---

## 🔧 핵심 기능 구현

### 1. AI 기반 식사 분석
```typescript
// MealUploader.tsx - 이미지 업로드 및 AI 분석
const analyzeImage = async (file: File) => {
  setAnalyzing(true);
  try {
    const result = await apiClient.analyzeImage(file);
    
    // AI 분석 결과로 폼 자동 채우기
    if (result.foodName) setValue('foodName', result.foodName);
    if (result.calories) setValue('calories', result.calories);
    if (result.carbs) setValue('carbs', result.carbs);
    if (result.protein) setValue('protein', result.protein);
    if (result.fat) setValue('fat', result.fat);
    if (result.nutriScore) setValue('nutriScore', result.nutriScore);
  } catch (error) {
    console.error('Image analysis failed:', error);
  }
  setAnalyzing(false);
};
```

### 2. 인터랙티브 캘린더
```typescript
// InteractiveCalendar.tsx - 식사 로그 시각화
const renderMealIndicators = (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayData = calendarData?.days[dateStr];
  
  return (
    <div className="flex justify-center space-x-1 mt-1">
      {dayData.meals.map((meal, index) => (
        <div
          key={index}
          className={`meal-indicator ${meal.hasLog ? `meal-${meal.type}` : 'bg-gray-200'}`}
        />
      ))}
    </div>
  );
};
```

### 3. 생존 게임 챌린지
```typescript
// SurvivalBoard.tsx - 챌린지 참가자 관리
const ParticipantCard = ({ participant, isEliminated = false }) => {
  const isLeader = !isEliminated && participant.id === sortedSurvived[0]?.id;
  
  return (
    <div className={`card p-4 transition-all ${
      isEliminated ? 'opacity-60 bg-muted/20' : 'hover:shadow-md'
    }`}>
      {/* 참가자 정보 및 생존 상태 표시 */}
    </div>
  );
};
```

### 4. 영양 분석 차트
```typescript
// NutritionDonutChart.tsx - 영양소 분포 시각화
const NutritionDonutChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

---

## 🔌 API 통신

### API 클라이언트 구조
```typescript
// api.ts - 중앙화된 API 관리
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// 인터셉터를 통한 토큰 인증
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 주요 API 엔드포인트
- `GET /api/logs/monthly` - 월별 식사 로그 조회
- `GET /api/logs/daily` - 일일 영양 리포트
- `POST /api/logs/analyze-image` - AI 이미지 분석
- `POST /api/logs` - 식사 로그 생성
- `GET /api/challenges/recommended` - 추천 챌린지
- `GET /api/challenges/my-list` - 내 챌린지 목록
- `GET /api/ai/coaching-tip` - AI 코치 팁

---

## 🎯 타입 시스템

### 핵심 타입 정의
```typescript
// types/index.ts
export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  nickname: string;
}

export interface MealLog {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  nutriScore: 'A' | 'B' | 'C' | 'D' | 'E';
  imageUrl?: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  targetType: 'weight' | 'calorie' | 'macro';
  targetValue: number;
  isActive: boolean;
  participants: ChallengeParticipant[];
}
```

---

## 🚀 성능 최적화

### 1. Next.js 최적화
- **Turbopack**: 빠른 개발 서버 (`next dev --turbopack`)
- **App Router**: 서버 컴포넌트 활용
- **자동 코드 분할**: 페이지별 번들 최적화

### 2. 이미지 최적화
- **Next.js Image 컴포넌트**: 자동 이미지 최적화
- **WebP 포맷 지원**: 압축 효율성 향상

### 3. 상태 관리 최적화
- **React Hook Form**: 불필요한 리렌더링 방지
- **useState/useEffect**: 로컬 상태 관리

---

## 🔒 보안 고려사항

### 1. 인증 토큰 관리
```typescript
// 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2. 환경 변수 관리
- `NEXT_PUBLIC_API_URL`: API 서버 URL
- 민감한 정보는 서버 사이드에서만 처리

---

## 📱 반응형 디자인

### 브레이크포인트
```css
/* Tailwind CSS 기본 브레이크포인트 */
sm: 640px   /* 모바일 가로 */
md: 768px   /* 태블릿 */
lg: 1024px  /* 데스크톱 */
xl: 1280px  /* 대형 화면 */
2xl: 1536px /* 초대형 화면 */
```

### 모바일 우선 접근법
- 모든 컴포넌트가 모바일에서 최적화
- 터치 친화적 인터페이스
- 스와이프 제스처 지원

---

## 🧪 개발 환경 설정

### 필수 의존성
```json
{
  "dependencies": {
    "next": "15.3.5",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5",
    "tailwindcss": "^3.4.3",
    "axios": "^1.10.0",
    "framer-motion": "^12.23.0",
    "recharts": "^3.0.2",
    "react-hook-form": "^7.60.0",
    "date-fns": "^4.1.0"
  }
}
```

### 개발 명령어
```bash
npm run dev      # 개발 서버 시작 (Turbopack)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 시작
npm run lint     # ESLint 검사
```

---

## 🎨 UI/UX 특징

### 1. 게임화 요소
- **생존 게임**: 챌린지 참가자들의 탈락/생존 시각화
- **배지 시스템**: 성취에 따른 배지 수집
- **연속 기록**: 스트릭 기반 동기부여

### 2. AI 기반 개인화
- **스마트 분석**: 사진 업로드 시 자동 영양 분석
- **AI 코치**: 개인 맞춤형 다이어트 조언
- **추천 시스템**: 사용자 패턴 기반 챌린지 추천

### 3. 소셜 기능
- **챌린지 참여**: 친구들과 함께하는 다이어트
- **리더보드**: 생존자 순위 표시
- **프로필 공유**: 성과 공유 및 자랑

---

## 📊 성능 지표

### 목표 성능
- **First Contentful Paint**: < 1.5초
- **Largest Contentful Paint**: < 2.5초
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### 최적화 전략
- **코드 분할**: 페이지별 번들 최적화
- **이미지 최적화**: WebP 포맷 및 적응형 이미지
- **캐싱 전략**: 정적 자산 캐싱
- **지연 로딩**: 필요시에만 컴포넌트 로드

---

## 🔮 향후 개선 계획

### 단기 계획 (1-2개월)
- [ ] PWA 지원 추가
- [ ] 오프라인 모드 구현
- [ ] 푸시 알림 기능

### 중기 계획 (3-6개월)
- [ ] 실시간 채팅 기능
- [ ] 음성 인식 식사 입력
- [ ] AR 기반 식사 분석

### 장기 계획 (6개월 이상)
- [ ] 웨어러블 디바이스 연동
- [ ] AI 개인 트레이너 기능
- [ ] 커뮤니티 기능 강화

---

## 📝 개발 가이드라인

### 코드 스타일
- **TypeScript**: 모든 컴포넌트에 타입 정의
- **함수형 컴포넌트**: Hooks 기반 개발
- **명명 규칙**: PascalCase (컴포넌트), camelCase (함수/변수)

### 폴더 구조
- **기능별 분리**: 관련 컴포넌트들을 폴더로 그룹화
- **재사용성**: 공통 컴포넌트는 별도 폴더 관리
- **타입 정의**: 중앙화된 타입 관리

### 테스트 전략
- **단위 테스트**: Jest + React Testing Library
- **E2E 테스트**: Playwright
- **성능 테스트**: Lighthouse CI

---

*이 문서는 체감 프로젝트의 프론트엔드 기술 스택과 구현 사항을 상세히 설명합니다.* 