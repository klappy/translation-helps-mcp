@echo off
echo.
echo ====================================
echo   MCP Server Status Check
echo ====================================
echo.

if exist mcp-debug.log (
    echo ✅ MCP Server is running!
    echo.
    echo Latest log entries:
    echo ------------------------------------
    powershell -command "Get-Content mcp-debug.log -Tail 15"
    echo ------------------------------------
    echo.
    echo If you see "Debug wrapper ready", the server is initialized.
    echo If you see "RECEIVED FROM CURSOR", Cursor is sending requests.
    echo.
) else (
    echo ❌ MCP Server has not started yet
    echo.
    echo This means either:
    echo   1. Cursor hasn't been restarted after config changes
    echo   2. MCP server failed to start
    echo   3. You need to wait a bit longer
    echo.
    echo SOLUTION: Close Cursor completely and reopen it
    echo.
)

echo.
echo Press any key to exit...
pause > nul


