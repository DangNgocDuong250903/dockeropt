#!/bin/bash

# Script kiểm tra kết nối Xray

echo "================================================"
echo "   KIỂM TRA KẾT NỐI XRAY"
echo "================================================"
echo ""

PUBLIC_IP=$(curl -s ifconfig.me)
UUID_FILE="/usr/local/etc/xray/uuid.txt"

# 1. Kiểm tra service
echo "1️⃣  Kiểm tra Xray service..."
if systemctl is-active --quiet xray; then
    echo "   ✅ Service đang chạy"
else
    echo "   ❌ Service KHÔNG chạy"
    echo "   → Chạy: sudo systemctl start xray"
    exit 1
fi

# 2. Kiểm tra ports
echo ""
echo "2️⃣  Kiểm tra ports..."
PORT_443=$(ss -tuln | grep ':443 ' | wc -l)
PORT_10086=$(ss -tuln | grep ':10086 ' | wc -l)

if [ $PORT_443 -gt 0 ]; then
    echo "   ✅ Port 443 (VLESS) đang listen"
else
    echo "   ❌ Port 443 KHÔNG listen"
fi

if [ $PORT_10086 -gt 0 ]; then
    echo "   ✅ Port 10086 (VMess) đang listen"
else
    echo "   ❌ Port 10086 KHÔNG listen"
fi

# 3. Kiểm tra config
echo ""
echo "3️⃣  Kiểm tra config..."
if [ -f "/usr/local/etc/xray/config.json" ]; then
    echo "   ✅ Config file tồn tại"
    
    # Validate JSON
    if /usr/local/bin/xray test -c /usr/local/etc/xray/config.json > /dev/null 2>&1; then
        echo "   ✅ Config hợp lệ"
    else
        echo "   ❌ Config không hợp lệ"
        echo "   → Chạy: /usr/local/bin/xray test -c /usr/local/etc/xray/config.json"
    fi
else
    echo "   ❌ Config file không tồn tại"
fi

# 4. Kiểm tra UUID
echo ""
echo "4️⃣  Kiểm tra UUID..."
if [ -f "$UUID_FILE" ]; then
    UUID=$(cat $UUID_FILE)
    echo "   ✅ UUID: $UUID"
else
    echo "   ❌ UUID file không tồn tại"
fi

# 5. Kiểm tra certificate
echo ""
echo "5️⃣  Kiểm tra SSL certificate..."
if [ -f "/usr/local/etc/xray/cert.pem" ] && [ -f "/usr/local/etc/xray/key.pem" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /usr/local/etc/xray/cert.pem | cut -d= -f2)
    echo "   ✅ Certificate tồn tại"
    echo "   📅 Hết hạn: $CERT_EXPIRY"
else
    echo "   ❌ Certificate không tồn tại"
fi

# 6. Test kết nối từ bên ngoài
echo ""
echo "6️⃣  Test kết nối từ internet..."
echo "   IP Public: $PUBLIC_IP"

# Test port 443
if timeout 3 bash -c "echo > /dev/tcp/$PUBLIC_IP/443" 2>/dev/null; then
    echo "   ✅ Port 443 có thể kết nối từ internet"
else
    echo "   ⚠️  Port 443 KHÔNG thể kết nối"
    echo "   → Kiểm tra firewall Google Cloud"
fi

# Test port 10086
if timeout 3 bash -c "echo > /dev/tcp/$PUBLIC_IP/10086" 2>/dev/null; then
    echo "   ✅ Port 10086 có thể kết nối từ internet"
else
    echo "   ⚠️  Port 10086 KHÔNG thể kết nối"
    echo "   → Kiểm tra firewall Google Cloud"
fi

# 7. Kiểm tra logs
echo ""
echo "7️⃣  Recent logs (last 5 lines)..."
journalctl -u xray -n 5 --no-pager | tail -n 5

# 8. Active connections
echo ""
echo "8️⃣  Active connections..."
ACTIVE_CONN=$(ss -an | grep -E '443|10086' | grep ESTAB | wc -l)
echo "   📊 Số kết nối đang hoạt động: $ACTIVE_CONN"

# 9. Resource usage
echo ""
echo "9️⃣  Resource usage..."
XRAY_PID=$(pgrep xray)
if [ ! -z "$XRAY_PID" ]; then
    CPU=$(ps -p $XRAY_PID -o %cpu= | xargs)
    MEM=$(ps -p $XRAY_PID -o %mem= | xargs)
    echo "   💻 CPU: ${CPU}%"
    echo "   💾 Memory: ${MEM}%"
else
    echo "   ⚠️  Không tìm thấy Xray process"
fi

# Tổng kết
echo ""
echo "================================================"
echo "   TỔNG KẾT"
echo "================================================"

ALL_OK=true

if ! systemctl is-active --quiet xray; then
    ALL_OK=false
fi

if [ $PORT_443 -eq 0 ] || [ $PORT_10086 -eq 0 ]; then
    ALL_OK=false
fi

if $ALL_OK; then
    echo ""
    echo "✅ Hệ thống hoạt động bình thường!"
    echo ""
    echo "📱 Bây giờ bạn có thể:"
    echo "   1. Quét QR code bằng v2rayNG"
    echo "   2. Kết nối từ điện thoại"
    echo "   3. Test tốc độ: https://fast.com"
    echo ""
else
    echo ""
    echo "⚠️  Có vấn đề cần khắc phục!"
    echo ""
    echo "🔧 Các bước debug:"
    echo "   1. Xem logs: journalctl -u xray -f"
    echo "   2. Kiểm tra config: /usr/local/bin/xray test -c /usr/local/etc/xray/config.json"
    echo "   3. Restart service: sudo systemctl restart xray"
    echo "   4. Kiểm tra firewall Google Cloud"
    echo ""
fi

