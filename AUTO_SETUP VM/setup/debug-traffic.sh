#!/bin/bash

echo "================================================"
echo "   DEBUG TRAFFIC TRACKING"
echo "================================================"
echo ""

echo "1️⃣ Checking Xray Stats API..."
echo "   Trying to query stats..."
if /usr/local/bin/xray api statsquery --server=127.0.0.1:10085 2>/dev/null; then
    echo "   ✅ Stats API is working!"
else
    echo "   ❌ Stats API not responding"
    echo "   Run: bash enable-xray-stats.sh"
fi

echo ""
echo "2️⃣ Checking Xray access logs..."
if [ -f /var/log/xray/access.log ]; then
    echo "   Last 10 log entries:"
    tail -10 /var/log/xray/access.log | grep -E "(email|uplink|downlink)" || echo "   No traffic logs found"
else
    echo "   ❌ Log file not found: /var/log/xray/access.log"
fi

echo ""
echo "3️⃣ Checking Traffic Monitor service..."
systemctl status traffic-monitor --no-pager | head -20

echo ""
echo "4️⃣ Checking database for users..."
sqlite3 /opt/xray-monitor/users.db "SELECT id, username, total_upload/1024/1024 as 'Upload_MB', total_download/1024/1024 as 'Download_MB' FROM users;" 2>/dev/null || echo "   Database not accessible"

echo ""
echo "5️⃣ Manual test - Parse recent logs..."
python3 << 'PYTHON_SCRIPT'
import re

try:
    with open('/var/log/xray/access.log', 'r') as f:
        logs = f.readlines()
    
    traffic_data = {}
    for line in logs[-100:]:  # Last 100 lines
        if 'email:' in line:
            email_match = re.search(r'email:\s*(\S+)', line)
            if email_match:
                email = email_match.group(1)
                
                downlink_match = re.search(r'downlink:\s*(\d+)', line)
                uplink_match = re.search(r'uplink:\s*(\d+)', line)
                
                if email not in traffic_data:
                    traffic_data[email] = {'upload': 0, 'download': 0}
                
                if downlink_match:
                    traffic_data[email]['download'] += int(downlink_match.group(1))
                if uplink_match:
                    traffic_data[email]['upload'] += int(uplink_match.group(1))
    
    print("   Traffic from last 100 log lines:")
    for email, traffic in traffic_data.items():
        print(f"   User: {email}")
        print(f"      Upload: {traffic['upload']/1024:.2f} KB")
        print(f"      Download: {traffic['download']/1024:.2f} KB")
        print()
    
    if not traffic_data:
        print("   ⚠️  No traffic data found in logs")
        print("   This is normal if no one has used the proxy yet")

except FileNotFoundError:
    print("   ❌ Log file not found")
except Exception as e:
    print(f"   Error: {e}")
PYTHON_SCRIPT

echo ""
echo "================================================"
echo "   TROUBLESHOOTING STEPS"
echo "================================================"
echo ""
echo "If traffic is still 0:"
echo "1. Make sure someone is actually using the proxy"
echo "2. Check if Xray is logging properly:"
echo "   journalctl -u xray -n 50"
echo ""
echo "3. Restart traffic monitor:"
echo "   systemctl restart traffic-monitor"
echo ""
echo "4. Watch traffic monitor logs in real-time:"
echo "   journalctl -u traffic-monitor -f"
echo ""
echo "5. Manually trigger update:"
echo "   python3 /opt/xray-monitor/traffic_monitor.py"
echo ""

