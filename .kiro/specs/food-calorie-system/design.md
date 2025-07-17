# AI 기반 음식 칼로리 추정 및 소셜 챌린지 시스템 설계

## 개요

본 시스템은 컴퓨터 비전 기반 음식 질량 추정, 하이브리드 칼로리 계산, 영양 등급 평가, 그리고 소셜 서바이벌 챌린지 기능을 통합한 다이어트 관리 플랫폼입니다.

## 아키텍처

### 시스템 구성도
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   ML Server     │
│   (Next.js)     │◄──►│   (Django)      │◄──►│   (FastAPI)     │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 8001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Celery)      │
                       └─────────────────┘
```

### 기술 스택
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Recharts
- **Backend**: Django, Django REST Framework, Celery, Redis, WebSocket
- **ML Server**: FastAPI, YOLO, MiDaS, LLM (Gemini/OpenAI)
- **Database**: PostgreSQL (운영), SQLite (개발)
- **Authentication**: JWT, 카카오 OAuth

## 컴포넌트 및 인터페이스

### 1. ML 서버 인터페이스

#### 음식 질량 추정 API
```python
# 요청
POST /api/v1/estimate
Content-Type: multipart/form-data
Body: image file

# 응답
{
  "filename": "food.jpg",
  "detected_objects": {
    "food": 1,
    "reference_objects": 1
  },
  "mass_estimation": {
    "estimated_mass_g": 150.5,
    "confidence": 0.75,
    "food_name": "김밥",
    "verification_method": "volume_based"
  }
}
```

### 2. 백엔드 API 인터페이스

#### 음식 분석 API
```python
# 음식 분석 요청
POST /api/food/analyze/
Content-Type: multipart/form-data
Body: {
  "image": file,
  "user_id": int
}

# 응답
{
  "analysis_id": "uuid",
  "mass_g": 150.5,
  "food_name": "김밥",
  "confidence": 0.75,
  "calories": 245,
  "nutrition": {
    "protein_g": 8.2,
    "carbs_g": 35.1,
    "fat_g": 6.8,
    "fiber_g": 2.1,
    "sodium_mg": 420
  },
  "grade": "B",
  "grade_score": 82,
  "estimation_method": "hybrid"
}
```

#### 챌린지 API
```python
# 챌린지 목록 조회
GET /api/challenges/
Response: {
  "recommended": [...],
  "participating": [...],
  "created": [...]
}

# 챌린지 생성
POST /api/challenges/
Body: {
  "title": "30일 칼로리 챌린지",
  "description": "하루 1500칼로리 이하 유지하기",
  "duration_days": 30,
  "max_participants": 50,
  "rules": {
    "daily_calorie_limit": 1500,
    "allowed_cheat_days": 2
  }
}

# 챌린지 참여
POST /api/challenges/{id}/join/

# 챌린지 상세 정보
GET /api/challenges/{id}/
Response: {
  "id": 1,
  "title": "30일 칼로리 챌린지",
  "participants": [
    {
      "user_id": 1,
      "username": "user1",
      "status": "alive",
      "streak_days": 15,
      "violations": 0
    }
  ],
  "stats": {
    "total_participants": 45,
    "survivors": 32,
    "eliminated": 13
  }
}
```

### 3. 프론트엔드 컴포넌트

#### 핵심 컴포넌트 구조
```typescript
// 식사 업로드 컴포넌트
interface MealUploaderProps {
  onAnalysisComplete: (result: FoodAnalysis) => void;
  onProgress: (progress: number) => void;
}

// 영양 분석 결과 타입
interface FoodAnalysis {
  analysisId: string;
  massG: number;
  foodName: string;
  confidence: number;
  calories: number;
  nutrition: NutritionInfo;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeScore: number;
}

// 챌린지 관련 타입
interface Challenge {
  id: number;
  title: string;
  description: string;
  durationDays: number;
  maxParticipants: number;
  currentParticipants: number;
  rules: ChallengeRules;
  status: 'active' | 'completed' | 'upcoming';
}

