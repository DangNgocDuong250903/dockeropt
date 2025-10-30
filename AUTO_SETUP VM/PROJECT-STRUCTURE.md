# 📦 CẤU TRÚC PROJECT

## 📁 Tổ chức thư mục

```
AUTO/
│
├── 📄 README.md                    # Hướng dẫn chính
├── 📄 upload-to-vps.ps1            # Upload lên VPS (Windows)
│
├── 📁 setup/                       # CÀI ĐẶT & SETUP XRAY
│   ├── install-xray.sh             # Cài Xray-core
│   ├── install-xray-fast.sh        # Cài nhanh (1 lệnh)
│   ├── quick-start.sh              # Setup hoàn chỉnh
│   ├── check-connection.sh         # Kiểm tra kết nối
│   ├── uninstall-xray.sh           # Gỡ cài đặt
│   ├── enable-xray-stats.sh        # Bật stats API
│   ├── geoip-setup.sh              # Setup GeoIP blocking
│   ├── fix-config.sh               # Fix config
│   ├── fix-traffic-tracking.sh     # Fix traffic tracking
│   ├── debug-traffic.sh            # Debug traffic
│   ├── test-best-config.sh         # Test config tốt nhất
│   └── add-server.sh               # Add server (multi-server)
│
├── 📁 config/                      # TẠO CONFIG CHO CLIENT
│   ├── generate-client-config.sh   # Gen QR code đầy đủ
│   └── generate-simple-config.sh   # Gen QR đơn giản
│
├── 📁 monitoring/                  # WEB DASHBOARD & MONITORING
│   ├── monitoring-dashboard.py     # 🌐 Main web UI
│   ├── user_manager.py             # 👥 Quản lý users
│   ├── traffic_monitor.py          # 📊 Theo dõi traffic
│   ├── connection_monitor.py       # 🚫 Device limit & auto-block
│   ├── bandwidth_tracker.py        # 📈 Bandwidth history
│   ├── server-manager.py           # 🖥️  Multi-server
│   ├── setup-monitoring.sh         # Setup dashboard
│   ├── setup-bandwidth-tracker.sh  # Setup bandwidth tracker
│   ├── setup-traffic-monitor.sh    # Setup traffic monitor
│   ├── setup-cloudflare-xray.sh    # Setup CloudFlare
│   ├── templates/                  # 📄 HTML templates
│   │   ├── dashboard.html          # Dashboard page
│   │   ├── login.html              # Login page
│   │   ├── users.html              # Users management
│   │   ├── logs.html               # Logs viewer
│   │   └── settings.html           # Settings page
│   └── static/                     # 🎨 Static files
│       ├── manifest.json           # PWA manifest
│       └── sw.js                   # Service worker
│
└── 📁 docs/                        # TÀI LIỆU
    ├── QUICK-START.md              # ⚡ Hướng dẫn nhanh 5 phút
    ├── HUONG-DAN.md                # 📚 Hướng dẫn đầy đủ
    ├── TEST-TOC-DO.md              # 📊 Cách test tốc độ
    ├── TRAFFIC-TRACKING-GUIDE.md   # 📈 Traffic tracking
    ├── API-DOCS.md                 # 🔌 API documentation
    ├── MULTI-SERVER-GUIDE.md       # 🖥️  Multi-server guide
    ├── QUICK-FIX-TRAFFIC.md        # 🔧 Quick fix traffic
    ├── WHATS-NEW.md                # 🆕 What's new
    ├── CAU-HINH-TOI-UU-VN.md       # 🇻🇳 Cấu hình tối ưu VN
    ├── FIX-LOI-MANG.txt            # 🔧 Fix lỗi mạng
    └── KET-NOI-XRAY.txt            # 🔗 Kết nối Xray
```

---

## 🎯 SỬ DỤNG

### 1️⃣ Upload lên VPS
```powershell
.\upload-to-vps.ps1
```

### 2️⃣ Cài đặt Xray
```bash
ssh -i ~/.ssh/id_rsa ngocduong@YOUR_VPS_IP
chmod +x *.sh
sudo bash install-xray.sh
```

### 3️⃣ Setup Dashboard
```bash
sudo bash setup-monitoring.sh
```

### 4️⃣ Truy cập
```
http://YOUR_VPS_IP:5000
Login: Ngocduong2509 / Ngocduong2509
```

---

## 📌 CHỨC NĂNG CHÍNH

| Thư mục | Mục đích | Files chính |
|---------|----------|-------------|
| **setup/** | Cài đặt & setup Xray | `install-xray.sh`, `quick-start.sh` |
| **config/** | Tạo QR codes cho client | `generate-client-config.sh` |
| **monitoring/** | Web dashboard & tracking | `monitoring-dashboard.py`, `user_manager.py` |
| **docs/** | Tài liệu hướng dẫn | `QUICK-START.md`, `HUONG-DAN.md` |

---

## ⚡ QUICK COMMANDS

```bash
# Kiểm tra services
sudo systemctl status xray
sudo systemctl status monitoring-dashboard
sudo systemctl status traffic-monitor
sudo systemctl status connection-monitor

# View logs
sudo journalctl -u xray -f
sudo journalctl -u connection-monitor -f

# Restart services
sudo systemctl restart xray
sudo systemctl restart monitoring-dashboard
```

---

## 🔗 LINKS

- **Dashboard:** `http://YOUR_VPS_IP:5000`
- **Docs:** `docs/` folder
- **Source:** All scripts in `setup/`, `config/`, `monitoring/`

