#!/bin/bash

# Script gỡ cài đặt Xray

set -e

echo "================================================"
echo "   GỠ CÀI ĐẶT XRAY"
echo "================================================"
echo ""

# Kiểm tra quyền root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Script cần chạy với quyền root"
   exit 1
fi

# Xác nhận
read -p "⚠️  Bạn có chắc muốn gỡ cài đặt Xray? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Đã hủy"
    exit 0
fi

echo ""
echo "🗑️  Đang gỡ cài đặt..."

# Stop service
echo "   → Stopping service..."
systemctl stop xray 2>/dev/null || true
systemctl disable xray 2>/dev/null || true

# Remove service file
echo "   → Removing service file..."
rm -f /etc/systemd/system/xray.service
systemctl daemon-reload

# Remove binary
echo "   → Removing binary..."
rm -f /usr/local/bin/xray

# Backup config trước khi xóa
BACKUP_DIR="/root/xray-backup-$(date +%Y%m%d-%H%M%S)"
if [ -d "/usr/local/etc/xray" ]; then
    echo "   → Backing up config to $BACKUP_DIR..."
    cp -r /usr/local/etc/xray "$BACKUP_DIR"
fi

# Remove config
echo "   → Removing config..."
rm -rf /usr/local/etc/xray

# Remove logs
echo "   → Removing logs..."
rm -rf /var/log/xray

# Remove logrotate config
rm -f /etc/logrotate.d/xray

# Remove monitor script
rm -f /usr/local/bin/xray-monitor

# Remove generated configs
rm -rf ~/xray-configs

echo ""
echo "================================================"
echo "✅ Đã gỡ cài đặt Xray"
echo "================================================"
echo ""
echo "📁 Backup config tại: $BACKUP_DIR"
echo ""
echo "🔄 Để cài đặt lại:"
echo "   sudo bash install-xray.sh"
echo ""

