@echo off
echo 🔧 Backend 서비스 시작
cd backend
call .venv\Scripts\activate
echo 가상환경 활성화됨: %VIRTUAL_ENV%
start-services.bat
pause