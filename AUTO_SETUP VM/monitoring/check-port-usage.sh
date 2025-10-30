#!/bin/bash
# Check which process is using port 8080

echo "================================================"
echo "   PORT 8080 USAGE CHECKER"
echo "================================================"
echo ""

PORT=8080

echo "🔍 Checking port $PORT..."
echo ""

# Method 1: lsof
echo "📋 Using lsof:"
if command -v lsof &> /dev/null; then
    sudo lsof -i:$PORT
    echo ""
else
    echo "lsof not installed"
    echo ""
fi

# Method 2: netstat
echo "📋 Using netstat:"
if command -v netstat &> /dev/null; then
    sudo netstat -tulpn | grep :$PORT
    echo ""
else
    echo "netstat not installed"
    echo ""
fi

# Method 3: ss
echo "📋 Using ss:"
if command -v ss &> /dev/null; then
    sudo ss -tulpn | grep :$PORT
    echo ""
else
    echo "ss not installed"
    echo ""
fi

# Method 4: fuser
echo "📋 Using fuser:"
if command -v fuser &> /dev/null; then
    sudo fuser $PORT/tcp
    echo ""
else
    echo "fuser not installed"
    echo ""
fi

# Find all python processes
echo "📋 All Python3 processes:"
ps aux | grep python3 | grep -v grep

echo ""
echo "================================================"
echo "   RECOMMENDATION"
echo "================================================"
echo ""
echo "To kill all processes on port $PORT:"
echo "  sudo fuser -k $PORT/tcp"
echo ""
echo "To kill specific PID:"
echo "  sudo kill -9 <PID>"
echo ""
echo "To stop monitoring-dashboard service:"
echo "  sudo systemctl stop monitoring-dashboard"
echo ""

