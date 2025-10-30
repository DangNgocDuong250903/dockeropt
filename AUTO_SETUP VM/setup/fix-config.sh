#!/bin/bash

# Script sửa config Xray - Bỏ TLS cho đơn giản

set -e

INSTALL_DIR="/usr/local/etc/xray"
UUID=$(cat "$INSTALL_DIR/uuid.txt")

echo "🔧 Đang sửa config..."

# Tạo config mới không dùng TLS
cat > "$INSTALL_DIR/config.json" <<EOF
{
  "log": {
    "loglevel": "warning",
    "access": "/var/log/xray/access.log",
    "error": "/var/log/xray/error.log"
  },
  "inbounds": [
    {
      "port": 10086,
      "protocol": "vmess",
      "settings": {
        "clients": [
          {
            "id": "$UUID",
            "alterId": 0
          }
        ]
      },
      "streamSettings": {
        "network": "tcp"
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "settings": {}
    }
  ]
}
EOF

# Restart service
systemctl restart xray

echo "✅ Đã sửa config thành công!"
echo ""
echo "📋 Config mới:"
echo "   Protocol: VMess"
echo "   Port: 10086"
echo "   Network: TCP (không TLS)"
echo "   UUID: $UUID"

