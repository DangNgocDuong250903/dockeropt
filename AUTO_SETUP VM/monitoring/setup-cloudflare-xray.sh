#!/bin/bash

echo "================================================"
echo "   SETUP CLOUDFLARE FRONTING FOR XRAY"
echo "================================================"
echo ""

if [[ $EUID -ne 0 ]]; then
   echo "❌ Please run with sudo"
   exit 1
fi

# Config
DOMAIN="proxy.duongtech.me"
EMAIL="Dangngocduong@dtu.edu.vn"
VPS_IP="34.150.92.64"
XRAY_PORT=443

echo "📝 Domain: $DOMAIN"
echo "📝 VPS IP: $VPS_IP"
echo ""

# Stop Xray temporarily
echo "⏸️  Stopping Xray temporarily..."
systemctl stop xray 2>/dev/null || true

# Get SSL certificate from Let's Encrypt
echo "🔐 Getting SSL certificate..."
certbot certonly --standalone \
    --preferred-challenges http \
    --agree-tos \
    --email $EMAIL \
    --non-interactive \
    -d $DOMAIN

if [ $? -ne 0 ]; then
    echo "❌ Failed to get SSL certificate"
    echo "Possible reasons:"
    echo "1. DNS not propagated yet (wait 5-10 minutes)"
    echo "2. Port 80 blocked by firewall"
    echo "3. Domain not pointing to this VPS"
    exit 1
fi

echo "✅ SSL certificate obtained!"

# Copy certs to Xray directory
mkdir -p /usr/local/etc/xray
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /usr/local/etc/xray/cert.pem
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /usr/local/etc/xray/key.pem
chmod 644 /usr/local/etc/xray/cert.pem
chmod 644 /usr/local/etc/xray/key.pem

# Backup current config
cp /usr/local/etc/xray/config.json /usr/local/etc/xray/config.json.bak.$(date +%Y%m%d_%H%M%S)

# Generate new Xray config with WebSocket + TLS + CloudFlare
echo "⚙️  Generating Xray config..."

# Get existing UUID from current config
UUID=$(cat /usr/local/etc/xray/config.json | grep -oP '"id"\s*:\s*"\K[^"]+' | head -1)

if [ -z "$UUID" ]; then
    # Generate new UUID if not found
    UUID=$(cat /proc/sys/kernel/random/uuid)
fi

cat > /usr/local/etc/xray/config.json <<EOF
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
        "clients": [
          {
            "id": "$UUID",
            "email": "admin"
          }
        ]
      },
      "streamSettings": {
        "network": "ws",
        "security": "tls",
        "tlsSettings": {
          "serverName": "$DOMAIN",
          "certificates": [
            {
              "certificateFile": "/usr/local/etc/xray/cert.pem",
              "keyFile": "/usr/local/etc/xray/key.pem"
            }
          ]
        },
        "wsSettings": {
          "path": "/xray",
          "headers": {}
        }
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

echo "✅ Xray config updated!"

# Create log directory
mkdir -p /var/log/xray
touch /var/log/xray/access.log
touch /var/log/xray/error.log

# Restart Xray
echo "🔄 Restarting Xray..."
systemctl restart xray

sleep 2

# Check status
if systemctl is-active --quiet xray; then
    echo ""
    echo "================================================"
    echo "✅ CLOUDFLARE FRONTING SETUP COMPLETED!"
    echo "================================================"
    echo ""
    echo "📱 V2RAYNG CONFIG:"
    echo ""
    echo "   Address: $DOMAIN"
    echo "   Port: 443"
    echo "   UUID: $UUID"
    echo "   AlterID: 0"
    echo "   Security: auto"
    echo "   Network: ws"
    echo "   Path: /xray"
    echo "   TLS: ON"
    echo "   SNI: $DOMAIN"
    echo ""
    echo "🔗 VMess Link:"
    
    # Generate VMess link
    CONFIG_JSON="{\"v\":\"2\",\"ps\":\"CloudFlare-Xray\",\"add\":\"$DOMAIN\",\"port\":\"443\",\"id\":\"$UUID\",\"aid\":\"0\",\"scy\":\"auto\",\"net\":\"ws\",\"type\":\"none\",\"host\":\"\",\"path\":\"/xray\",\"tls\":\"tls\",\"sni\":\"$DOMAIN\",\"alpn\":\"\"}"
    VMESS_LINK="vmess://$(echo -n "$CONFIG_JSON" | base64 -w 0)"
    echo "   $VMESS_LINK"
    echo ""
    echo "🎯 Traffic Flow:"
    echo "   Phone → CloudFlare → VPS ($VPS_IP)"
    echo "   (Carrier chỉ thấy CloudFlare, không thấy VPS IP)"
    echo ""
    echo "📊 Monitor: http://$VPS_IP:8080"
    echo ""
else
    echo "❌ Xray failed to start"
    echo "Check logs: sudo journalctl -u xray -n 50"
    exit 1
fi

