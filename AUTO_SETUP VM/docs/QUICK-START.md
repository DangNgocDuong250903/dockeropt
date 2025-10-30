# ⚡ Quick Start Guide - 5 phút setup xong!

## 🎯 Mục tiêu
Cài đặt Xray trên VPS để tăng tốc 4G/5G cho điện thoại Android trong 5 phút.

---

## 📋 Checklist trước khi bắt đầu

- [ ] Có VPS Google Cloud đang chạy
- [ ] Biết IP public của VPS
- [ ] Có SSH key để kết nối
- [ ] Đã cài app **v2rayNG** trên Android

---

## 🚀 Bước 1: Upload scripts lên VPS (30 giây)

### Trên Windows (PowerShell):

```powershell
# Upload scripts
.\upload-to-vps.ps1
```

Hoặc thủ công:

```powershell
scp -i ~/.ssh/id_rsa install-xray.sh generate-client-config.sh duongng_dn@34.1.141.233:~/
```

---

## 🔧 Bước 2: Cài đặt Xray trên VPS (2 phút)

```bash
# SSH vào VPS
ssh -i ~/.ssh/id_rsa duongng_dn@34.1.141.233

# Cài đặt
chmod +x install-xray.sh
sudo bash install-xray.sh
```

Đợi script chạy xong (~2 phút).

---

## 🔥 Bước 3: Mở firewall (1 phút)

### Cách 1: Google Cloud Console (Web)

1. Vào **VPC Network** → **Firewall**
2. **Create Firewall Rule**:
   - Name: `allow-xray`
   - Targets: All instances
   - Source IP: `0.0.0.0/0`
   - Protocols/Ports: `tcp:443,tcp:10086`
3. **Create**

### Cách 2: gcloud CLI (trên máy local)

```bash
gcloud compute firewall-rules create allow-xray --allow tcp:443,tcp:10086
```

---

## 📱 Bước 4: Tạo QR code (30 giây)

```bash
# Trên VPS
sudo bash generate-client-config.sh
```

QR code sẽ hiển thị ngay trên terminal!

---

## 📲 Bước 5: Kết nối từ điện thoại (1 phút)

1. Mở app **v2rayNG** trên Android
2. Nhấn dấu **+** (góc trên bên phải)
3. Chọn **Import config from QR code**
4. Quét QR code từ màn hình VPS
5. Nhấn nút **▶️ Connect**

**Done!** 🎉

---

## ✅ Kiểm tra kết nối

1. Bật dữ liệu di động (4G/5G)
2. Mở Chrome/Firefox trên điện thoại
3. Truy cập: https://ifconfig.me
4. **IP hiển thị phải là IP VPS** → Thành công!

---

## 🧪 Test tốc độ

1. Mở app **Speedtest** (Ookla)
2. Chạy test
3. So sánh tốc độ trước/sau khi bật Xray

---

## 🔍 Troubleshooting nhanh

### ❌ Không kết nối được?

```bash
# Trên VPS, kiểm tra:
sudo bash check-connection.sh
```

### ❌ Kết nối chậm?

1. **Trong v2rayNG:**
   - Settings → **Routing Settings**
   - Routing Mode: Chọn **Bypass mainland**
   - Enable Mux: **OFF**

2. **Đổi sang VMess** (port 10086):
   - Generate config lại
   - Import config VMess vào app

### ❌ Không thấy QR code?

```bash
# Tải QR code về máy local
scp -i ~/.ssh/id_rsa duongng_dn@34.1.141.233:~/xray-configs/*.png ./
```

---

## 📊 Monitoring

```bash
# Xem status nhanh
sudo systemctl status xray

# Xem logs realtime
sudo journalctl -u xray -f

# Check ports
sudo ss -tuln | grep -E '443|10086'
```

---

## ⚙️ Tối ưu hóa (Optional)

Chạy sau khi cài đặt để tăng hiệu suất:

```bash
sudo bash optimize-vps.sh
```

Script sẽ:
- ✅ Bật BBR (Google TCP congestion control)
- ✅ Tối ưu network parameters
- ✅ Tăng file descriptors limit
- ✅ Cài đặt monitoring tools

---

## 📱 Config nhanh cho nhiều điện thoại

Nếu bạn muốn dùng cho nhiều thiết bị:

```bash
# Tạo config lại (dùng chung UUID)
sudo bash generate-client-config.sh

# Quét QR code cho từng điện thoại
```

**⚠️ Lưu ý:** Tất cả thiết bị dùng chung UUID → Chia sẻ bandwidth.

---

## 🎓 Tips & Tricks

### Routing thông minh

**Trong v2rayNG Settings:**

- **Bypass mainland**: Chỉ route traffic quốc tế (YouTube, Netflix, Google)
- **Global**: Route tất cả traffic (chậm hơn)
- **Block Ads**: Bật để chặn quảng cáo

### Per-App Proxy

Chỉ cho một số app dùng proxy:

1. **v2rayNG → Settings → Per-App Proxy**
2. Chọn apps: Chrome, YouTube, Netflix...

### Battery saving

- Routing Mode: **Bypass mainland**
- Enable Mux: **OFF**
- Connection test URL: Để trống (không test ping)

---

## 📞 Commands cheat sheet

```bash
# VPS
sudo systemctl status xray      # Xem status
sudo systemctl restart xray     # Restart service
sudo journalctl -u xray -f      # Xem logs
sudo bash check-connection.sh   # Kiểm tra kết nối

# Config
cat /usr/local/etc/xray/uuid.txt  # Xem UUID
sudo bash generate-client-config.sh  # Tạo config mới

# Monitoring
htop                            # CPU/Memory
sudo iftop -i eth0             # Network traffic
sudo ss -an | grep ESTAB       # Active connections
```

---

## 🔗 Links hữu ích

- **Hướng dẫn đầy đủ**: [HUONG-DAN.md](HUONG-DAN.md)
- **v2rayNG**: https://github.com/2dust/v2rayNG
- **Xray-core**: https://github.com/XTLS/Xray-core

---

## 🎉 Xong rồi!

Giờ bạn đã có VPS proxy riêng để:
- ✅ Tăng tốc 4G/5G
- ✅ Vượt throttling của nhà mạng
- ✅ Streaming/gaming mượt hơn
- ✅ Tự chủ hoàn toàn

**Chúc bạn có trải nghiệm tốt!** 🚀

