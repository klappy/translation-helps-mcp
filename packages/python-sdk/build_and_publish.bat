@echo off
REM Build and publish script for Translation Helps MCP Python SDK

echo ==========================================
echo Building Translation Helps MCP Python SDK
echo ==========================================

REM Clean previous builds
echo Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build
for /d %%d in (*.egg-info) do rmdir /s /q %%d

REM Install build tools
echo Installing build tools...
pip install build twine -q

REM Build the package
echo Building package...
python -m build

REM Check the package
echo Checking package...
twine check dist/*

echo.
echo ==========================================
echo Build successful!
echo ==========================================
echo.
echo Package files created:
dir dist
echo.
echo To publish to TestPyPI:
echo   twine upload --repository testpypi dist/*
echo.
echo To publish to PyPI:
echo   twine upload dist/*
echo.
echo You'll need your PyPI API token.
echo Get it from: https://pypi.org/manage/account/token/

pause


