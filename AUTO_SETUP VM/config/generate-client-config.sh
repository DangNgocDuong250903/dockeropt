#!/bin/bash

# Script tạo config client và QR code cho điện thoại

set -e

INSTALL_DIR="/usr/local/etc/xray"

# Kiểm tra UUID
if [ ! -f "$INSTALL_DIR/uuid.txt" ]; then
    echo "❌ Không tìm thấy UUID. Vui lòng chạy install-xray.sh trước"
    exit 1
fi

UUID=$(cat "$INSTALL_DIR/uuid.txt")
PUBLIC_IP=$(curl -s ifconfig.me)

echo "================================================"
echo "   TẠO CONFIG CLIENT CHO ĐIỆN THOẠI"
echo "================================================"
echo ""

# Tạo thư mục output
OUTPUT_DIR="./xray-configs"
mkdir -p "$OUTPUT_DIR"

# Config 1: VLESS + TLS + XTLS (Hiệu suất cao nhất)
echo "📱 Config 1: VLESS + TLS + XTLS (Khuyến nghị)"
VLESS_LINK="vless://${UUID}@${PUBLIC_IP}:443?encryption=none&flow=xtls-rprx-vision&security=tls&sni=${PUBLIC_IP}&type=tcp&headerType=none#VPS-VLESS-XTLS"
echo "$VLESS_LINK" > "$OUTPUT_DIR/vless-config.txt"
echo "$VLESS_LINK" | qrencode -t ANSIUTF8
echo "$VLESS_LINK" | qrencode -o "$OUTPUT_DIR/vless-qr.png"
echo ""
echo "Link: $VLESS_LINK"
echo "QR Code đã lưu: $OUTPUT_DIR/vless-qr.png"
echo ""
echo "---"
echo ""

# Config 2: VMess + WebSocket (Tương thích rộng)
echo "📱 Config 2: VMess + WebSocket (Dự phòng)"
VMESS_JSON="{
  \"v\": \"2\",
  \"ps\": \"VPS-VMess-WS\",
  \"add\": \"${PUBLIC_IP}\",
  \"port\": \"10086\",
  \"id\": \"${UUID}\",
  \"aid\": \"0\",
  \"scy\": \"auto\",
  \"net\": \"ws\",
  \"type\": \"none\",
  \"host\": \"\",
  \"path\": \"/vmess\",
  \"tls\": \"\",
  \"sni\": \"\",
  \"alpn\": \"\"
}"

VMESS_BASE64=$(echo -n "$VMESS_JSON" | base64 -w 0)
VMESS_LINK="vmess://${VMESS_BASE64}"
echo "$VMESS_LINK" > "$OUTPUT_DIR/vmess-config.txt"
echo "$VMESS_LINK" | qrencode -t ANSIUTF8
echo "$VMESS_LINK" | qrencode -o "$OUTPUT_DIR/vmess-qr.png"
echo ""
echo "Link: $VMESS_LINK"
echo "QR Code đã lưu: $OUTPUT_DIR/vmess-qr.png"
echo ""

# Tạo file JSON config cho v2rayNG
cat > "$OUTPUT_DIR/v2rayNG-config.json" <<EOF
{
  "remarks": "VPS-VLESS-XTLS",
  "id": "${UUID}",
  "address": "${PUBLIC_IP}",
  "port": 443,
  "protocol": "vless",
  "security": "tls",
  "network": "tcp",
  "flow": "xtls-rprx-vision",
  "sni": "${PUBLIC_IP}"
}
EOF

cat > "$OUTPUT_DIR/v2rayNG-vmess.json" <<EOF
{
  "remarks": "VPS-VMess-WS",
  "id": "${UUID}",
  "address": "${PUBLIC_IP}",
  "port": 10086,
  "protocol": "vmess",
  "security": "none",
  "network": "ws",
  "path": "/vmess",
  "alterId": 0
}
EOF

echo "================================================"
echo "✅ Đã tạo config thành công!"
echo "================================================"
echo ""
echo "📁 Các file config đã lưu trong thư mục: $OUTPUT_DIR/"
echo ""
echo "📱 HƯỚNG DẪN SỬ DỤNG:"
echo ""
echo "CÁCH 1: QUÉT QR CODE (Nhanh nhất)"
echo "   1. Mở app v2rayNG trên Android"
echo "   2. Nhấn dấu + → Import config from QR code"
echo "   3. Quét QR code bên trên hoặc file: $OUTPUT_DIR/vless-qr.png"
echo ""
echo "CÁCH 2: NHẬP LINK THỦ CÔNG"
echo "   1. Copy link VLESS hoặc VMess ở trên"
echo "   2. Mở app v2rayNG"
echo "   3. Nhấn dấu + → Import config from clipboard"
echo ""
echo "CÁCH 3: IMPORT FILE JSON"
echo "   1. Copy file $OUTPUT_DIR/v2rayNG-config.json vào điện thoại"
echo "   2. Mở app v2rayNG"
echo "   3. Nhấn dấu + → Import config from file"
echo ""
echo "⚙️  CÀI ĐẶT KHUYẾN NGHỊ:"
echo "   - Routing: Bypass mainland (bỏ qua VN)"
echo "   - Domain Strategy: IPIfNonMatch"
echo "   - Enable Mux: Tắt (để tốc độ tốt hơn)"
echo ""
echo "🔥 Để tải QR code về máy tính, chạy lệnh:"
echo "   scp -i ~/.ssh/id_rsa duongng_dn@${PUBLIC_IP}:${OUTPUT_DIR}/*.png ."
echo ""

