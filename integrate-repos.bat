@echo off
echo Git 저장소 통합 스크립트
echo.

echo 1. 각 폴더의 .git 디렉토리 백업 중...
if exist backend\.git (
    move backend\.git backend\.git.backup
    echo backend\.git 백업 완료
)

if exist MLServer\.git (
    move MLServer\.git MLServer\.git.backup  
    echo MLServer\.git 백업 완료
)

if exist project1\.git (
    move project1\.git project1\.git.backup
    echo project1\.git 백업 완료
)

echo.
echo 2. 루트 Git에 모든 파일 추가 중...
git add .
git commit -m "통합: 모든 프로젝트를 단일 저장소로 통합"

echo.
echo 통합 완료!
echo 각 프로젝트는 이제 루트 Git 저장소에서 관리됩니다.
echo.
echo 백업된 .git 폴더들:
echo - backend\.git.backup
echo - MLServer\.git.backup  
echo - project1\.git.backup
echo.
pause