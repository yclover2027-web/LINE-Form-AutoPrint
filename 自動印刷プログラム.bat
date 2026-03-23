@echo off
pushd "%~dp0"
powershell -ExecutionPolicy Bypass -File "自動印刷プログラム.ps1"
if %errorlevel% neq 0 (
    echo.
    echo ❌ エラーが発生しました。
    pause
)
popd
