#!/bin/bash

# Route Optimizer - Tìm config Xray tốt nhất
# Test tất cả các protocol/port combinations

set -e

echo "================================================"
echo "   XRAY ROUTE OPTIMIZER"
echo "================================================"
echo ""
echo "🎯 Script này sẽ test và tìm config tốt nhất cho mạng của bạn"
echo ""

# Kiểm tra quyền root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Script cần chạy với quyền root"
   exit 1
fi

# Lấy thông tin VPS
VPS_IP=$(curl -s ifconfig.me)
UUID_FILE="/usr/local/etc/xray/uuid.txt"

if [ ! -f "$UUID_FILE" ]; then
    echo "❌ UUID file không tồn tại. Vui lòng chạy install-xray.sh trước"
    exit 1
fi

UUID=$(cat $UUID_FILE)

echo "📋 Thông tin:"
echo "   VPS IP: $VPS_IP"
echo "   UUID: $UUID"
echo ""

# Tạo thư mục test configs
TEST_DIR="/tmp/xray-test-configs"
mkdir -p $TEST_DIR

echo "🧪 Đang tạo test configs..."
echo ""

# Config 1: VLESS + XTLS (Port 443)
cat > $TEST_DIR/vless-443.json <<EOF
{
  "log": {"loglevel": "warning"},
  "inbounds": [{
    "port": 443,
    "protocol": "vless",
    "settings": {
      "clients": [{"id": "$UUID", "flow": "xtls-rprx-vision"}],
      "decryption": "none"
    },
    "streamSettings": {
      "network": "tcp",
      "security": "tls",
      "tlsSettings": {
        "certificates": [{
          "certificateFile": "/usr/local/etc/xray/cert.pem",
          "keyFile": "/usr/local/etc/xray/key.pem"
        }]
      }
    }
  }],
  "outbounds": [{"protocol": "freedom"}]
}
EOF

# Config 2: VMess + WebSocket (Port 10086)
cat > $TEST_DIR/vmess-10086.json <<EOF
{
  "log": {"loglevel": "warning"},
  "inbounds": [{
    "port": 10086,
    "protocol": "vmess",
    "settings": {
      "clients": [{"id": "$UUID", "alterId": 0}]
    },
    "streamSettings": {
      "network": "ws",
      "wsSettings": {"path": "/xray"}
    }
  }],
  "outbounds": [{"protocol": "freedom"}]
}
EOF

# Config 3: VLESS + TCP (Port 8443)
cat > $TEST_DIR/vless-8443.json <<EOF
{
  "log": {"loglevel": "warning"},
  "inbounds": [{
    "port": 8443,
    "protocol": "vless",
    "settings": {
      "clients": [{"id": "$UUID", "flow": "xtls-rprx-vision"}],
      "decryption": "none"
    },
    "streamSettings": {
      "network": "tcp",
      "security": "tls",
      "tlsSettings": {
        "certificates": [{
          "certificateFile": "/usr/local/etc/xray/cert.pem",
          "keyFile": "/usr/local/etc/xray/key.pem"
        }]
      }
    }
  }],
  "outbounds": [{"protocol": "freedom"}]
}
EOF

echo "✅ Đã tạo 3 test configs"
echo ""
echo "================================================"
echo "   BẮT ĐẦU TESTING"
echo "================================================"
echo ""
echo "⚠️  Lưu ý: Script sẽ tạm dừng Xray và test từng config"
echo "         Bạn sẽ mất kết nối trong quá trình test (~30 giây/config)"
echo ""

read -p "Tiếp tục? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Đã hủy"
    rm -rf $TEST_DIR
    exit 0
fi

echo ""

# Backup config hiện tại
CURRENT_CONFIG="/usr/local/etc/xray/config.json"
cp $CURRENT_CONFIG $CURRENT_CONFIG.bak

# Tạo file lưu kết quả
RESULTS_FILE=$(mktemp)

