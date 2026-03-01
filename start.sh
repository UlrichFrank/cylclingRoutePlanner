#!/bin/bash

# travelAgent Start Script for Unix/Linux/macOS
# Starts both backend and frontend servers
# Automatically finds available ports if defaults are taken

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_BACKEND_PORT=3001
DEFAULT_FRONTEND_PORT=5173
BACKEND_PORT=$DEFAULT_BACKEND_PORT
FRONTEND_PORT=$DEFAULT_FRONTEND_PORT

# Function to check if port is available
is_port_available() {
    local port=$1
    ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to find available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while [ $port -lt $((start_port + 100)) ]; do
        if is_port_available $port; then
            echo $port
            return 0
        fi
        port=$((port + 1))
    done
    
    echo "0"
    return 1
}

echo -e "${BLUE}🎯 travelAgent Development Server Launcher${NC}"
echo "==========================================="
echo ""

# Check for available ports
echo -e "${BLUE}🔍 Checking available ports...${NC}"

BACKEND_PORT=$(find_available_port $DEFAULT_BACKEND_PORT)
if [ "$BACKEND_PORT" = "0" ]; then
    echo -e "${RED}❌ Could not find available backend port${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend port: $BACKEND_PORT${NC}"

FRONTEND_PORT=$(find_available_port $DEFAULT_FRONTEND_PORT)
if [ "$FRONTEND_PORT" = "0" ]; then
    echo -e "${RED}❌ Could not find available frontend port${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend port: $FRONTEND_PORT${NC}"

# Start backend
echo ""
echo -e "${GREEN}🚀 Starting Backend Server...${NC}"
echo "   Command: npm start (in server/)"
cd "$(dirname "$0")/server"
PORT=$BACKEND_PORT npm start &
BACKEND_PID=$!
cd - > /dev/null

# Wait for backend to start
sleep 2

# Start frontend
echo -e "${GREEN}🚀 Starting Frontend Server...${NC}"
echo "   Command: pnpm dev --port $FRONTEND_PORT"
BACKEND_URL="http://localhost:$BACKEND_PORT/api"
VITE_BACKEND_API_URL=$BACKEND_URL pnpm dev -- --port $FRONTEND_PORT &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✅ Both servers started!${NC}"
echo ""
echo -e "${BLUE}📱 Frontend:${NC}    http://localhost:$FRONTEND_PORT"
echo -e "${BLUE}🔧 Backend API:${NC}  $BACKEND_URL"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop both servers${NC}"
echo ""

# Handle graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}⏹️  Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
