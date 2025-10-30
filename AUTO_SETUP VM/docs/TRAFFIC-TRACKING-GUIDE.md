# 📊 Hướng Dẫn Traffic Tracking

## Tổng Quan

Traffic tracking cho phép bạn theo dõi lưu lượng sử dụng của từng user và enforce traffic limits.

## Cách Hoạt Động

1. **Xray Stats API**: Xray ghi lại traffic per user qua Stats API
2. **Traffic Monitor**: Service Python query Xray API mỗi 5 phút
3. **Database**: Lưu trữ traffic data vào SQLite
4. **Dashboard**: Hiển thị traffic real-time

## Cài Đặt & Sửa Lỗi

### Bước 1: Upload Files Mới

```powershell
# Trên Windows
.\upload-to-vps.ps1
```

### Bước 2: Enable Xray Stats API

```bash
# Trên VPS
chmod +x *.sh
sudo bash enable-xray-stats.sh
```

Script này sẽ:
- Thêm API inbound (port 10085) vào Xray config
- Enable stats tracking
- Restart Xray service

### Bước 3: Cập Nhật Monitoring Services

```bash
# Copy updated Python files
sudo cp traffic_monitor.py /opt/xray-monitor/
sudo cp user_manager.py /opt/xray-monitor/
sudo cp monitoring-dashboard.py /opt/xray-monitor/

# Copy templates
sudo cp templates/*.html /opt/xray-monitor/templates/

# Restart services
sudo systemctl restart xray-monitor
sudo systemctl restart traffic-monitor
sudo systemctl restart bandwidth-tracker
```

### Bước 4: Kiểm Tra Hoạt Động

```bash
sudo bash debug-traffic.sh
```

Script này sẽ kiểm tra:
- ✅ Xray Stats API có hoạt động không
- ✅ Access logs có ghi đúng không
- ✅ Traffic Monitor service có chạy không
- ✅ Database có data không

## Troubleshooting

### Vấn Đề 1: Traffic Vẫn Là 0

**Nguyên nhân:** Chưa có ai dùng proxy hoặc Xray chưa log traffic

**Giải pháp:**
1. Dùng thử proxy từ điện thoại/máy tính
2. Mở web, xem video để tạo traffic
3. Đợi 5 phút để Traffic Monitor cập nhật
4. Reload dashboard

### Vấn Đề 2: Xray Stats API Không Hoạt Động

**Kiểm tra:**
```bash
# Test API
/usr/local/bin/xray api statsquery --server=127.0.0.1:10085

# Nếu lỗi "connection refused"
sudo systemctl restart xray
sleep 3
/usr/local/bin/xray api statsquery --server=127.0.0.1:10085
```

**Nếu vẫn lỗi:**
```bash
# Kiểm tra Xray config
sudo cat /usr/local/etc/xray/config.json | grep -A 5 '"api"'

# Nếu không có "api" section
sudo bash enable-xray-stats.sh
```

### Vấn Đề 3: Traffic Monitor Không Chạy

**Kiểm tra:**
```bash
sudo systemctl status traffic-monitor
```

**Nếu failed:**
```bash
# Xem logs
sudo journalctl -u traffic-monitor -n 50

# Restart
sudo systemctl restart traffic-monitor

# Chạy manually để debug
sudo python3 /opt/xray-monitor/traffic_monitor.py
```

### Vấn Đề 4: Email Field Không Khớp

**Nguyên nhân:** User có username nhưng không có email

**Giải pháp:** Code đã được cập nhật để match cả username lẫn email:
```python
# Tìm user bằng email HOẶC username
c.execute('SELECT id FROM users WHERE email = ? OR username = ?', 
         (email_or_username, email_or_username))
```

## Xem Logs Real-Time

```bash
# Dashboard logs
sudo journalctl -u xray-monitor -f

# Traffic Monitor logs
sudo journalctl -u traffic-monitor -f

# Xray logs
sudo journalctl -u xray -f

# Xray access logs
sudo tail -f /var/log/xray/access.log
```

## Manual Traffic Update

Nếu muốn force update ngay lập tức:

```bash
# Stop service
sudo systemctl stop traffic-monitor

# Run manually
sudo python3 /opt/xray-monitor/traffic_monitor.py
# (Ctrl+C sau 1-2 phút)

# Start service lại
sudo systemctl start traffic-monitor
```

## Database Query

Xem traffic trực tiếp từ database:

```bash
sudo sqlite3 /opt/xray-monitor/users.db

# Trong sqlite3
SELECT 
    username,
    total_upload/1024/1024 as 'Upload_MB',
    total_download/1024/1024 as 'Download_MB',
    traffic_limit/1024/1024/1024 as 'Limit_GB'
FROM users;

.exit
```

## Kiểm Tra Hoàn Chỉnh

```bash
# 1. Xray có chạy không?
sudo systemctl status xray

# 2. Stats API có hoạt động không?
/usr/local/bin/xray api statsquery --server=127.0.0.1:10085

# 3. Traffic Monitor có chạy không?
sudo systemctl status traffic-monitor

# 4. Dashboard có chạy không?
sudo systemctl status xray-monitor

# 5. User có trong database không?
sudo sqlite3 /opt/xray-monitor/users.db "SELECT username, uuid, enabled FROM users;"

# 6. Access logs có traffic không?
sudo tail -100 /var/log/xray/access.log | grep -i "email"
```

## Các Lệnh Hữu Ích

```bash
# Reset traffic cho user
sudo sqlite3 /opt/xray-monitor/users.db "UPDATE users SET total_upload=0, total_download=0 WHERE username='admin';"

# Tăng traffic limit
sudo sqlite3 /opt/xray-monitor/users.db "UPDATE users SET traffic_limit=500*1024*1024*1024 WHERE username='admin';"
# (500 GB = 500*1024*1024*1024 bytes)

# Force restart tất cả services
sudo systemctl restart xray
sudo systemctl restart xray-monitor
sudo systemctl restart traffic-monitor
sudo systemctl restart bandwidth-tracker
```

## FAQ

**Q: Traffic bao lâu mới cập nhật?**
A: Mỗi 5 phút. Nếu muốn nhanh hơn, edit `/opt/xray-monitor/traffic_monitor.py` và thay `time.sleep(300)` thành `time.sleep(60)` (1 phút)

**Q: Có thể xem traffic real-time không?**
A: Có, xem logs: `sudo tail -f /var/log/xray/access.log`

**Q: Traffic limit hoạt động như thế nào?**
A: Khi user vượt quá limit, `traffic_monitor.py` sẽ tự động disable user đó trong Xray config

**Q: Reset traffic hàng tháng tự động không?**
A: Có, `traffic_monitor.py` tự động reset vào ngày 1 hàng tháng

**Q: Làm sao biết Xray đang log traffic?**
A: Kiểm tra: `sudo tail -20 /var/log/xray/access.log | grep "uplink\|downlink"`

## Liên Hệ

Nếu vẫn gặp vấn đề, chạy:
```bash
sudo bash debug-traffic.sh > debug-output.txt
```

Và gửi file `debug-output.txt` để được hỗ trợ.

