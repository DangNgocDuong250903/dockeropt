#!/bin/bash

# Setup GeoIP Blocking cho Xray

set -e

echo "================================================"
echo "   SETUP GEOIP BLOCKING"
echo "================================================"
echo ""

if [[ $EUID -ne 0 ]]; then
   echo "❌ Script cần chạy với quyền root"
   exit 1
fi

echo "📥 Downloading GeoIP database..."
mkdir -p /usr/local/share/xray
cd /usr/local/share/xray

# Download Geo files từ Loyalsoldier
wget -O geoip.dat https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat
wget -O geosite.dat https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat

echo "✅ GeoIP database downloaded!"
echo ""

echo "⚙️  Configuring Xray routing rules..."

# Backup current config
cp /usr/local/etc/xray/config.json /usr/local/etc/xray/config.json.backup-geoip

# Read current config
CURRENT_CONFIG=$(cat /usr/local/etc/xray/config.json)

# Add routing rules (nếu chưa có)
if ! grep -q "geoip" /usr/local/etc/xray/config.json; then
    echo "Adding GeoIP routing rules..."
    
    # Create new config with routing
    python3 - <<'EOF'
import json

with open('/usr/local/etc/xray/config.json', 'r') as f:
    config = json.load(f)

# Add routing configuration
if 'routing' not in config:
    config['routing'] = {
        "domainStrategy": "AsIs",
        "rules": []
    }

# Add GeoIP rules
config['routing']['rules'] = [
    {
        "type": "field",
        "ip": ["geoip:private"],
        "outboundTag": "direct"
    },
    {
        "type": "field",
        "domain": ["geosite:category-ads-all"],
        "outboundTag": "block"
    }
]

# Add outbounds if not exist
if 'outbounds' not in config:
    config['outbounds'] = []

# Ensure direct and block outbounds exist
has_direct = any(o.get('tag') == 'direct' for o in config['outbounds'])
has_block = any(o.get('tag') == 'block' for o in config['outbounds'])

if not has_direct:
    config['outbounds'].append({
        "protocol": "freedom",
        "tag": "direct"
    })

if not has_block:
    config['outbounds'].append({
        "protocol": "blackhole",
        "tag": "block"
    })

# Save config
with open('/usr/local/etc/xray/config.json', 'w') as f:
    json.dump(config, f, indent=2)

print("GeoIP routing rules added!")
EOF

else
    echo "GeoIP rules already configured!"
fi

echo ""
echo "🔄 Restarting Xray..."
systemctl restart xray

echo ""
echo "================================================"
echo "✅ GEOIP BLOCKING SETUP COMPLETE!"
echo "================================================"
echo ""
echo "📋 Features enabled:"
echo "   ✅ Block private IPs (direct routing)"
echo "   ✅ Block ads domains"
echo "   ✅ GeoIP database installed"
echo ""
echo "🎯 To customize blocking rules, edit:"
echo "   /usr/local/etc/xray/config.json"
echo ""
echo "📖 GeoIP rule examples:"
echo "   geoip:cn     - Block China"
echo "   geoip:us     - Block USA"
echo "   geoip:vn     - Block Vietnam"
echo "   geosite:google - Block Google domains"
echo ""

