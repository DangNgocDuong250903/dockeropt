#!/bin/bash

# Script setup Monitoring Dashboard

set -e

echo "================================================"
echo "   SETUP MONITORING DASHBOARD"
echo "================================================"
echo ""

# Kiểm tra root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Script cần chạy với quyền root"
   exit 1
fi

VPS_IP=$(curl -s ifconfig.me)

echo "📦 Cài đặt dependencies..."
apt update -qq
apt install -y python3 python3-pip python3-flask python3-psutil

echo ""
echo "📁 Tạo thư mục app..."
mkdir -p /opt/xray-monitor
mkdir -p /opt/xray-monitor/templates
mkdir -p /opt/xray-monitor/static

echo ""
echo "📄 Copy files..."
cp monitoring-dashboard.py /opt/xray-monitor/
cp user_manager.py /opt/xray-monitor/
cp bandwidth_tracker.py /opt/xray-monitor/
cp traffic_monitor.py /opt/xray-monitor/

# Copy templates
if [ -d "templates" ]; then
    cp templates/*.html /opt/xray-monitor/templates/ 2>/dev/null || true
fi

# Copy static files (PWA)
if [ -d "static" ]; then
    cp -r static/* /opt/xray-monitor/static/ 2>/dev/null || true
fi

echo ""
echo "🔧 Tạo systemd service..."
cat > /etc/systemd/system/xray-monitor.service <<EOF
[Unit]
Description=Xray Monitoring Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xray-monitor
ExecStart=/usr/bin/python3 /opt/xray-monitor/monitoring-dashboard.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "🚀 Start service..."
systemctl daemon-reload
systemctl enable xray-monitor
systemctl start xray-monitor

sleep 2

echo ""
echo "================================================"
echo "✅ MONITORING DASHBOARD ĐÃ CÀI XONG!"
echo "================================================"
echo ""
echo "🌐 Truy cập tại:"
echo "   http://${VPS_IP}:8080"
echo ""
echo "📊 Tính năng:"
echo "   ✅ Real-time stats"
echo "   ✅ Bandwidth monitoring"
echo "   ✅ Active connections"
echo "   ✅ CPU/RAM/Disk usage"
echo "   ✅ Auto-refresh mỗi 3 giây"
echo ""
echo "🔧 Quản lý service:"
echo "   sudo systemctl status xray-monitor"
echo "   sudo systemctl restart xray-monitor"
echo "   sudo journalctl -u xray-monitor -f"
echo ""

