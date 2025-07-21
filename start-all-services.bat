@echo off
echo 🚀 전체 서비스 시작 스크립트
echo.

echo 1. Backend 서비스 시작 중...
cd backend
start "Backend Services" cmd /k "start-services.bat"
cd ..

echo 2. ML Server 시작 중...
cd MLServer
start "ML Server" cmd /k "python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001"
cd ..

echo 3. Frontend 시작 중...
cd project1/frontend
start "Frontend" cmd /k "npm run dev"
cd ../..

echo.
echo ✅ 모든 서비스가 시작되었습니다!
echo.
echo 📍 서비스 주소:
echo - Frontend: http://localhost:3000
echo - Backend: http://localhost:8000  
echo - ML Server: http://localhost:8001
echo.
pause