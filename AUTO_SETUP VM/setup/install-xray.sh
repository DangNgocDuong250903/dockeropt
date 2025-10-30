#!/bin/bash

# Script cài đặt Xray-core tự động trên VPS
# Hỗ trợ tăng tốc độ mạng 4G/5G cho điện thoại

set -e

echo "================================================"
echo "   Cài đặt Xray-core cho VPS"
echo "   Tăng tốc 4G/5G cho điện thoại"
echo "================================================"
echo ""

# Kiểm tra quyền root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Script cần chạy với quyền root (sudo)"
   exit 1
fi

# Cập nhật hệ thống
echo "📦 Đang cập nhật hệ thống..."
apt update && apt upgrade -y

# Cài đặt các package cần thiết
echo "📦 Cài đặt các package cần thiết..."
apt install -y curl wget unzip qrencode jq uuid-runtime

# Tạo thư mục cài đặt
INSTALL_DIR="/usr/local/etc/xray"
mkdir -p "$INSTALL_DIR"
mkdir -p /var/log/xray

# Tải Xray-core mới nhất
echo "⬇️  Đang tải Xray-core..."
XRAY_VERSION=$(curl -s https://api.github.com/repos/XTLS/Xray-core/releases/latest | grep tag_name | cut -d '"' -f 4)
echo "   Version: $XRAY_VERSION"

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64) XRAY_ARCH="linux-64" ;;
    aarch64) XRAY_ARCH="linux-arm64-v8a" ;;
    armv7l) XRAY_ARCH="linux-arm32-v7a" ;;
    *) echo "❌ Không hỗ trợ kiến trúc: $ARCH"; exit 1 ;;
esac

DOWNLOAD_URL="https://github.com/XTLS/Xray-core/releases/download/$XRAY_VERSION/Xray-$XRAY_ARCH.zip"
wget -O /tmp/xray.zip "$DOWNLOAD_URL"

# Giải nén và cài đặt
echo "📦 Đang cài đặt Xray..."
unzip -o /tmp/xray.zip -d /tmp/xray
cp /tmp/xray/xray /usr/local/bin/
chmod +x /usr/local/bin/xray
rm -rf /tmp/xray /tmp/xray.zip

# Tạo UUID cho người dùng
USER_UUID=$(uuidgen)
echo "$USER_UUID" > "$INSTALL_DIR/uuid.txt"

# Tạo file config
echo "⚙️  Tạo cấu hình server..."
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
            "level": 0,
            "email": "user@vps"
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
            "alterId": 0,
            "email": "user@vps"
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
      "settings": {},
      "tag": "direct"
    },
    {
      "protocol": "blackhole",
      "settings": {},
      "tag": "blocked"
    }
  ],
  "routing": {
    "domainStrategy": "AsIs",
    "rules": [
      {
        "type": "field",
        "ip": ["geoip:private"],
        "outboundTag": "blocked"
      }
    ]
  }
}
EOF

# Tạo self-signed certificate (nếu chưa có domain)
echo "🔐 Tạo SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$INSTALL_DIR/key.pem" \
    -out "$INSTALL_DIR/cert.pem" \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=$(curl -s ifconfig.me)"

# Tạo systemd service
echo "🔧 Tạo systemd service..."
cat > /etc/systemd/system/xray.service <<EOF
[Unit]
Description=Xray Service
Documentation=https://github.com/xtls
After=network.target nss-lookup.target

[Service]
Type=simple
User=root
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
NoNewPrivileges=true
ExecStart=/usr/local/bin/xray run -config /usr/local/etc/xray/config.json
Restart=on-failure
RestartSec=10
LimitNOFILE=infinity

[Install]
WantedBy=multi-user.target
EOF

# Enable và start service
systemctl daemon-reload
systemctl enable xray
systemctl start xray

# Lấy IP public
PUBLIC_IP=$(curl -s ifconfig.me)

echo ""
echo "================================================"
echo "✅ Cài đặt hoàn tất!"
echo "================================================"
echo ""
echo "📋 Thông tin kết nối:"
echo "   IP Server: $PUBLIC_IP"
echo "   UUID: $USER_UUID"
echo ""
echo "   Port VLESS+TLS: 443"
echo "   Port VMess+WS: 10086"
echo ""
echo "💾 UUID đã lưu tại: $INSTALL_DIR/uuid.txt"
echo ""
echo "🔥 Firewall: Nhớ mở port 443 và 10086 trên Google Cloud Console"
echo "   gcloud compute firewall-rules create allow-xray --allow tcp:443,tcp:10086"
echo ""
echo "📱 Chạy lệnh sau để tạo config và QR code cho điện thoại:"
echo "   sudo bash generate-client-config.sh"
echo ""
echo "🔍 Kiểm tra trạng thái:"
echo "   systemctl status xray"
echo "   journalctl -u xray -f"
echo ""

