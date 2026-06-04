@echo off
setlocal
cd /d "%~dp0"
title rememberDir Build Tool

echo ============================================================
echo  Starting rememberDir Build Process...
echo ============================================================

:: 1. Check for .NET SDK
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] .NET SDK not found. 
    echo Please install it from: https://dotnet.microsoft.com/download/dotnet/8.0
    pause
    exit /b 1
)

:: 2. Clean previous build
echo.
echo [1/2] Cleaning previous build...
if exist "bin" rd /s /q "bin"

:: 3. Build and Publish
echo.
echo [2/2] Publishing .NET 8.0 Single-File Executable...
echo This may take a few minutes...
echo.

dotnet publish "src\rememberDir.csproj" -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true /p:PublishReadyToRun=true /p:IncludeNativeLibrariesForSelfExtract=true -o "bin"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed. Please check the error messages above.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo  Build Completed Successfully!
echo  Location: %~dp0bin\rememberDir.exe
echo ============================================================
echo.

pause
endlocal
