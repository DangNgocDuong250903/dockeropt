#!/bin/bash

echo "================================================"
echo "   ENABLE XRAY STATS API"
echo "   Để tracking traffic per user"
echo "================================================"
echo ""

XRAY_CONFIG="/usr/local/etc/xray/config.json"

# Backup config
cp ${XRAY_CONFIG} ${XRAY_CONFIG}.bak.$(date +%Y%m%d_%H%M%S)

# Read current config
CONFIG=$(cat ${XRAY_CONFIG})

# Check if stats and api already exist
if echo "${CONFIG}" | grep -q '"api"' && echo "${CONFIG}" | grep -q '"stats"'; then
    echo "✅ Xray Stats API already configured!"
    exit 0
fi

echo "📝 Adding Stats API to Xray config..."

# Use Python to modify JSON properly
python3 << 'PYTHON_SCRIPT'
import json
import sys

CONFIG_FILE = "/usr/local/etc/xray/config.json"

try:
    with open(CONFIG_FILE, 'r') as f:
        config = json.load(f)
    
    # Add API inbound (for stats queries)
    api_inbound = {
        "tag": "api",
        "port": 10085,
        "listen": "127.0.0.1",
        "protocol": "dokodemo-door",
        "settings": {
            "address": "127.0.0.1"
        }
    }
    
    # Add if not exists
    if 'inbounds' not in config:
        config['inbounds'] = []
    
    # Check if api inbound already exists
    has_api = any(i.get('tag') == 'api' for i in config['inbounds'])
    if not has_api:
        config['inbounds'].append(api_inbound)
    
    # Add API section
    if 'api' not in config:
        config['api'] = {
            "tag": "api",
            "services": [
                "StatsService"
            ]
        }
    
    # Add Stats section
    if 'stats' not in config:
        config['stats'] = {}
    
    # Add Policy section for stats
    if 'policy' not in config:
        config['policy'] = {}
    
    if 'system' not in config['policy']:
        config['policy']['system'] = {
            "statsInboundUplink": True,
            "statsInboundDownlink": True,
            "statsOutboundUplink": True,
            "statsOutboundDownlink": True
        }
    
    # Enable stats for all users
    if 'levels' not in config['policy']:
        config['policy']['levels'] = {}
    
    if '0' not in config['policy']['levels']:
        config['policy']['levels']['0'] = {
            "statsUserUplink": True,
            "statsUserDownlink": True
        }
    
    # Add routing rule for API
    if 'routing' not in config:
        config['routing'] = {"rules": []}
    
    if 'rules' not in config['routing']:
        config['routing']['rules'] = []
    
    # Check if API rule exists
    has_api_rule = any(r.get('inboundTag') == ['api'] for r in config['routing']['rules'])
    if not has_api_rule:
        api_rule = {
            "inboundTag": ["api"],
            "outboundTag": "api",
            "type": "field"
        }
        config['routing']['rules'].insert(0, api_rule)
    
    # Write updated config
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)
    
    print("✅ Xray config updated successfully!")
    sys.exit(0)

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    echo ""
    echo "🔄 Restarting Xray..."
    systemctl restart xray
    sleep 2
    
    echo ""
    echo "✅ Xray Stats API enabled!"
    echo ""
    echo "📊 Test stats API:"
    echo "   /usr/local/bin/xray api statsquery --server=127.0.0.1:10085"
    echo ""
else
    echo "❌ Failed to update config"
    echo "Config backup: ${XRAY_CONFIG}.bak.$(date +%Y%m%d_%H%M%S)"
    exit 1
fi

