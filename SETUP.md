# 🚀 개발 환경 설정 가이드

## 1. Git 초기화

```bash
cd food/FoodCalorie
git init
git add .
git commit -m "Initial commit: 체감(ChaeGam) 통합 프로젝트"
```

## 2. 가상환경 설정

### Backend (Django)

```bash
cd backend

# Python 가상환경 생성
python -m venv venv

# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 또는 uv 사용 (권장)
uv venv
uv pip install -r requirements.txt

# Django 마이그레이션
python manage.py migrate

# 슈퍼유저 생성 (선택사항)
python manage.py createsuperuser

# 서버 실행
python manage.py runserver
```

### MLServer (FastAPI)

```bash
cd MLServer

# Python 가상환경 생성
python -m venv venv
venv\Scripts\activate

# 또는 uv 사용 (권장)
uv venv
uv pip install -r requirements.txt

# 서버 실행
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001
```

### Frontend (Next.js)

```bash
cd project1

# Node.js 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

## 3. 환경 변수 설정

### Backend (.env)
```bash
cd backend
cp .env.example .env  # .env 파일이 없다면 생성
```

필요한 환경 변수:
- `GEMINI_API_KEY`: Google Gemini API 키
- `SECRET_KEY`: Django 시크릿 키
- `DEBUG`: 개발 모드 설정

### MLServer
```bash
cd MLServer
cp env_ex.txt .env  # 환경 변수 예시 파일 참고
```

## 4. 데이터베이스 설정

```bash
cd backend

# 마이그레이션 파일 생성
python manage.py makemigrations

# 마이그레이션 실행
python manage.py migrate

# 초기 데이터 로드 (선택사항)
python manage.py loaddata initial_data.json
```

## 5. Redis 설정 (Windows)

```bash
# Redis 서버 시작 (backend/redis-windows 폴더 사용)
cd backend/redis-windows
redis-server.exe
```

## 6. 전체 서비스 실행 순서

1. **Redis 서버 시작**
2. **Backend 서버 시작** (포트 8000)
3. **MLServer 시작** (포트 8001)  
4. **Frontend 시작** (포트 3000)

## 7. 개발 도구 설정

### VS Code 워크스페이스
```bash
code workspace.code-workspace
```

### Git 설정
```bash
# .gitignore 확인 및 수정
git add .gitignore
git commit -m "Update gitignore"

# 브랜치 생성
git checkout -b develop
```

## 8. 테스트 실행

### Backend 테스트
```bash
cd backend
python manage.py test
```

### Frontend 테스트
```bash
cd project1
npm test
```

## 9. 빌드 및 배포

### Frontend 빌드
```bash
cd project1
npm run build
```

### Docker 실행 (선택사항)
```bash
docker-start.bat
```

## 🔧 문제 해결

### 포트 충돌 시
- Backend: `python manage.py runserver 8080`
- MLServer: `uvicorn api.main:app --port 8002`
- Frontend: `npm run dev -- -p 3001`

### 패키지 설치 오류 시
```bash
# Python 패키지
pip install --upgrade pip
uv pip install -r requirements.txt --force-reinstall

# Node.js 패키지
npm cache clean --force
npm install
```

### 데이터베이스 초기화
```bash
cd backend
rm db.sqlite3
python manage.py migrate
```

---

**💡 팁**: 각 터미널 창에서 서비스를 개별 실행하거나, `start-all-services.bat` 스크립트를 사용하세요!