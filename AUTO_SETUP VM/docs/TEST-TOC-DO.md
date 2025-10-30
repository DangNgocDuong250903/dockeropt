# 📊 Hướng dẫn TEST TỐC ĐỘ đúng cách

## 🔍 Hiểu rõ vai trò Xray VPS

### Xray VPS là gì?
**Xray VPS = Proxy Server** để vượt giới hạn của nhà mạng

### Khi NÀO nên dùng Xray?

✅ **Truy cập YouTube, Netflix quốc tế** - Vượt throttling
✅ **Facebook, Instagram load chậm** - Bypass giới hạn
✅ **Gaming quốc tế** - Giảm ping, ổn định
✅ **Websites bị chặn** - Vượt firewall

❌ **KHÔNG dùng cho**: Speedtest, download file thông thường

---

## 📱 TEST TỐC ĐỘ 5G VIETTEL

### Bước 1: Test KHÔNG qua proxy (tắt v2rayNG)

```
1. Tắt v2rayNG (Disconnect)
2. Mở Speedtest by Ookla
3. Chọn server: Viettel (Hanoi/HCMC)
4. Ghi lại tốc độ: ______ Mbps
```

### Bước 2: Test QUA proxy (bật v2rayNG)

```
1. Bật v2rayNG (Connect)
2. Mở Speedtest by Ookla
3. Chọn server: Google Cloud (Singapore)
4. Ghi lại tốc độ: ______ Mbps
```

### Kết quả mong đợi:

| Trường hợp | Không proxy | Qua proxy | Giải thích |
|------------|-------------|-----------|------------|
| **Download file VN** | 100 Mbps | 50 Mbps | Proxy làm chậm (bình thường) |
| **YouTube 4K** | Giật lag | Mượt | Vượt throttling ✅ |
| **Gaming quốc tế** | Ping 200ms | Ping 80ms | Giảm ping ✅ |

---

## 🚀 CÁCH TĂNG TỐC ĐỘ 5G THỰC SỰ

### 1. Kiểm tra gói cước
```bash
# Gọi: *098#
# Kiểm tra gói 5G đã kích hoạt chưa
```

**Gói 5G Viettel:**
- 5G149: 12GB/ngày - 149k/tháng
- 5G249: 20GB/ngày - 249k/tháng  
- 5G299: Không giới hạn - 299k/tháng

### 2. Kiểm tra vị trí sóng

**Tốt:** 
- Gần cửa sổ tầng cao
- Khu vực trung tâm thành phố
- Icon 5G hiển thị rõ ràng

**Kém:**
- Tầng hầm, thang máy
- Trong nhà kín
- Khu vực xa trạm phát

### 3. Cài đặt điện thoại

```
Settings → Mobile Network:
✅ Preferred Network Type: 5G/LTE/3G/2G (Auto)
✅ Data Roaming: Off
✅ VoLTE: On
✅ Carrier Aggregation: On (nếu có)
```

### 4. Khởi động lại mạng

```
1. Settings → Network
2. Toggle Airplane mode: On → Off
3. Hoặc reboot điện thoại
```

### 5. Kiểm tra băng tần 5G

**Viettel 5G sử dụng:**
- n78 (3500 MHz) - Phổ biến nhất
- n41 (2600 MHz)

**Kiểm tra điện thoại có hỗ trợ:**
- Settings → About Phone → Status → SIM Status
- Hoặc dùng app: **Network Cell Info**

---

## 🎯 KHI NÀO DÙNG XRAY?

### ✅ Dùng Xray khi:

1. **YouTube, Netflix quốc tế giật, chậm**
   - Nhà mạng throttle video streaming
   - Xray giúp vượt giới hạn

2. **Facebook, Instagram load ảnh/video chậm**
   - CDN quốc tế bị chặn
   - Xray giúp bypass

3. **Gaming quốc tế ping cao**
   - Route mạng không tối ưu
   - Xray giúp giảm ping

4. **Website quốc tế bị chặn**
   - Firewall nhà mạng
   - Xray giúp vượt tường lửa

### ❌ KHÔNG dùng Xray khi:

1. **Speedtest** - Test băng thông gốc
2. **Download file từ server VN** - Chậm hơn
3. **Truy cập website VN** - Không cần thiết
4. **Xem video VN (VTV, FPT Play)** - Chậm hơn

---

## 📊 SO SÁNH TỐC ĐỘ

### Tình huống 1: YouTube 4K

```
KHÔNG dùng Xray:
- Tốc độ: 31 Mbps
- Kết quả: Video giật, buffer liên tục
- Lý do: Viettel throttle YouTube

✅ DÙNG Xray:
- Tốc độ: 25 Mbps (chậm hơn một chút)
- Kết quả: Video mượt, không buffer
- Lý do: Vượt throttling, route tốt hơn
```

### Tình huống 2: Download file

```
KHÔNG dùng Xray:
- Tốc độ: 31 Mbps
- Server: Fshare, Google Drive VN

❌ DÙNG Xray:
- Tốc độ: 20 Mbps (chậm hơn)
- Lý do: Thêm hop qua VPS
```

---

## 🔧 TỐI ƯU XRAY CHO TỐC ĐỘ TỐI ĐA

### 1. Routing thông minh trong v2rayNG

```
Settings → Routing Settings:
✅ Mode: "Bypass mainland"
   → Chỉ route traffic quốc tế
   → Traffic VN đi trực tiếp
```

### 2. Tắt Mux

```
Settings:
❌ Enable Mux: OFF
   → Giảm overhead
   → Tốc độ nhanh hơn
```

### 3. Chọn DNS tốt

```
Settings → DNS:
✅ DNS: 1.1.1.1 hoặc 8.8.8.8
```

### 4. Tối ưu VPS (chạy trên server)

```bash
ssh -i ~/.ssh/id_rsa duongng_dn@34.1.141.233
sudo bash optimize-vps.sh
```

---

## 🎯 KẾT LUẬN

### Tốc độ 31 Mbps trên 5G Viettel là YẾU

**Cách khắc phục:**
1. ✅ Kiểm tra gói cước (gọi *098#)
2. ✅ Đổi vị trí có sóng tốt hơn
3. ✅ Khởi động lại mạng
4. ✅ Kiểm tra thiết bị hỗ trợ 5G đúng băng tần

### Xray VPS giúp gì?

✅ **Vượt throttling** của nhà mạng cho YouTube, Netflix
✅ **Ổn định kết nối** quốc tế
✅ **Giảm ping** gaming

❌ **KHÔNG tăng băng thông gốc** của SIM

---

## 📞 Liên hệ Viettel

```
Hotline: 18008098
Hoặc đến cửa hàng Viettel để:
- Kiểm tra SIM 5G
- Kích hoạt gói 5G đúng
- Test tốc độ tại chỗ
```

---

**🎯 Mục tiêu:** 5G Viettel nên đạt **100-400 Mbps** ở vị trí tốt!

