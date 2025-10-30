# 🚀 Hướng dẫn cài đặt Xray-core trên VPS để tăng tốc 4G/5G

## 📋 Mục lục
1. [Giới thiệu](#giới-thiệu)
2. [Cài đặt trên VPS](#cài-đặt-trên-vps)
3. [Cấu hình Firewall](#cấu-hình-firewall)
4. [Tạo config cho điện thoại](#tạo-config-cho-điện-thoại)
5. [Cài đặt app trên Android](#cài-đặt-app-trên-android)
6. [Kết nối và sử dụng](#kết-nối-và-sử-dụng)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Giới thiệu

Hệ thống này giúp bạn:
- ✅ Tăng tốc độ mạng 4G/5G
- ✅ Vượt qua giới hạn băng thông của nhà mạng
- ✅ Ổn định kết nối khi streaming/gaming
- ✅ Tự động routing traffic qua VPS

**Công nghệ sử dụng:**
- **Xray-core**: Phiên bản nâng cao của V2Ray
- **VLESS + XTLS**: Protocol hiệu suất cao nhất
- **VMess + WebSocket**: Dự phòng, tương thích rộng

---

## 🖥️ Cài đặt trên VPS

### Bước 1: SSH vào VPS

```bash
ssh -i ~/.ssh/id_rsa duongng_dn@34.1.141.233
```

### Bước 2: Tải các script cài đặt

**Cách 1: Clone từ GitHub (nếu bạn đã push code)**
```bash
git clone <your-repo-url>
cd <repo-name>
```

**Cách 2: Upload từ máy local**
```bash
# Trên máy local (Windows PowerShell)
scp -i ~/.ssh/id_rsa install-xray.sh duongng_dn@34.1.141.233:~/
scp -i ~/.ssh/id_rsa generate-client-config.sh duongng_dn@34.1.141.233:~/
```

### Bước 3: Chạy script cài đặt

```bash
# Cấp quyền thực thi
chmod +x install-xray.sh
chmod +x generate-client-config.sh

# Chạy cài đặt (cần quyền root)
sudo bash install-xray.sh
```

Script sẽ tự động:
- ✅ Cài đặt Xray-core phiên bản mới nhất
- ✅ Tạo UUID ngẫu nhiên cho bạn
- ✅ Cấu hình VLESS + XTLS trên port 443
- ✅ Cấu hình VMess + WebSocket trên port 10086
- ✅ Tạo SSL certificate
- ✅ Thiết lập systemd service (tự động khởi động)

### Bước 4: Kiểm tra trạng thái

```bash
# Kiểm tra service đang chạy
sudo systemctl status xray

# Xem logs
sudo journalctl -u xray -f
```

---

## 🔥 Cấu hình Firewall

### Trên Google Cloud Console

1. Vào **VPC Network** → **Firewall**
2. Click **Create Firewall Rule**

**Rule 1: VLESS (Port 443)**
- Name: `allow-xray-vless`
- Direction: Ingress
- Action: Allow
- Targets: All instances
- Source IP ranges: `0.0.0.0/0`
- Protocols/Ports: `tcp:443`

**Rule 2: VMess (Port 10086)**
- Name: `allow-xray-vmess`
- Direction: Ingress
- Action: Allow
- Targets: All instances
- Source IP ranges: `0.0.0.0/0`
- Protocols/Ports: `tcp:10086`

### Hoặc dùng gcloud CLI (trên máy local)

```bash
gcloud compute firewall-rules create allow-xray-vless \
  --allow tcp:443 \
  --description "Allow Xray VLESS+TLS" \
  --direction INGRESS

gcloud compute firewall-rules create allow-xray-vmess \
  --allow tcp:10086 \
  --description "Allow Xray VMess+WS" \
  --direction INGRESS
```

---

## 📱 Tạo config cho điện thoại

Chạy script này trên VPS:

```bash
sudo bash generate-client-config.sh
```

Script sẽ tạo:
- ✅ QR code hiển thị trên terminal (quét trực tiếp)
- ✅ File QR code PNG: `xray-configs/vless-qr.png`
- ✅ Config link: `xray-configs/vless-config.txt`
- ✅ JSON config: `xray-configs/v2rayNG-config.json`

### Tải QR code về máy tính

```bash
# Trên máy local (Windows)
scp -i ~/.ssh/id_rsa duongng_dn@34.1.141.233:~/xray-configs/*.png ./
```

---

## 📲 Cài đặt app trên Android

### App khuyến nghị

**v2rayNG** (Miễn phí, mã nguồn mở)
- Download: [Google Play](https://play.google.com/store/apps/details?id=com.v2ray.ang) hoặc [GitHub](https://github.com/2dust/v2rayNG/releases)

**Hiddify Next** (Giao diện đẹp)
- Download: [GitHub](https://github.com/hiddify/hiddify-next/releases)

**Các app khác:**
- NapsternetV
- v2rayU (iOS)
- Shadowrocket (iOS - trả phí)

---

## 🔌 Kết nối và sử dụng

### Cách 1: Quét QR Code (Nhanh nhất)

1. Mở app **v2rayNG**
2. Nhấn dấu **+** ở góc trên bên phải
3. Chọn **Import config from QR code**
4. Quét QR code từ terminal hoặc file PNG
5. Nhấn vào config vừa import
6. Nhấn nút **▶️ Connect** ở dưới cùng

### Cách 2: Import từ Clipboard

1. Copy link VLESS hoặc VMess:
```
vless://UUID@IP:443?encryption=none&flow=xtls-rprx-vision&security=tls...
```

2. Mở app **v2rayNG**
3. Nhấn dấu **+** → **Import config from clipboard**

### Cách 3: Nhập thủ công

1. Mở app **v2rayNG**
2. Nhấn dấu **+** → **Type manually [VLESS]**
3. Điền thông tin:
   - **Remarks**: `VPS 4G5G`
   - **Address**: IP VPS của bạn (VD: `34.1.141.233`)
   - **Port**: `443`
   - **ID (UUID)**: UUID từ file `uuid.txt`
   - **Flow**: `xtls-rprx-vision`
   - **Encryption**: `none`
   - **Network**: `tcp`
   - **TLS**: `tls`
   - **SNI**: IP VPS của bạn

---

## ⚙️ Cài đặt nâng cao trong v2rayNG

### Routing Settings (Quan trọng!)

**Menu → Settings → Routing Settings:**

- **Domain Strategy**: `IPIfNonMatch` (khuyến nghị)
- **Routing Mode**: 
  - `Bypass mainland` - Chỉ route traffic quốc tế qua VPS
  - `Global` - Route toàn bộ traffic qua VPS

### Performance Settings

**Menu → Settings:**

- **Enable Mux**: `OFF` (tắt để tốc độ tốt hơn)
- **Concurrent Connections**: `8-16`
- **Sniffing**: `ON` (bật để phát hiện protocol)

### Per-App Proxy (Tùy chọn)

Nếu bạn chỉ muốn một số app dùng proxy:

1. **Settings → Per-App Proxy**
2. Chọn các app cần proxy (YouTube, Netflix, Chrome...)

---

## 🧪 Kiểm tra kết nối

### Test 1: Ping VPS

```bash
# Trên điện thoại, dùng Termux hoặc ping tool
ping 34.1.141.233
```

### Test 2: Check IP sau khi kết nối

1. Kết nối Xray trên điện thoại
2. Mở trình duyệt, truy cập: https://ifconfig.me
3. IP hiển thị phải là IP VPS của bạn

### Test 3: Speed Test

1. Kết nối Xray
2. Mở app **Speedtest by Ookla**
3. Chạy test → So sánh tốc độ với/không có proxy

---

## 🔧 Troubleshooting

### ❌ Không kết nối được

**Kiểm tra firewall:**
```bash
# Trên VPS
sudo systemctl status xray
sudo ss -tuln | grep -E '443|10086'
```

**Kiểm tra Google Cloud Firewall:**
```bash
gcloud compute firewall-rules list | grep xray
```

**Xem logs:**
```bash
sudo journalctl -u xray -n 50
```

### ❌ Kết nối được nhưng chậm

1. **Đổi sang VMess + WebSocket** (port 10086)
2. **Tắt Mux** trong v2rayNG
3. **Routing Mode**: Chọn `Bypass mainland`
4. **Kiểm tra băng thông VPS**: 
   ```bash
   # Trên VPS
   iftop
   ```

### ❌ Bị ngắt kết nối thường xuyên

**Tăng timeout trong config:**
```bash
sudo nano /usr/local/etc/xray/config.json
```

Thêm trong `policy`:
```json
"policy": {
  "levels": {
    "0": {
      "handshake": 4,
      "connIdle": 300,
      "uplinkOnly": 2,
      "downlinkOnly": 5
    }
  }
}
```

Restart service:
```bash
sudo systemctl restart xray
```

### ❌ UUID không đúng

```bash
# Xem UUID hiện tại
cat /usr/local/etc/xray/uuid.txt

# Tạo UUID mới
uuidgen | sudo tee /usr/local/etc/xray/uuid.txt

# Chỉnh config và restart
sudo nano /usr/local/etc/xray/config.json
sudo systemctl restart xray
```

---

## 🔄 Cập nhật và bảo trì

### Cập nhật Xray-core

```bash
# Chạy lại script cài đặt
sudo bash install-xray.sh
```

### Backup config

```bash
sudo cp -r /usr/local/etc/xray /root/xray-backup-$(date +%Y%m%d)
```

### Xem logs chi tiết

```bash
# Real-time logs
sudo journalctl -u xray -f

# Logs 24h qua
sudo journalctl -u xray --since "24 hours ago"
```

### Uninstall

```bash
sudo systemctl stop xray
sudo systemctl disable xray
sudo rm /etc/systemd/system/xray.service
sudo rm /usr/local/bin/xray
sudo rm -rf /usr/local/etc/xray
```

---

## 📊 Monitoring

### Xem traffic realtime

```bash
# Cài iftop
sudo apt install iftop

# Monitor
sudo iftop -i eth0
```

### Kiểm tra số lượng kết nối

```bash
sudo ss -s
sudo netstat -an | grep -E '443|10086' | wc -l
```

---

## 🎓 Kiến thức bổ sung

### VLESS vs VMess

| Feature | VLESS + XTLS | VMess + WebSocket |
|---------|--------------|-------------------|
| **Tốc độ** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Bảo mật** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Tương thích** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Khuyến nghị** | ✅ Dùng đầu tiên | Dự phòng |

### Port recommendations

- **443**: VLESS + TLS (giống HTTPS, khó block)
- **10086**: VMess + WebSocket
- **80**: HTTP fallback
- **Tùy chỉnh**: 8443, 2053, 2083, 2087, 2096

### Tối ưu VPS

```bash
# BBR (tăng tốc TCP)
echo "net.core.default_qdisc=fq" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Kiểm tra
sysctl net.ipv4.tcp_congestion_control
```

---

## 📞 Liên hệ & Support

- **GitHub Issues**: [Report bug]
- **Xray-core Docs**: https://xtls.github.io/
- **v2rayNG Docs**: https://github.com/2dust/v2rayNG

---

## ⚠️ Lưu ý quan trọng

1. **Chỉ dùng cho mục đích hợp pháp**
2. **Bảo mật UUID** - Đừng chia sẻ với người khác
3. **Theo dõi bandwidth** - Google Cloud có thể tính phí nếu vượt quota
4. **Backup config** - Lưu UUID và config file
5. **Update thường xuyên** - Xray-core luôn cải thiện hiệu suất

---

**🎉 Chúc bạn có trải nghiệm 4G/5G tốc độ cao!**

