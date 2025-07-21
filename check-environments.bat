@echo off
echo 🔍 개발 환경 확인 스크립트
echo.

echo ========================================
echo 📋 시스템 요구사항 확인
echo ========================================

echo 1. Python 버전 확인:
python --version 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python이 설치되지 않았습니다.
) else (
    echo ✅ Python 설치됨
)

echo.
echo 2. Node.js 버전 확인:
node --version 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js가 설치되지 않았습니다.
) else (
    echo ✅ Node.js 설치됨
)

echo.
echo 3. Git 버전 확인:
git --version 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git이 설치되지 않았습니다.
) else (
    echo ✅ Git 설치됨
)

echo.
echo 4. Docker 버전 확인:
docker --version 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker가 설치되지 않았습니다.
) else (
    echo ✅ Docker 설치됨
)

echo.
echo 5. Docker Compose 버전 확인:
docker-compose --version 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker Compose가 설치되지 않았습니다.
) else (
    echo ✅ Docker Compose 설치됨
)

echo.
echo ========================================
echo 📁 프로젝트 구조 확인
echo ========================================

echo 6. Backend 폴더 확인:
if exist "backend" (
    echo ✅ backend 폴더 존재
    if exist "backend\pyproject.toml" (
        echo ✅ backend\pyproject.toml 존재
    ) else (
        echo ❌ backend\pyproject.toml 없음
    )
    if exist "backend\Dockerfile" (
        echo ✅ backend\Dockerfile 존재
    ) else (
        echo ❌ backend\Dockerfile 없음
    )
) else (
    echo ❌ backend 폴더 없음
)

echo.
echo 7. MLServer 폴더 확인:
if exist "MLServer" (
    echo ✅ MLServer 폴더 존재
    if exist "MLServer\pyproject.toml" (
        echo ✅ MLServer\pyproject.toml 존재
    ) else (
        echo ❌ MLServer\pyproject.toml 없음
    )
    if exist "MLServer\Dockerfile" (
        echo ✅ MLServer\Dockerfile 존재
    ) else (
        echo ❌ MLServer\Dockerfile 없음
    )
) else (
    echo ❌ MLServer 폴더 없음
)

echo.
echo 8. Frontend 폴더 확인:
if exist "project1\frontend" (
    echo ✅ project1\frontend 폴더 존재
    if exist "project1\frontend\package.json" (
        echo ✅ project1\frontend\package.json 존재
    ) else (
        echo ❌ project1\frontend\package.json 없음
    )
    if exist "project1\frontend\Dockerfile" (
        echo ✅ project1\frontend\Dockerfile 존재
    ) else (
        echo ❌ project1\frontend\Dockerfile 없음
    )
) else (
    echo ❌ project1\frontend 폴더 없음
)

echo.
echo ========================================
echo 🔧 환경 설정 파일 확인
echo ========================================

echo 9. MLServer .env 파일 확인:
if exist "MLServer\.env" (
    echo ✅ MLServer\.env 존재
) else (
    echo ❌ MLServer\.env 없음 - API 키 설정 필요
)

echo.
echo 10. Docker Compose 파일 확인:
if exist "docker-compose.yml" (
    echo ✅ docker-compose.yml 존재
) else (
    echo ❌ docker-compose.yml 없음
)

if exist "docker-compose.dev.yml" (
    echo ✅ docker-compose.dev.yml 존재
) else (
    echo ❌ docker-compose.dev.yml 없음
)

echo.
echo ========================================
echo 🚀 실행 스크립트 확인
echo ========================================

echo 11. 실행 스크립트들:
if exist "start-all-services.bat" (
    echo ✅ start-all-services.bat 존재 (로컬 실행)
) else (
    echo ❌ start-all-services.bat 없음
)

if exist "docker-start.bat" (
    echo ✅ docker-start.bat 존재 (Docker 실행)
) else (
    echo ❌ docker-start.bat 없음
)

echo.
echo ========================================
echo 📊 요약
echo ========================================

echo 모든 확인이 완료되었습니다.
echo.
echo 🎯 실행 방법:
echo   로컬 실행: start-all-services.bat
echo   Docker 실행: docker-start.bat
echo.
echo ❌ 표시된 항목들을 설치/설정해주세요.
echo.

pause