interface Participant {
  userId: number;
  username: string;
  status: 'alive' | 'eliminated';
  streakDays: number;
  violations: number;
  avatar?: string;
}
```

## 데이터 모델

### 데이터베이스 스키마

#### 사용자 관련
```sql
-- 사용자 프로필
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100),
    kakao_id VARCHAR(100) UNIQUE,
    age INTEGER,
    gender VARCHAR(10),
    target_weight_kg DECIMAL(5,2),
    activity_level VARCHAR(20), -- sedentary, light, moderate, active, very_active
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 사용자 설정
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    daily_calorie_goal INTEGER,
    notification_enabled BOOLEAN DEFAULT TRUE,
    privacy_level VARCHAR(20) DEFAULT 'public'
);
```

#### 음식 분석 관련
```sql
-- 음식 데이터베이스
CREATE TABLE food_database (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    name_en VARCHAR(200),
    category VARCHAR(100),
    calories_per_100g INTEGER,
    protein_per_100g DECIMAL(5,2),
    carbs_per_100g DECIMAL(5,2),
    fat_per_100g DECIMAL(5,2),
    fiber_per_100g DECIMAL(5,2),
    sodium_per_100g DECIMAL(7,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 음식 분석 결과
CREATE TABLE food_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id),
    image_path VARCHAR(500),
    ml_server_response JSONB,
    mass_g DECIMAL(7,2),
    food_name VARCHAR(200),
    confidence DECIMAL(3,2),
    calories INTEGER,
    nutrition JSONB,
    grade CHAR(1),
    grade_score INTEGER,
    estimation_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 일일 식사 기록
CREATE TABLE daily_meals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    date DATE,
    meal_type VARCHAR(20), -- breakfast, lunch, dinner, snack
    analysis_id UUID REFERENCES food_analyses(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 챌린지 관련
```sql
-- 챌린지
CREATE TABLE challenges (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES users(id),
    title VARCHAR(200),
    description TEXT,
    duration_days INTEGER,
    max_participants INTEGER,
    rules JSONB,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 챌린지 참여
CREATE TABLE challenge_participants (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER REFERENCES challenges(id),
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'alive', -- alive, eliminated, completed
    joined_at TIMESTAMP DEFAULT NOW(),
    eliminated_at TIMESTAMP,
    streak_days INTEGER DEFAULT 0,
    violations INTEGER DEFAULT 0,
    UNIQUE(challenge_id, user_id)
);

-- 챌린지 일일 기록
CREATE TABLE challenge_daily_records (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER REFERENCES challenge_participants(id),
    date DATE,
    daily_calories INTEGER,
    meals_count INTEGER,
    rule_violations JSONB,
    is_compliant BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 에러 처리

### 에러 코드 체계
```python
class ErrorCodes:
    # 일반 에러 (1000번대)
    INVALID_REQUEST = 1001
    UNAUTHORIZED = 1002
    FORBIDDEN = 1003
    NOT_FOUND = 1004
    
    # ML 서버 관련 (2000번대)
    ML_SERVER_UNAVAILABLE = 2001
    IMAGE_ANALYSIS_FAILED = 2002
    INVALID_IMAGE_FORMAT = 2003
    IMAGE_TOO_LARGE = 2004
    
    # 음식 분석 관련 (3000번대)
    FOOD_NOT_DETECTED = 3001
    LOW_CONFIDENCE_RESULT = 3002
    CALORIE_CALCULATION_FAILED = 3003
    
    # 챌린지 관련 (4000번대)
    CHALLENGE_FULL = 4001
    ALREADY_PARTICIPATING = 4002
    CHALLENGE_ENDED = 4003
    INVALID_CHALLENGE_RULES = 4004
```

### 에러 응답 형식
```json
{
  "error": {
    "code": 2001,
    "message": "ML 서버에 연결할 수 없습니다",
    "details": "Connection timeout after 30 seconds",
    "timestamp": "2025-01-17T10:30:00Z"
  },
  "retry_after": 60
}
```

## 테스트 전략

### 단위 테스트
- **ML 서버 통신**: Mock 응답을 사용한 API 호출 테스트
- **칼로리 계산**: 다양한 음식 종류별 계산 로직 검증
- **등급 산정**: 영양소 점수 계산 알고리즘 테스트
- **챌린지 규칙**: 규칙 위반 감지 로직 테스트

### 통합 테스트
- **전체 플로우**: 이미지 업로드 → 분석 → 저장 → 표시
- **실시간 업데이트**: WebSocket을 통한 챌린지 상태 동기화
- **인증 플로우**: 카카오 로그인 → JWT 토큰 → API 접근

### 성능 테스트
- **동시 사용자**: 100명 동시 접속 시 응답 시간
- **이미지 처리**: 대용량 이미지 업로드 및 분석 성능
- **데이터베이스**: 대량 데이터 조회 성능

## 보안 고려사항

### 인증 및 권한
- JWT 토큰 기반 인증
- 토큰 만료 시간: 24시간
- Refresh 토큰을 통한 자동 갱신
- API 엔드포인트별 권한 검증

### 데이터 보안
- 업로드된 이미지 파일 암호화 저장
- 개인정보 (나이, 체중 등) 암호화
- SQL Injection 방지를 위한 ORM 사용
- XSS 방지를 위한 입력값 검증

### 파일 업로드 보안
- 허용된 이미지 형식만 업로드 (JPG, PNG)
- 파일 크기 제한: 10MB
- 파일명 sanitization
- 바이러스 스캔 (선택사항)

## 모니터링 및 로깅

### 로그 수집
- **애플리케이션 로그**: 에러, 경고, 정보 레벨별 분류
- **API 호출 로그**: 요청/응답 시간, 상태 코드
- **ML 서버 통신 로그**: 분석 요청 및 결과
- **사용자 행동 로그**: 페이지 방문, 기능 사용 패턴

### 성능 모니터링
- **응답 시간**: API 엔드포인트별 평균 응답 시간
- **에러율**: 시간대별 에러 발생 비율
- **리소스 사용량**: CPU, 메모리, 디스크 사용률
- **데이터베이스 성능**: 쿼리 실행 시간, 커넥션 풀 상태

### 알림 시스템
- **시스템 장애**: ML 서버 연결 실패, 데이터베이스 오류
- **성능 저하**: 응답 시간 임계값 초과
- **보안 이벤트**: 비정상적인 로그인 시도, API 남용