@echo off
echo 🤖 ML Server 시작
cd MLServer
call .venv\Scripts\activate
echo 가상환경 활성화됨: %VIRTUAL_ENV%
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001
pause