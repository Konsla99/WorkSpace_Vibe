@echo off
chcp 65001 >nul
title Resume_Gem - Dependency Setup
echo ======================================================
echo  Resume_Gem 의존성 라이브러리 설치 시작
echo ======================================================

:: Node.js 설치 확인
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org/ 에서 Node.js를 먼저 설치해 주세요.
    pause
    exit /b
)

echo.
echo [1/2] 기존 node_modules 확인 중...
if exist node_modules (
    echo 기존 폴더가 존재합니다. 업데이트를 진행합니다.
)

echo.
echo [2/2] npm install 실행 중 (잠시만 기다려 주세요)...
call npm install

if %errorlevel% eq 0 (
    echo.
    echo ======================================================
    echo  라이브러리 설치가 완료되었습니다!
    echo  이제 'npm run build'를 통해 빌드가 가능합니다.
    echo ======================================================
) else (
    echo.
    echo [오류] 설치 중 문제가 발생했습니다. 네트워크 상태를 확인해 주세요.
)

pause
