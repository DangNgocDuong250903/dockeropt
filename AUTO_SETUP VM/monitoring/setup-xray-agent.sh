#!/bin/bash
# Setup Xray Agent Service

echo "================================================"
echo "   XRAY AGENT SETUP"
echo "================================================"

# Install dependencies
echo "📦 Installing dependencies..."
apt update -qq
apt install -y python3 python3-pip
pip3 install flask psutil requests

# Copy agent to /opt/xray-monitor
echo "📤 Installing agent..."
mkdir -p /opt/xray-monitor
cp xray-agent.py /opt/xray-monitor/
chmod +x /opt/xray-monitor/xray-agent.py

# Create systemd service
echo "⚙️  Creating systemd service..."
cat > /etc/systemd/system/xray-agent.service <<'EOF'
[Unit]
Description=Xray Agent - Report stats to Central Dashboard
After=network.target xray.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xray-monitor
ExecStart=/usr/bin/python3 /opt/xray-monitor/xray-agent.py
Restart=always
RestartSec=10
Environment="CENTRAL_DASHBOARD_URL=http://CENTRAL_IP:5000"
Environment="AGENT_TOKEN=your-secret-token-here"

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable and start service
echo "🚀 Starting agent service..."
systemctl enable xray-agent
systemctl start xray-agent

# Check status
sleep 2
if systemctl is-active --quiet xray-agent; then
    echo "✅ Xray Agent installed and running!"
    echo ""
    echo "📋 Service info:"
    echo "   Status: $(systemctl is-active xray-agent)"
    echo "   Port: 8081"
    echo ""
    echo "🔧 Commands:"
    echo "   Check status: systemctl status xray-agent"
    echo "   View logs:    journalctl -u xray-agent -f"
    echo "   Restart:      systemctl restart xray-agent"
    echo ""
    echo "⚠️  Don't forget to:"
    echo "   1. Set CENTRAL_DASHBOARD_URL in /etc/systemd/system/xray-agent.service"
    echo "   2. Set AGENT_TOKEN (same as central dashboard)"
    echo "   3. Reload: systemctl daemon-reload && systemctl restart xray-agent"
else
    echo "❌ Failed to start agent service"
    journalctl -u xray-agent -n 20 --no-pager
fi

