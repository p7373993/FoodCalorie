# 🍽️ FoodCalorie - AI 기반 음식 칼로리 측정 시스템

AI와 컴퓨터 비전을 활용하여 음식 사진에서 자동으로 칼로리를 측정하는 통합 시스템입니다.

## 🏗️ 프로젝트 구조

```
FoodCalorie/
├── 🎨 project1/frontend/     # Next.js 프론트엔드
├── 🔧 backend/              # Django REST API 백엔드  
├── 🤖 MLServer/             # AI 모델 서버 (YOLO + MiDaS + LLM)
├── 📊 데이터 파일들/         # CSV 데이터
└── 🚀 통합 스크립트들/       # 개발 환경 설정
```

## ⚡ 빠른 시작

### 1. 원클릭 실행 (Windows)
```bash
# 모든 서비스를 한 번에 시작
start-all-services.bat
```

### 2. 개별 서비스 실행

#### Frontend (Next.js)
```bash
cd project1/frontend
npm install
npm run dev
# → http://localhost:3000
```

#### Backend (Django)
```bash
cd backend
start-services.bat
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
- 사용자 친화적인 음식 사진 업로드 인터페이스
- 실시간 칼로리 측정 결과 표시
- 반응형 디자인 (Tailwind CSS)
- 음식 기록 및 히스토리 관리

### 🔧 Backend (Django + Redis + Celery)
- RESTful API 서버
- Gemini API 연동 (이미지 분석)
- 비동기 작업 처리 (Celery)
- 데이터베이스 관리 (SQLite)

### 🤖 ML Server (FastAPI + AI Models)
- YOLO 기반 음식 객체 분할
- MiDaS 깊이 추정
- LLM 기반 질량 계산
- WebSocket 실시간 알림

## 🌐 서비스 주소

| 서비스 | 주소 | 설명 |
|--------|------|------|
| Frontend | http://localhost:3000 | 사용자 인터페이스 |
| Backend API | http://localhost:8000 | Django REST API |
| ML Server | http://localhost:8001 | AI 모델 서버 |
| ML API Docs | http://localhost:8001/docs | Swagger UI |

## 📁 각 프로젝트 상세 정보

### Frontend
- **기술스택**: Next.js 15, TypeScript, Tailwind CSS
- **주요 기능**: 이미지 업로드, 결과 표시, 사용자 인터페이스
- **문서**: [project1/frontend/README.md](project1/frontend/README.md)

### Backend  
- **기술스택**: Django, Redis, Celery, SQLite
- **주요 기능**: API 서버, 데이터 관리, 외부 API 연동
- **문서**: [backend/README.md](backend/README.md)

### ML Server
- **기술스택**: FastAPI, YOLO, MiDaS, LLM (Gemini/OpenAI)
- **주요 기능**: 이미지 분석, 질량 추정, AI 모델 서빙
- **문서**: [MLServer/README.md](MLServer/README.md)

## 🛠️ 개발 가이드

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

### Git 관리 방식

#### 현재 상태 (각 폴더별 Git)
```
📁 Root (.git)
├── 📁 backend (.git)
├── 📁 MLServer (.git)  
└── 📁 project1 (.git)
```

#### 통합 옵션
1. **Submodules**: 독립성 유지하면서 통합 관리
2. **Monorepo**: 단일 저장소로 완전 통합
3. **현재 유지**: 각각 독립적으로 관리

## 🚀 배포 가이드

### Docker 배포
```bash
# 각 서비스별 Docker 설정 파일 존재
cd backend && docker-compose up -d
cd MLServer && docker-compose up -d
cd project1/frontend && docker build -t frontend .
```

### 환경 변수 설정
각 프로젝트의 `.env` 파일 설정 필요:
- Backend: Django 설정, API 키
- MLServer: AI 모델 API 키  
- Frontend: API 엔드포인트 URL

## 🤝 기여 방법

1. **이슈 리포트**: 버그나 개선사항 제안
2. **풀 리퀘스트**: 코드 개선 기여
3. **문서 개선**: README나 주석 개선

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

**🎉 프로젝트가 도움이 되셨다면 ⭐ 스타를 눌러주세요!**