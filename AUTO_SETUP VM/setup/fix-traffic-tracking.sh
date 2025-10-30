#!/bin/bash

echo "================================================"
echo "   FIX TRAFFIC TRACKING - ONE-CLICK"
echo "================================================"
echo ""

if [[ $EUID -ne 0 ]]; then
   echo "❌ Please run with sudo"
   exit 1
fi

echo "🔧 Step 1: Enable Xray Stats API..."
bash enable-xray-stats.sh

echo ""
echo "🔧 Step 2: Update Python files..."
cp traffic_monitor.py /opt/xray-monitor/ 2>/dev/null || echo "   ⚠️  traffic_monitor.py not found in current dir"
cp user_manager.py /opt/xray-monitor/ 2>/dev/null || echo "   ⚠️  user_manager.py not found in current dir"
cp monitoring-dashboard.py /opt/xray-monitor/ 2>/dev/null || echo "   ⚠️  monitoring-dashboard.py not found in current dir"

echo ""
echo "🔧 Step 3: Update templates..."
if [ -d "templates" ]; then
    cp templates/*.html /opt/xray-monitor/templates/ 2>/dev/null || true
    echo "   ✅ Templates updated"
fi

echo ""
echo "🔧 Step 4: Restart all services..."
systemctl restart xray
sleep 2
systemctl restart xray-monitor
systemctl restart traffic-monitor
systemctl restart bandwidth-tracker
sleep 3

echo ""
echo "🔍 Step 5: Check service status..."
echo ""
echo "   Xray:"
systemctl is-active xray && echo "   ✅ Running" || echo "   ❌ Not running"

echo ""
echo "   Dashboard:"
systemctl is-active xray-monitor && echo "   ✅ Running" || echo "   ❌ Not running"

echo ""
echo "   Traffic Monitor:"
systemctl is-active traffic-monitor && echo "   ✅ Running" || echo "   ❌ Not running"

echo ""
echo "================================================"
echo "✅ FIX COMPLETED!"
echo "================================================"
echo ""
echo "📊 Next steps:"
echo ""
echo "1. Use your proxy to generate some traffic"
echo "2. Wait 5 minutes for traffic monitor to update"
echo "3. Reload dashboard to see traffic stats"
echo ""
echo "🔍 Debug if traffic still 0:"
echo "   sudo bash debug-traffic.sh"
echo ""
VPS_IP=$(curl -s ifconfig.me)
echo "🌐 Dashboard: http://${VPS_IP}:8080"
echo ""

