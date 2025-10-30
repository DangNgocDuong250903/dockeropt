# 🚀 AUTO - Automation Toolkit

**Tự động hóa mọi thứ: VM Management, Script Deployment & Xray VPS Setup**

---

## 📚 Quick Links

- **[Complete Guide](GUIDE.md)** - All-in-one documentation
- **[Script Panel Guide](script_panel/README.md)** - Web UI documentation
- **[Xray Setup Guides](docs/)** - Original Xray/VPS guides

---

## ⚡ Quick Start

### 1. Setup VM Manager & CLI
```bash
# Windows
.\setup-vm-manager.ps1

# Linux/Mac
./setup-vm-manager.sh && source ~/.bashrc
```

### 2. Start Script Control Panel
```bash
python auto.py scripts start
# Open: http://127.0.0.1:5173
```

### 3. Add your first VM
```bash
python auto.py vm wizard
# or
python auto.py vm quick-add root@your-server-ip
```

**📖 Full guide: [GUIDE.md](GUIDE.md)**

---

# 🚀 Xray VPS Setup - Tăng tốc 4G/5G

Hệ thống tự động cài đặt và cấu hình **Xray-core** trên VPS Google Cloud để tăng tốc độ mạng di động 4G/5G.

## ✨ Tính năng

- ✅ Cài đặt tự động Xray-core phiên bản mới nhất
- ✅ Hỗ trợ 2 protocol: **VLESS+XTLS** (tốc độ cao) và **VMess+WebSocket** (tương thích rộng)
- ✅ Tự động tạo UUID và SSL certificate
- ✅ Generate QR code để quét từ điện thoại
- ✅ Systemd service (tự động khởi động)
- ✅ Hướng dẫn chi tiết bằng tiếng Việt

## 📋 Yêu cầu

- VPS Google Cloud (hoặc bất kỳ VPS Linux nào)
- Debian/Ubuntu
- Quyền root/sudo
- Port 443 và 10086 mở

## 🚀 Cài đặt nhanh (5 phút)

> 📖 **Xem hướng dẫn chi tiết**: [docs/QUICK-START.md](docs/QUICK-START.md)

### 1️⃣ Upload scripts lên VPS

**Windows PowerShell:**
```powershell
.\upload-to-vps.ps1
```

### 2️⃣ SSH vào VPS và cài đặt

```bash
ssh -i ~/.ssh/id_rsa ngocduong@34.150.92.64
chmod +x *.sh
sudo bash install-xray.sh
```

### 3️⃣ Mở firewall (Google Cloud)

```bash
gcloud compute firewall-rules create allow-xray \
  --allow tcp:443,tcp:10086,tcp:5000
```

### 4️⃣ Setup Monitoring Dashboard

```bash
sudo bash setup-monitoring.sh
```

### 5️⃣ Truy cập Dashboard

**URL:** `http://YOUR_VPS_IP:5000`  
**Login:** `Ngocduong2509` / `Ngocduong2509`

Từ dashboard:
- Tạo users mới
- Generate QR codes
- Theo dõi traffic
- Set device limits

## 📱 Apps hỗ trợ

