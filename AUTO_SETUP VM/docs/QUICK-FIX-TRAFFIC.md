# ⚡ FIX TRAFFIC TRACKING - NHANH

## Chạy 3 Lệnh Này Trên VPS:

```bash
# 1. SSH vào VPS
ssh -i ~/.ssh/id_rsa ngocduong@34.150.92.64

# 2. Make scripts executable
chmod +x *.sh

# 3. Chạy fix-all script (1 lệnh làm tất cả)
sudo bash fix-traffic-tracking.sh
```

## Script Sẽ Làm Gì?

✅ Enable Xray Stats API  
✅ Update Python files  
✅ Update templates  
✅ Restart all services  
✅ Check status  

## Sau Đó

1. **Dùng proxy** từ điện thoại để tạo traffic (mở YouTube, lướt web)
2. **Đợi 5 phút** cho Traffic Monitor cập nhật
3. **Reload dashboard**: http://34.150.92.64:8080/users
4. **Xem traffic** đã update!

## Nếu Vẫn Không Hoạt Động

```bash
# Debug chi tiết
sudo bash debug-traffic.sh

# Xem logs real-time
sudo journalctl -u traffic-monitor -f

# Test Xray API
/usr/local/bin/xray api statsquery --server=127.0.0.1:10085
```

## Kiểm Tra Nhanh

```bash
# Xem traffic trong database
sudo sqlite3 /opt/xray-monitor/users.db "SELECT username, total_upload/1024/1024 as UP_MB, total_download/1024/1024 as DOWN_MB FROM users;"
```

## Lỗi Thường Gặp

### "No traffic data available"
➡️ Chưa ai dùng proxy. Dùng proxy trước, đợi 5 phút.

### "Xray API error"
➡️ Chạy lại: `sudo bash enable-xray-stats.sh`

### "traffic-monitor not running"
➡️ Chạy: `sudo systemctl restart traffic-monitor`

---

**Dashboard:** http://34.150.92.64:8080  
**Login:** Ngocduong2509 / Ngocduong2509

