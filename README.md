# 🍽️ 체감(ChaeGam) - AI 기반 음식 칼로리 측정 시스템

AI와 컴퓨터 비전을 활용하여 음식 사진에서 자동으로 칼로리를 측정하고, 건강 관리 플랫폼 기능을 제공하는 통합 시스템입니다.

## 🏗️ 프로젝트 구조

```
FoodCalorie/
├── 🎨 project1/             # Next.js 프론트엔드 (체감 UI)
├── 🔧 backend/              # Django REST API 백엔드 (체감 기능)
├── 🤖 MLServer/             # AI 모델 서버 (YOLO + MiDaS + LLM)
├── 📊 음식만개등급화.csv     # 음식 영양 데이터
└── 🚀 통합 스크립트들/       # 개발 환경 설정
```

## ⚡ 빠른 시작

### 1. 환경 확인

```bash
# 개발 환경 확인
check-environments.bat
```

### 2. 실행 방법

#### 🐳 Docker 실행 (권장)

```bash
# Docker로 모든 서비스 실행
docker-start.bat
```

#### 💻 로컬 실행

```bash
# 모든 서비스를 한 번에 시작
start-all-services.bat
```

### 3. 개별 서비스 실행

#### Frontend (Next.js)

```bash
cd project1
npm install
npm run dev
# → http://localhost:3000
```

#### Backend (Django)

```bash
cd backend
python manage.py migrate
python manage.py runserver
# → http://localhost:8000
```

#### ML Server

```bash
cd MLServer
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001
# → http://localhost:8001
```

## 🔧 개발 환경 설정

### VS Code 워크스페이스

```bash
# VS Code에서 워크스페이스 열기
code workspace.code-workspace
```

### Git 저장소 통합 (선택사항)

```bash
# 모든 프로젝트를 단일 Git 저장소로 통합
integrate-repos.bat
```

## 📋 주요 기능

### 🎨 Frontend (Next.js + TypeScript)

- **인증 시스템**: 회원가입/로그인, 카카오 로그인 UI
- **식사 기록**: AI 이미지 분석을 통한 음식 인식 및 영양 정보 추출
- **대시보드**: 일일/월간 식사 기록 및 영양소 합계 표시
- **챌린지 시스템**: 챌린지 생성/참여/탈퇴/진행상황 추적
- **통계 시스템**: 일간/주간/월간 평균 칼로리, 음식 종류별 비율
- **프로필 시스템**: 사용자별 뱃지 컬렉션, 프로필 통계
- **반응형 디자인**: Tailwind CSS 기반

### 🔧 Backend (Django + Redis + Celery)

- **RESTful API 서버**: 완전한 CRUD 기능
- **인증 시스템**: Token 기반 인증
- **식사 기록 관리**: 생성/조회/삭제 기능
- **챌린지 시스템**: 챌린지 관리 및 뱃지 시스템
- **통계 API**: 상세한 영양 통계 제공
- **Gemini API 연동**: 이미지 분석
- **비동기 작업 처리**: Celery
- **데이터베이스**: SQLite/PostgreSQL

### 🤖 ML Server (FastAPI + AI Models)

- **YOLO 기반 음식 객체 분할**
- **MiDaS 깊이 추정**
- **LLM 기반 질량 계산**
- **WebSocket 실시간 알림**

## 🌐 서비스 주소

| 서비스      | 주소                       | 설명              |
| ----------- | -------------------------- | ----------------- |
| Frontend    | http://localhost:3000      | 체감 사용자 인터페이스 |
| Backend API | http://localhost:8000      | Django REST API   |
| ML Server   | http://localhost:8001      | AI 모델 서버      |
| ML API Docs | http://localhost:8001/docs | Swagger UI        |

## 🎯 통계 점수 산정 로직

- **15점 만점 시스템**
- **등급별 기본 점수**: A: 15점, B: 10점, C: 5점
- **칼로리 보정**:
  - 300kcal 미만: +3점
  - 300~600kcal: +1점
  - 600kcal 초과: -2점
- **최종 점수**: 기본점수 + 보정점수 (1~15점 사이로 제한)

## 🛠️ 개발 환경 설정

### 환경 요구사항

- **Python**: 3.11+
- **Node.js**: 18+
- **Git**: 최신 버전
- **Redis**: 6.0+ (Windows용 포함)

### 개발 워크플로우

1. **워크스페이스 열기**: `code workspace.code-workspace`
2. **서비스 시작**: `start-all-services.bat`
3. **개발 진행**: 각 프로젝트 폴더에서 개별 작업
4. **통합 테스트**: 전체 시스템 연동 확인

## 🚀 배포 가이드

### Docker 배포

```bash
# 각 서비스별 Docker 설정
cd backend && docker-compose up -d
cd MLServer && docker-compose up -d
cd project1 && docker build -t frontend .
```

### 환경 변수 설정

각 프로젝트의 `.env` 파일 설정:

- **Backend**: Django 설정, API 키
- **MLServer**: AI 모델 API 키
- **Frontend**: API 엔드포인트 URL

## 📈 구현 현황

### ✅ 구현 완료
- 인증 시스템 (Token 기반)
- 식사 기록 시스템 (AI 이미지 분석)
- 챌린지 시스템 (생성/참여/뱃지)
- 대시보드 (일일/월간 통계)
- 기본 통계 시스템
- 뱃지 시스템
- 관리자 기본 기능

### 🔄 개선 필요
- 통계 상세 데이터 백엔드 구현
- 카카오 로그인 백엔드 연동
- 식사 기록 수정 기능
- 프로필 편집 기능
- 실시간 알림 시스템
- 소셜 기능 확장

## 🤝 기여 방법

1. **이슈 리포트**: 버그나 개선사항 제안
2. **풀 리퀘스트**: 코드 개선 기여
3. **문서 개선**: README나 주석 개선

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

**🎉 체감(ChaeGam)으로 건강한 식습관을 만들어보세요! ⭐**
