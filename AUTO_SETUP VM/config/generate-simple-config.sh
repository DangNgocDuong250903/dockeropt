#!/bin/bash

# Tạo config VMess đơn giản (không TLS)

UUID=$(cat /usr/local/etc/xray/uuid.txt)
PUBLIC_IP=$(curl -s ifconfig.me)

echo "================================================"
echo "   CONFIG VMESS ĐƠN GIẢN (KHÔNG TLS)"
echo "================================================"
echo ""

# Tạo thư mục output
mkdir -p ~/xray-simple

# VMess JSON
VMESS_JSON="{
  \"v\": \"2\",
  \"ps\": \"VPS-Simple\",
  \"add\": \"${PUBLIC_IP}\",
  \"port\": \"10086\",
  \"id\": \"${UUID}\",
  \"aid\": \"0\",
  \"scy\": \"auto\",
  \"net\": \"tcp\",
  \"type\": \"none\",
  \"host\": \"\",
  \"path\": \"\",
  \"tls\": \"\",
  \"sni\": \"\",
  \"alpn\": \"\"
}"

VMESS_BASE64=$(echo -n "$VMESS_JSON" | base64 -w 0)
VMESS_LINK="vmess://${VMESS_BASE64}"

echo "📱 QR CODE:"
echo ""
echo "$VMESS_LINK" | qrencode -t ANSIUTF8
echo ""
echo "$VMESS_LINK" | qrencode -o ~/xray-simple/qr-simple.png

echo "Link: $VMESS_LINK"
echo ""
echo "QR Code đã lưu: ~/xray-simple/qr-simple.png"
echo ""
echo "================================================"
echo "✅ HƯỚNG DẪN:"
echo "================================================"
echo ""
echo "1. Xóa config cũ trong v2rayNG"
echo "2. Quét QR code mới này"
echo "3. Nhấn Connect"
echo ""
echo "📋 Thông tin:"
echo "   IP: $PUBLIC_IP"
echo "   Port: 10086"
echo "   Protocol: VMess"
echo "   Network: TCP"
echo "   Security: None (không TLS)"
echo ""

