#!/bin/bash

# travelAgent Start Script for Unix/Linux/macOS
# Starts Backend and Frontend servers
# Uses public Valhalla API and Open-Elevation API

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

# Array to store PIDs for cleanup
declare -a PIDS=()

# Info about services
echo ""
echo -e "${BLUE}🌐 External Services:${NC}"
echo -e "   Routing:  ${GREEN}https://valhalla1.openstreetmap.de${NC}"
echo -e "   Elevation: ${GREEN}https://api.open-elevation.com${NC}"
echo ""

# Start backend
echo -e "${GREEN}🚀 Starting Backend Server (port $BACKEND_PORT)...${NC}"
cd "$(dirname "$0")/server"
PORT=$BACKEND_PORT npm start &
BACKEND_PID=$!
PIDS+=($BACKEND_PID)
cd - > /dev/null

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${GREEN}🚀 Starting Frontend Server (port $FRONTEND_PORT)...${NC}"
BACKEND_URL="http://localhost:$BACKEND_PORT/api"
VITE_BACKEND_API_URL=$BACKEND_URL pnpm dev -- --port $FRONTEND_PORT &
FRONTEND_PID=$!
PIDS+=($FRONTEND_PID)

sleep 2

# Summary
echo ""
echo -e "${GREEN}✅ All servers started!${NC}"
echo ""
echo -e "${BLUE}📱 Services:${NC}"
echo -e "   Frontend:       ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "   Backend API:    ${GREEN}http://localhost:$BACKEND_PORT/api${NC}"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop all servers${NC}"
echo ""

# Handle graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}⏹️  Shutting down servers...${NC}"
    
    for pid in "${PIDS[@]}"; do
        kill $pid 2>/dev/null || true
    done
    
    for pid in "${PIDS[@]}"; do
        wait $pid 2>/dev/null || true
    done
    
    echo -e "${GREEN}✅ All servers stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for all processes
wait


