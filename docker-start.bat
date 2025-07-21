@echo off
echo 🐳 Docker로 전체 서비스 시작
echo.

echo 환경을 선택하세요:
echo 1. 개발 환경 (코드 변경 실시간 반영)
echo 2. 프로덕션 환경 (최적화된 빌드)
echo.

set /p choice="선택 (1 또는 2): "

if "%choice%"=="1" (
    echo.
    echo 🚀 개발 환경으로 시작 중...
    docker-compose -f docker-compose.dev.yml up --build
) else if "%choice%"=="2" (
    echo.
    echo 🚀 프로덕션 환경으로 시작 중...
    docker-compose up --build
) else (
    echo.
    echo ❌ 잘못된 선택입니다. 1 또는 2를 입력하세요.
    pause
    goto :eof
)

pause