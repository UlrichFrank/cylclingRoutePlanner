@echo off
REM travelAgent Start Script for Windows
REM Starts both backend and frontend servers

setlocal enabledelayedexpansion

echo.
echo 🎯 travelAgent Development Server Launcher
echo ===========================================
echo.

set BACKEND_PORT=3001
set FRONTEND_PORT=5173

echo 🔍 Checking available ports...
echo ✅ Backend port: %BACKEND_PORT%
echo ✅ Frontend port: %FRONTEND_PORT%
echo.

echo 🚀 Starting Backend Server...
echo    Command: npm start (in server/)
cd server
start "travelAgent Backend" cmd /k "npm start"
cd ..
echo.

timeout /t 2 /nobreak > nul

echo 🚀 Starting Frontend Server...
echo    Command: pnpm dev --port %FRONTEND_PORT%
set VITE_BACKEND_API_URL=http://localhost:%BACKEND_PORT%/api
start "travelAgent Frontend" cmd /k "pnpm dev -- --port %FRONTEND_PORT%"

echo.
echo ✅ Both servers started!
echo.
echo 📱 Frontend:    http://localhost:%FRONTEND_PORT%
echo 🔧 Backend API: http://localhost:%BACKEND_PORT%/api
echo.
echo 💡 Close the console windows to stop the servers
echo.

endlocal
