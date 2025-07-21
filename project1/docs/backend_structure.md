# 백엔드 프로젝트 구조

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 앱 진입점
│   ├── config.py               # 환경 설정
│   ├── database.py             # 데이터베이스 연결
│   ├── dependencies.py         # 의존성 주입
│   ├── models/                 # SQLAlchemy 모델
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── meal_log.py
│   │   ├── challenge.py
│   │   ├── badge.py
│   │   └── ai_coach.py
│   ├── schemas/                # Pydantic 스키마
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── meal_log.py
│   │   ├── challenge.py
│   │   ├── badge.py
│   │   └── ai_coach.py
│   ├── api/                    # API 라우터
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── logs.py
│   │   │   ├── challenges.py
│   │   │   ├── badges.py
│   │   │   └── ai.py
│   │   └── deps.py
│   ├── core/                   # 핵심 기능
│   │   ├── __init__.py
│   │   ├── security.py         # JWT 인증
│   │   ├── config.py           # 설정 관리
│   │   └── exceptions.py       # 커스텀 예외
│   ├── services/               # 비즈니스 로직
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── meal_service.py
│   │   ├── challenge_service.py
│   │   ├── badge_service.py
│   │   └── ai_service.py
│   └── utils/                  # 유틸리티
│       ├── __init__.py
│       ├── image_processor.py
│       └── nutrition_calculator.py
├── alembic/                    # 데이터베이스 마이그레이션
│   ├── versions/
│   └── alembic.ini
├── tests/                      # 테스트
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_meals.py
│   └── test_challenges.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 주요 API 엔드포인트

### 인증 (Authentication)
- `POST /api/v1/auth/login` - 일반 로그인
- `POST /api/v1/auth/kakao/callback` - 카카오 로그인
- `POST /api/v1/auth/refresh` - 토큰 갱신
- `POST /api/v1/auth/logout` - 로그아웃

### 사용자 (Users)
- `GET /api/v1/users/me` - 내 정보 조회
- `PUT /api/v1/users/me` - 내 정보 수정
- `GET /api/v1/users/{username}/badges` - 사용자 배지 조회

### 식사 로그 (Meal Logs)
- `GET /api/v1/logs/monthly` - 월별 로그 조회
- `GET /api/v1/logs/daily` - 일별 리포트 조회
- `POST /api/v1/logs` - 식사 로그 생성
- `PUT /api/v1/logs/{id}` - 식사 로그 수정
- `DELETE /api/v1/logs/{id}` - 식사 로그 삭제
- `POST /api/v1/logs/analyze-image` - AI 이미지 분석

### 챌린지 (Challenges)
- `GET /api/v1/challenges/recommended` - 추천 챌린지
- `GET /api/v1/challenges/my-list` - 내 챌린지 목록
- `GET /api/v1/challenges/{id}` - 챌린지 상세
- `POST /api/v1/challenges/{id}/join` - 챌린지 참여
- `POST /api/v1/challenges/{id}/leave` - 챌린지 탈퇴

### AI 코치 (AI Coach)
- `GET /api/v1/ai/coaching-tip` - AI 코치 팁 조회
- `POST /api/v1/ai/coaching-tip/{id}/read` - 팁 읽음 처리

### 배지 (Badges)
- `GET /api/v1/badges` - 배지 목록
- `GET /api/v1/badges/{id}` - 배지 상세 