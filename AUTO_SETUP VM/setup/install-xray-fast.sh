#!/bin/bash

# Script cài đặt Xray-core NHANH - Bỏ qua apt upgrade

set -e

echo "================================================"
echo "   Cài đặt Xray-core NHANH"
echo "================================================"
echo ""

# Kiểm tra quyền root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Script cần chạy với quyền root (sudo)"
   exit 1
fi

# Cài đặt các package cần thiết (không update)
echo "📦 Cài đặt packages..."
apt install -y curl wget unzip qrencode jq uuid-runtime 2>&1 | tail -5

# Tạo thư mục
INSTALL_DIR="/usr/local/etc/xray"
mkdir -p "$INSTALL_DIR"
mkdir -p /var/log/xray

# Tải Xray-core
echo "⬇️  Đang tải Xray-core..."
XRAY_VERSION=$(curl -s https://api.github.com/repos/XTLS/Xray-core/releases/latest | grep tag_name | cut -d '"' -f 4)
echo "   Version: $XRAY_VERSION"

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64) XRAY_ARCH="linux-64" ;;
    aarch64) XRAY_ARCH="linux-arm64-v8a" ;;
    *) XRAY_ARCH="linux-64" ;;
esac

DOWNLOAD_URL="https://github.com/XTLS/Xray-core/releases/download/$XRAY_VERSION/Xray-$XRAY_ARCH.zip"
wget -q -O /tmp/xray.zip "$DOWNLOAD_URL"

# Giải nén
echo "📦 Cài đặt..."
unzip -oq /tmp/xray.zip -d /tmp/xray
cp /tmp/xray/xray /usr/local/bin/
chmod +x /usr/local/bin/xray
rm -rf /tmp/xray /tmp/xray.zip

# Tạo UUID
USER_UUID=$(uuidgen)
echo "$USER_UUID" > "$INSTALL_DIR/uuid.txt"

# Tạo config
echo "⚙️  Tạo config..."
cat > "$INSTALL_DIR/config.json" <<EOF
{
  "log": {
    "loglevel": "warning",
    "access": "/var/log/xray/access.log",
    "error": "/var/log/xray/error.log"
  },
  "inbounds": [
    {
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "$USER_UUID",
            "flow": "xtls-rprx-vision",
            "level": 0
          }
        ],
        "decryption": "none",
        "fallbacks": [
          {
            "dest": 80
          }
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "tls",
        "tlsSettings": {
          "alpn": ["http/1.1"],
          "certificates": [
            {
              "certificateFile": "/usr/local/etc/xray/cert.pem",
              "keyFile": "/usr/local/etc/xray/key.pem"
            }
          ]
        }
      }
    },
    {
      "port": 10086,
      "protocol": "vmess",
      "settings": {
        "clients": [
          {
            "id": "$USER_UUID",
            "level": 0,
            "alterId": 0
          }
        ]
      },
      "streamSettings": {
        "network": "ws",
        "wsSettings": {
          "path": "/vmess"
        }
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

# Tạo certificate
echo "🔐 Tạo SSL..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$INSTALL_DIR/key.pem" \
    -out "$INSTALL_DIR/cert.pem" \
    -subj "/CN=$(curl -s ifconfig.me)" 2>&1 | grep -v "^+"

# Tạo service
cat > /etc/systemd/system/xray.service <<EOF
[Unit]
Description=Xray Service
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/xray run -config /usr/local/etc/xray/config.json
Restart=on-failure
LimitNOFILE=infinity

[Install]
WantedBy=multi-user.target
EOF

# Start service
systemctl daemon-reload
systemctl enable xray
systemctl start xray

PUBLIC_IP=$(curl -s ifconfig.me)

echo ""
echo "================================================"
echo "✅ CÀI ĐẶT HOÀN TẤT!"
echo "================================================"
echo ""
echo "📋 Thông tin:"
echo "   IP: $PUBLIC_IP"
echo "   UUID: $USER_UUID"
echo "   Port VLESS: 443"
echo "   Port VMess: 10086"
echo ""
echo "🔥 MỞ FIREWALL:"
echo "   gcloud compute firewall-rules create allow-xray --allow tcp:443,tcp:10086"
echo ""
echo "📱 TẠO QR CODE:"
echo "   sudo bash generate-client-config.sh"
echo ""

