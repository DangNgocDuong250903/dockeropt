#!/bin/bash
# Master Setup Script - Multi-VM Management System
# This script sets up the complete central dashboard with multi-VM support

echo "================================================"
echo "   MULTI-VM MANAGEMENT SYSTEM SETUP"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo bash setup-multi-vm-system.sh)"
    exit 1
fi

# Step 1: Install dependencies
echo "📦 Step 1/8: Installing dependencies..."
apt update -qq
apt install -y \
    python3 \
    python3-pip \
    sqlite3 \
    qrencode \
    curl \
    wget

pip3 install --upgrade pip
pip3 install \
    flask \
    psutil \
    requests \
    paramiko \
    qrcode \
    Pillow

echo "   ✅ Dependencies installed"

# Step 2: Create directories
echo ""
echo "📁 Step 2/8: Creating directories..."
mkdir -p /opt/xray-monitor
mkdir -p /opt/vpn-business
mkdir -p /var/log/xray
mkdir -p /opt/xray-monitor/backups

echo "   ✅ Directories created"

# Step 3: Copy files
echo ""
echo "📤 Step 3/8: Installing system files..."
cd "$(dirname "$0")/.."

cp -r monitoring/*.py /opt/xray-monitor/
cp -r monitoring/templates /opt/xray-monitor/
cp -r monitoring/static /opt/xray-monitor/ 2>/dev/null || true

chmod +x /opt/xray-monitor/*.py

echo "   ✅ Files installed"

# Step 4: Initialize databases
echo ""
echo "💾 Step 4/8: Initializing databases..."
python3 << 'PYTHON'
import sys
sys.path.append('/opt/xray-monitor')

from server_manager import ServerManager
from user_manager import UserManager
from bandwidth_tracker import BandwidthTracker
from user_migration import init_migration_db

# Initialize all databases
sm = ServerManager()
um = UserManager()
bt = BandwidthTracker()
init_migration_db()

print("   ✅ Databases initialized")
PYTHON

# Step 5: Install systemd services
echo ""
echo "⚙️  Step 5/8: Installing systemd services..."

# Main dashboard service
cat > /etc/systemd/system/monitoring-dashboard.service <<'EOF'
[Unit]
Description=Xray Multi-VM Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xray-monitor
ExecStart=/usr/bin/python3 /opt/xray-monitor/monitoring-dashboard.py
Restart=always
RestartSec=10
Environment="FLASK_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

# Health monitor service
cat > /etc/systemd/system/health-monitor.service <<'EOF'
[Unit]
Description=Xray Health Monitor
After=network.target monitoring-dashboard.service

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

# Traffic aggregator service
cat > /etc/systemd/system/traffic-aggregator.service <<'EOF'
[Unit]
Description=Xray Traffic Aggregator
After=network.target monitoring-dashboard.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xray-monitor
ExecStart=/usr/bin/python3 /opt/xray-monitor/traffic_aggregator.py
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

# Connection monitor (existing)
cat > /etc/systemd/system/connection-monitor.service <<'EOF'
[Unit]
Description=Xray Connection Monitor
After=network.target xray.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xray-monitor
ExecStart=/usr/bin/python3 /opt/xray-monitor/connection_monitor.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "   ✅ Services created"

# Step 6: Reload and enable services
echo ""
echo "🔄 Step 6/8: Enabling services..."
systemctl daemon-reload

systemctl enable monitoring-dashboard
systemctl enable health-monitor
systemctl enable traffic-aggregator
systemctl enable connection-monitor

echo "   ✅ Services enabled"

# Step 7: Start services
echo ""
echo "🚀 Step 7/8: Starting services..."

systemctl start monitoring-dashboard
sleep 2
systemctl start health-monitor
sleep 1
systemctl start traffic-aggregator
sleep 1
systemctl start connection-monitor

echo "   ✅ Services started"

# Step 8: Create CLI tool symlink
echo ""
echo "🔗 Step 8/8: Creating CLI tool..."
chmod +x /opt/xray-monitor/vm-manager.py
ln -sf /opt/xray-monitor/vm-manager.py /usr/local/bin/vm-manager

echo "   ✅ CLI tool installed"

# Check status
echo ""
echo "================================================"
echo "   INSTALLATION COMPLETED!"
echo "================================================"
echo ""

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "📋 Service Status:"
echo ""

services=("monitoring-dashboard" "health-monitor" "traffic-aggregator" "connection-monitor")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "  ✅ $service: Running"
    else
        echo "  ❌ $service: Failed"
    fi
done

echo ""
echo "🌐 Dashboard Access:"
echo "   URL: http://$SERVER_IP:8080"
echo "   Login: Ngocduong2509"
echo "   Password: Ngocduong2509"
echo ""

echo "🛠️  CLI Tool:"
echo "   vm-manager servers list"
echo "   vm-manager servers add --name HK-1 --ip 35.x.x.x --region 'Hong Kong'"
echo "   vm-manager servers health --all"
echo "   vm-manager users assign --user-id 1 --uuid ... --username test"
echo "   vm-manager users migrate 1 2"
echo "   vm-manager loadbalancer --show"
echo "   vm-manager traffic top --limit 10"
echo ""

echo "📖 Next Steps:"
echo "   1. Access dashboard: http://$SERVER_IP:8080"
echo "   2. Add your first server:"
echo "      vm-manager servers add --name SG-Server-1 --ip YOUR_VM_IP --region Singapore"
echo "   3. Deploy agent on VMs:"
echo "      scp monitoring/xray-agent.py root@VM_IP:/opt/xray-monitor/"
echo "      scp monitoring/setup-xray-agent.sh root@VM_IP:~/"
echo "      ssh root@VM_IP 'bash setup-xray-agent.sh'"
echo "   4. Create users and they'll auto-assign to optimal servers"
echo ""

echo "📝 Log Files:"
echo "   Dashboard: journalctl -u monitoring-dashboard -f"
echo "   Health: journalctl -u health-monitor -f"
echo "   Traffic: journalctl -u traffic-aggregator -f"
echo ""

echo "================================================"
echo "   🎉 SETUP COMPLETE! Enjoy your Multi-VM System!"
echo "================================================"

