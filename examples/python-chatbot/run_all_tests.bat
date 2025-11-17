@echo off
REM Run SDK test with the correct Python interpreter
set PYTHON_PATH=C:\Users\LENOVO\AppData\Local\Programs\Python\Python311\python.exe

echo Running SDK test...
"%PYTHON_PATH%" test_sdk.py

echo.
echo ========================================
echo Test complete!
echo ========================================
pause