### Android
- [v2rayNG](https://github.com/2dust/v2rayNG) (Khuyến nghị)
- [Hiddify Next](https://github.com/hiddify/hiddify-next)
- NapsternetV
- v2rayGo

### iOS
- Shadowrocket (Trả phí)
- Stash
- Hiddify Next (TestFlight)

## 📊 Monitoring Dashboard (NEW!)

Web UI để quản lý users và theo dõi traffic:
- 👥 Multi-user management
- 📈 Real-time traffic & bandwidth
- 🚫 **Auto-block khi vượt device limit**
- 📱 Mobile-friendly (PWA)

**Truy cập:** `http://YOUR_VPS_IP:5000`
**Login:** `Ngocduong2509` / `Ngocduong2509`

### 🚫 Auto-Block Device Limit

```
User có device_limit = 3
→ Connect 4 devices = OVER!
→ Tự động disable user (sau 30s)
→ Disconnect 1 device → OK
→ Tự động enable lại
```

**Xem logs:**
```bash
sudo journalctl -u connection-monitor -f
```

## 📂 Cấu trúc project

```
AUTO/
│
├── 📁 setup/                       # Scripts cài đặt & setup
│   ├── install-xray.sh             # Cài Xray-core
│   ├── install-xray-fast.sh        # Cài nhanh (1 lệnh)
│   ├── quick-start.sh              # Setup hoàn chỉnh
│   ├── check-connection.sh         # Kiểm tra kết nối
│   ├── uninstall-xray.sh           # Gỡ cài đặt
│   ├── enable-xray-stats.sh        # Bật stats API
│   ├── geoip-setup.sh              # Setup GeoIP blocking
│   ├── fix-*.sh                    # Fix scripts
│   └── debug-*.sh                  # Debug tools
│
├── 📁 config/                      # Tạo config cho client
│   ├── generate-client-config.sh   # Gen QR code đầy đủ
│   └── generate-simple-config.sh   # Gen QR đơn giản
│
├── 📁 monitoring/                  # Web Dashboard & Monitoring
│   ├── monitoring-dashboard.py     # Main web UI
│   ├── user_manager.py             # Quản lý users
│   ├── traffic_monitor.py          # Theo dõi traffic
│   ├── connection_monitor.py       # Device limit & auto-block
│   ├── bandwidth_tracker.py        # Bandwidth history
│   ├── server-manager.py           # Multi-server (upcoming)
│   ├── setup-*.sh                  # Setup monitoring services
│   ├── templates/                  # HTML templates
│   └── static/                     # CSS, JS, PWA files
│
├── 📁 docs/                        # Tài liệu hướng dẫn
│   ├── QUICK-START.md              # Hướng dẫn nhanh 5 phút
│   ├── HUONG-DAN.md                # Hướng dẫn đầy đủ
│   ├── TEST-TOC-DO.md              # Cách test tốc độ
│   ├── TRAFFIC-TRACKING-GUIDE.md   # Hướng dẫn traffic tracking
│   ├── API-DOCS.md                 # API documentation
│   └── *.md                        # Các guides khác
│
├── upload-to-vps.ps1               # Upload lên VPS (Windows)
└── README.md                       # File này
```

## 🔍 Kiểm tra & Quản lý

### Qua Web Dashboard (Dễ nhất)
```
http://YOUR_VPS_IP:5000
```
Xem tất cả: users, traffic, connections, logs

### Qua Command Line
```bash
# Kiểm tra Xray
sudo systemctl status xray

# Kiểm tra Dashboard
sudo systemctl status monitoring-dashboard

# Kiểm tra Traffic Monitor
sudo systemctl status traffic-monitor

# Kiểm tra Connection Monitor (device limits)
sudo systemctl status connection-monitor
```

## 🔧 Troubleshooting

### ❌ Không kết nối được?
1. Check Dashboard: `http://YOUR_VPS_IP:5000` → System status
2. Check firewall: Port 443, 10086, 5000 mở chưa?
3. Logs: Dashboard → Logs hoặc `sudo journalctl -u xray -f`

### 🐌 Kết nối chậm?
1. Đổi protocol: VMess+WS (port 10086) thay vì VLESS
2. Tắt Mux trong v2rayNG
3. Routing: Bypass mainland

### 📊 Traffic không tăng?
1. Check Dashboard → Users → Traffic column
2. `sudo systemctl restart traffic-monitor`
3. `sudo journalctl -u traffic-monitor -f`

## 📖 Tài liệu

**Trong project:**
- [docs/QUICK-START.md](docs/QUICK-START.md) - Hướng dẫn nhanh 5 phút ⚡
- [docs/HUONG-DAN.md](docs/HUONG-DAN.md) - Hướng dẫn đầy đủ 📚
- [docs/TEST-TOC-DO.md](docs/TEST-TOC-DO.md) - Hướng dẫn test tốc độ 📊
- [docs/TRAFFIC-TRACKING-GUIDE.md](docs/TRAFFIC-TRACKING-GUIDE.md) - Traffic tracking
- [docs/API-DOCS.md](docs/API-DOCS.md) - API documentation

**External:**
- [Xray-core Docs](https://xtls.github.io/)
- [v2rayNG Wiki](https://github.com/2dust/v2rayNG/wiki)

## 🎯 Protocol so sánh

| Protocol | Tốc độ | Bảo mật | Tương thích | Port |
|----------|--------|---------|-------------|------|
| VLESS+XTLS | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 443 |
| VMess+WS | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 10086 |

**Khuyến nghị:** Dùng VLESS+XTLS trước, nếu không được thì chuyển sang VMess+WS

## 🛡️ Bảo mật

- UUID được tạo ngẫu nhiên
- SSL/TLS encryption
- Chỉ chia sẻ config với người tin cậy
- Định kỳ rotate UUID (mỗi 3-6 tháng)

## 🔄 Update & Uninstall

### Update Xray
```bash
sudo bash install-xray.sh
```

### Gỡ cài đặt
```bash
sudo bash uninstall-xray.sh
```

## ⚠️ Lưu ý

1. **Chỉ dùng cho mục đích hợp pháp**
2. Theo dõi bandwidth để tránh vượt quota Google Cloud
3. Backup UUID và config file
4. Không chia sẻ QR code/config công khai

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Xray Community**: https://t.me/projectXray

## 📝 License

MIT License - Use at your own risk

---

**Made with ❤️ for Vietnamese users**

🎉 Chúc bạn có trải nghiệm 4G/5G tốc độ cao!