# Test function
test_config() {
    local name=$1
    local config=$2
    local port=$3
    
    echo "🧪 Testing: $name"
    echo "   Port: $port"
    
    # Copy config và restart Xray
    cp $config $CURRENT_CONFIG
    systemctl restart xray
    sleep 5
    
    # Kiểm tra port có listen không
    if ! ss -tuln | grep -q ":$port"; then
        echo "   ❌ Port $port không listen"
        echo "999999 $name" >> $RESULTS_FILE
        return
    fi
    
    # Test latency (5 lần)
    echo -n "   Testing latency ... "
    total_time=0
    success=0
    
    for i in {1..5}; do
        # Sử dụng curl để test (đơn giản hơn)
        if [ "$port" == "443" ] || [ "$port" == "8443" ]; then
            time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 https://$VPS_IP:$port 2>/dev/null || echo "999")
        else
            time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 http://$VPS_IP:$port 2>/dev/null || echo "999")
        fi
        
        if [ "$time" != "999" ]; then
            # Convert to milliseconds
            time_ms=$(echo "$time * 1000" | bc)
            total_time=$(echo "$total_time + $time_ms" | bc)
            ((success++))
        fi
        
        sleep 1
    done
    
    if [ $success -gt 0 ]; then
        avg_time=$(echo "scale=2; $total_time / $success" | bc)
        echo "${avg_time}ms ✅"
        echo "$avg_time $name" >> $RESULTS_FILE
    else
        echo "Failed ❌"
        echo "999999 $name" >> $RESULTS_FILE
    fi
    
    echo ""
}

# Test các configs
test_config "VLESS+XTLS (Port 443)" "$TEST_DIR/vless-443.json" "443"
test_config "VMess+WS (Port 10086)" "$TEST_DIR/vmess-10086.json" "10086"
test_config "VLESS+TCP (Port 8443)" "$TEST_DIR/vless-8443.json" "8443"

# Restore config gốc
cp $CURRENT_CONFIG.bak $CURRENT_CONFIG
systemctl restart xray

echo "================================================"
echo "   KẾT QUẢ"
echo "================================================"
echo ""

# Hiển thị kết quả
echo "📊 Kết quả test (theo thứ tự tốc độ):"
echo ""

sort -n $RESULTS_FILE | while read time name; do
    if [ "$time" != "999999" ]; then
        echo "   $name - ${time}ms"
    else
        echo "   $name - Failed ❌"
    fi
done

echo ""

# Lấy config tốt nhất
BEST_CONFIG=$(sort -n $RESULTS_FILE | head -1 | cut -d' ' -f2-)
BEST_TIME=$(sort -n $RESULTS_FILE | head -1 | cut -d' ' -f1)

if [ "$BEST_TIME" == "999999" ]; then
    echo "❌ Tất cả configs đều failed. Kiểm tra lại firewall và SSL certificate"
    echo "   Đã khôi phục config gốc"
    rm -rf $TEST_DIR
    rm -f $RESULTS_FILE
    exit 1
fi

echo "🏆 Config tốt nhất: $BEST_CONFIG (${BEST_TIME}ms)"
echo ""

# Đề xuất config
read -p "Bạn có muốn áp dụng config này? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚙️  Đang áp dụng config..."
    
    # Xác định config file cần copy
    if [[ "$BEST_CONFIG" == *"443"* ]]; then
        cp $TEST_DIR/vless-443.json $CURRENT_CONFIG
        PORT=443
        PROTOCOL="VLESS+XTLS"
    elif [[ "$BEST_CONFIG" == *"10086"* ]]; then
        cp $TEST_DIR/vmess-10086.json $CURRENT_CONFIG
        PORT=10086
        PROTOCOL="VMess+WebSocket"
    else
        cp $TEST_DIR/vless-8443.json $CURRENT_CONFIG
        PORT=8443
        PROTOCOL="VLESS+TCP"
    fi
    
    systemctl restart xray
    sleep 2
    
    echo "   ✅ Đã áp dụng config tốt nhất"
    echo ""
    echo "📱 Bây giờ generate config cho điện thoại:"
    echo "   sudo bash generate-client-config.sh"
    echo ""
    echo "📋 Thông tin config:"
    echo "   Protocol: $PROTOCOL"
    echo "   Port: $PORT"
    echo "   IP: $VPS_IP"
    echo ""
else
    echo ""
    echo "❌ Không thay đổi config"
    echo "   Đã khôi phục config gốc"
fi

# Cleanup
rm -rf $TEST_DIR
rm -f $RESULTS_FILE

echo ""
echo "================================================"
echo ""
echo "💡 Khuyến nghị thêm:"
echo ""
echo "   1. Chạy optimize-vps.sh để bật BBR"
echo "   2. Chạy optimize-dns.sh để tối ưu DNS"
echo "   3. Trong v2rayNG settings:"
echo "      - Routing Mode: Bypass mainland"
echo "      - Enable Mux: OFF (cho tốc độ tốt nhất)"
echo ""

