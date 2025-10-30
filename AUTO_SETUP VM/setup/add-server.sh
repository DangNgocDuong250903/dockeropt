#!/bin/bash

echo "================================================"
echo "   ADD NEW VPS SERVER - AUTO SETUP"
echo "================================================"
echo ""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ip)
            SERVER_IP="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --name)
            SERVER_NAME="$2"
            shift 2
            ;;
        --ssh-key)
            SSH_KEY="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Default values
SSH_KEY=${SSH_KEY:-~/.ssh/id_rsa}

# Validate
if [ -z "$SERVER_IP" ] || [ -z "$REGION" ] || [ -z "$SERVER_NAME" ]; then
    echo "❌ Missing required arguments!"
    echo ""
    echo "Usage:"
    echo "  bash add-server.sh --ip IP --region REGION --name NAME [--ssh-key PATH]"
    echo ""
    echo "Example:"
    echo "  bash add-server.sh --ip 35.200.100.50 --region Singapore --name SG-Server-1"
    exit 1
fi

echo "📋 Server Info:"
echo "   Name:   $SERVER_NAME"
echo "   IP:     $SERVER_IP"
echo "   Region: $REGION"
echo "   SSH:    $SSH_KEY"
echo ""

# Step 1: Test SSH connection
echo "🔌 Step 1/7: Testing SSH connection..."
if ssh -i $SSH_KEY -o ConnectTimeout=5 -o BatchMode=yes root@$SERVER_IP "echo 'SSH OK'" &>/dev/null; then
    echo "   ✅ SSH connection successful"
else
    echo "   ❌ SSH connection failed!"
    echo "   Make sure:"
    echo "   - VPS is running"
    echo "   - SSH key is correct"
    echo "   - Firewall allows SSH"
    exit 1
fi

# Step 2: Install Xray
echo ""
echo "📦 Step 2/7: Installing Xray..."
ssh -i $SSH_KEY root@$SERVER_IP << 'INSTALL_XRAY'
    # Install Xray
    bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
    
    # Enable service
    systemctl enable xray
    
    # Create directories
    mkdir -p /var/log/xray
    mkdir -p /opt/xray-monitor
    
    echo "Xray installed!"
INSTALL_XRAY

if [ $? -eq 0 ]; then
    echo "   ✅ Xray installed"
else
    echo "   ❌ Xray installation failed"
    exit 1
fi

# Step 3: Configure firewall
echo ""
echo "🔥 Step 3/7: Configuring firewall..."
ssh -i $SSH_KEY root@$SERVER_IP << 'FIREWALL'
    # Allow ports
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp
        ufw allow 443/tcp
        ufw allow 80/tcp
        echo "y" | ufw enable
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=22/tcp
        firewall-cmd --permanent --add-port=443/tcp
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --reload
    fi
    
    echo "Firewall configured!"
FIREWALL

echo "   ✅ Firewall configured"

# Step 4: Install monitoring tools
echo ""
echo "📊 Step 4/7: Installing monitoring tools..."
ssh -i $SSH_KEY root@$SERVER_IP << 'MONITORING'
    apt update -qq
    apt install -y python3 python3-pip qrencode
    pip3 install psutil flask
    
    echo "Monitoring tools installed!"
MONITORING

echo "   ✅ Monitoring tools installed"

# Step 5: Upload monitoring scripts
echo ""
echo "📤 Step 5/7: Uploading monitoring scripts..."

if [ -f "traffic_monitor.py" ]; then
    scp -i $SSH_KEY traffic_monitor.py root@$SERVER_IP:/opt/xray-monitor/
    echo "   ✅ traffic_monitor.py uploaded"
fi

if [ -f "user_manager.py" ]; then
    scp -i $SSH_KEY user_manager.py root@$SERVER_IP:/opt/xray-monitor/
    echo "   ✅ user_manager.py uploaded"
fi

# Step 6: Create basic Xray config
echo ""
echo "⚙️  Step 6/7: Creating Xray config..."
ssh -i $SSH_KEY root@$SERVER_IP << 'XRAY_CONFIG'
    cat > /usr/local/etc/xray/config.json <<'EOF'
{
  "log": {
    "loglevel": "warning",
    "access": "/var/log/xray/access.log",
    "error": "/var/log/xray/error.log"
  },
  "inbounds": [
    {
      "port": 443,
      "protocol": "vmess",
      "settings": {
        "clients": []
      },
      "streamSettings": {
        "network": "tcp"
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "tag": "direct"
    }
  ]
}
EOF
    
    # Start Xray
    systemctl restart xray
    
    echo "Xray config created!"
XRAY_CONFIG

echo "   ✅ Xray configured and started"

# Step 7: Add to Central database
echo ""
echo "💾 Step 7/7: Adding to Central database..."

python3 << PYTHON
from server_manager import ServerManager

sm = ServerManager()
result = sm.add_server(
    name="$SERVER_NAME",
    ip="$SERVER_IP",
    region="$REGION",
    ssh_key_path="$SSH_KEY"
)

if result['success']:
    print(f"   ✅ Server added to database (ID: {result['server_id']})")
else:
    print(f"   ❌ Failed: {result.get('error')}")
PYTHON

# Done!
echo ""
echo "================================================"
echo "✅ SERVER SETUP COMPLETED!"
echo "================================================"
echo ""
echo "📋 Server Details:"
echo "   Name:   $SERVER_NAME"
echo "   IP:     $SERVER_IP"
echo "   Region: $REGION"
echo "   Status: Active"
echo ""
echo "🎯 Next Steps:"
echo "   1. Sync users:  python3 -c \"from server_manager import ServerManager; sm = ServerManager(); sm.sync_users_to_server(1, users)\""
echo "   2. Check health: python3 -c \"from server_manager import ServerManager; sm = ServerManager(); sm.health_check_all()\""
echo "   3. View dashboard: http://<central-ip>:8080"
echo ""

