@echo off
echo Starting MyBachelor Backend Server...

REM Kill any existing Node processes
taskkill /im node.exe /f >nul 2>&1

REM Wait a moment for processes to terminate
timeout /t 2 >nul

REM Start the server
echo Server starting on http://localhost:3001
node index.js

REM If the server fails to start, provide instructions
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Server failed to start. Common issues:
  echo 1. Port 3001 is already in use
  echo 2. MongoDB connection issues
  echo 3. Missing dependencies
  echo.
  echo Try the following:
  echo - Check if port 3001 is free using: netstat -ano | findstr :3001
  echo - Kill processes using: taskkill /PID [PID] /F
  echo - Make sure MongoDB is running
  echo - Run 'npm install' to install dependencies
  echo.
  pause
) 