#!/bin/bash
# Setup Health Monitor Service

echo "================================================"
echo "   HEALTH MONITOR SETUP"
echo "================================================"

# Copy health monitor
echo "📤 Installing health monitor..."
mkdir -p /opt/xray-monitor
cp health_monitor.py /opt/xray-monitor/
chmod +x /opt/xray-monitor/health_monitor.py

# Create log directory
mkdir -p /var/log/xray

# Create systemd service
echo "⚙️  Creating systemd service..."
cat > /etc/systemd/system/health-monitor.service <<'EOF'
[Unit]
Description=Xray Health Monitor - Periodic health checks
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xray-monitor
ExecStart=/usr/bin/python3 /opt/xray-monitor/health_monitor.py
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable and start
echo "🚀 Starting health monitor..."
systemctl enable health-monitor
systemctl start health-monitor

# Check status
sleep 2
if systemctl is-active --quiet health-monitor; then
    echo "✅ Health Monitor installed and running!"
    echo ""
    echo "📋 Commands:"
    echo "   Status: systemctl status health-monitor"
    echo "   Logs:   journalctl -u health-monitor -f"
    echo "   Stop:   systemctl stop health-monitor"
else
    echo "❌ Failed to start"
    journalctl -u health-monitor -n 20 --no-pager
fi

