#!/bin/bash

# Quick Start Script - Cài đặt nhanh tất cả trong một

set -e

echo "================================================"
echo "   XRAY VPS QUICK START"
echo "   Tăng tốc 4G/5G cho Android"
echo "================================================"
echo ""

# Kiểm tra quyền root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Vui lòng chạy với quyền root: sudo bash quick-start.sh"
   exit 1
fi

# Bước 1: Cài đặt Xray
echo "🚀 BƯỚC 1: Cài đặt Xray-core"
echo "================================================"
if [ -f "install-xray.sh" ]; then
    bash install-xray.sh
else
    echo "❌ Không tìm thấy install-xray.sh"
    exit 1
fi

echo ""
echo "✅ Xray đã được cài đặt"
echo ""
sleep 2

# Bước 2: Kiểm tra service
echo "🔍 BƯỚC 2: Kiểm tra service"
echo "================================================"
systemctl status xray --no-pager
echo ""
sleep 2

# Bước 3: Tạo config client
echo "📱 BƯỚC 3: Tạo config cho điện thoại"
echo "================================================"
if [ -f "generate-client-config.sh" ]; then
    bash generate-client-config.sh
else
    echo "❌ Không tìm thấy generate-client-config.sh"
    exit 1
fi

echo ""
echo "================================================"
echo "   🎉 HOÀN TẤT CÀI ĐẶT!"
echo "================================================"
echo ""
echo "📋 Các bước tiếp theo:"
echo ""
echo "1. Mở firewall trên Google Cloud Console:"
echo "   - Port 443 (VLESS)"
echo "   - Port 10086 (VMess)"
echo ""
echo "2. Hoặc chạy lệnh sau trên máy local:"
echo "   gcloud compute firewall-rules create allow-xray --allow tcp:443,tcp:10086"
echo ""
echo "3. Tải QR code về máy local:"
echo "   scp -i ~/.ssh/id_rsa $(whoami)@$(curl -s ifconfig.me):~/xray-configs/*.png ."
echo ""
echo "4. Quét QR code bằng app v2rayNG trên Android"
echo ""

