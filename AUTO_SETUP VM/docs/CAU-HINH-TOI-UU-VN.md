# ⚡ CẤU HÌNH TỐI ƯU XRAY CHO VIỆT NAM

## 🎯 MUC TIÊU:
- ✅ Traffic VN (YouTube VN, Facebook VN, Zalo...) → Đi thẳng (nhanh)
- ✅ Traffic quốc tế (YouTube US, Netflix, Gaming...) → Qua VPS (vượt throttling)

---

## 📱 CÀI ĐẶT TRONG v2rayNG

### Bước 1: Routing Settings (QUAN TRỌNG!)

```
1. Mở app v2rayNG
2. Nhấn menu ☰ (góc trên trái)
3. Chọn "Settings"
4. Chọn "Routing Settings"
```

### Bước 2: Cấu hình Routing

```
✅ Predefined Rule: "Bypass mainland China & VN"
✅ Domain Strategy: "IPIfNonMatch"
✅ Enable Local DNS: ON
```

### Bước 3: Custom Routing (Tối ưu VN)

```
1. Routing Settings → Custom Rules
2. Add Rule:

Rule 1 - Bypass VN IPs:
{
  "type": "field",
  "outboundTag": "direct",
  "ip": [
    "geoip:vn",
    "1.0.0.0/8",
    "14.0.0.0/8",
    "27.0.0.0/8",
    "42.0.0.0/8",
    "113.0.0.0/8",
    "115.0.0.0/8",
    "116.0.0.0/8",
    "118.0.0.0/8",
    "123.0.0.0/8",
    "171.0.0.0/8"
  ]
}

Rule 2 - Bypass VN Domains:
{
  "type": "field",
  "outboundTag": "direct",
  "domain": [
    "geosite:vn",
    "domain:vn",
    "domain:zalo.me",
    "domain:zadn.vn",
    "domain:fpt.vn",
    "domain:vnexpress.net",
    "domain:vtv.vn",
    "domain:zing.vn",
    "domain:shopee.vn",
    "domain:tiki.vn",
    "domain:lazada.vn"
  ]
}
```

---

## 🚀 CẤU HÌNH ĐƠN GIẢN (Dễ nhất)

### Option 1: Bypass Mainland (Đơn giản)

```
Settings → Routing Settings:
✅ Predefined Rule: "Bypass mainland China"
   → Traffic VN/CN đi thẳng
   → Traffic quốc tế qua VPS
```

**Ưu điểm:**
- ✅ Không cần config phức tạp
- ✅ Tự động phát hiện IP VN
- ✅ Tốc độ tối ưu

**Website VN sẽ đi thẳng:**
- Zalo, VNExpress, VTV, Zing
- Shopee, Tiki, Lazada
- FPT Play, VieON
- **→ Tốc độ tối đa 31 Mbps**

**Website quốc tế qua VPS:**
- YouTube, Netflix, Facebook
- Google, Twitter, Reddit
- Gaming quốc tế
- **→ Vượt throttling nhà mạng**

---

## 🔧 CẤU HÌNH NÂNG CAO

### DNS Settings

```
Settings → DNS:
✅ Enable Local DNS: ON
✅ DNS Server: 1.1.1.1
✅ Fallback DNS: 8.8.8.8
```

### Per-App Proxy

**Chỉ cho MỘT SỐ app dùng proxy:**

```
Settings → Per-App Proxy:
✅ YouTube (quốc tế)
✅ Netflix
✅ Instagram
✅ Twitter/X
✅ Reddit
✅ Gaming apps quốc tế

❌ Zalo (VN)
❌ Shopee, Tiki (VN)
❌ VNExpress, VTV (VN)
❌ FPT Play (VN)
```

**Kết quả:**
- Apps VN: Dùng mạng trực tiếp (nhanh)
- Apps quốc tế: Qua VPS (vượt throttling)

---

## 📊 SO SÁNH TỐC ĐỘ

### TRƯỚC KHI tối ưu:
```
Tất cả traffic qua VPS:
- YouTube VN: 25 Mbps (chậm)
- Shopee VN: 20 Mbps (chậm)
- Zalo: 15 Mbps (chậm)
- YouTube US: 25 Mbps (ổn)
```

### SAU KHI tối ưu:
```
Traffic VN đi thẳng, quốc tế qua VPS:
- YouTube VN: 31 Mbps ✅ (nhanh nhất)
- Shopee VN: 31 Mbps ✅ (nhanh nhất)
- Zalo: 31 Mbps ✅ (nhanh nhất)
- YouTube US: 25 Mbps ✅ (vượt throttling)
```

---

## 🎯 KIỂM TRA CẤU HÌNH

### Test 1: Website VN (phải đi thẳng)

```
1. Bật v2rayNG
2. Mở Chrome → vnexpress.net
3. Check IP: http://checkip.vn
   → Phải hiện IP Viettel (KHÔNG phải VPS)
```

### Test 2: Website quốc tế (qua VPS)

```
1. Bật v2rayNG
2. Mở Chrome → youtube.com
3. Check IP: https://ifconfig.me
   → Phải hiện IP: 34.1.141.233 (VPS)
```

### Test 3: Tốc độ

```
1. Tắt v2rayNG → Speedtest → Ghi lại
2. Bật v2rayNG (với routing tối ưu)
3. Speedtest server VN → Phải BẰNG tốc độ bước 1
```

---

## 🚀 TỐI ƯU THÊM TRÊN VPS

### Nếu muốn tăng tốc độ VPS → VN:

**Chạy trên VPS (đã cài sẵng):**
```bash
ssh -i ~/.ssh/id_rsa duongng_dn@34.1.141.233
sudo bash optimize-vps.sh
```

**Script sẽ bật:**
- ✅ BBR (Google TCP congestion control)
- ✅ TCP Fast Open
- ✅ MTU Probing
- ✅ Network buffer optimization

---

## 💡 GIẢI PHÁP CHO TỐC ĐỘ CAO NHẤT

### Option A: Dùng VPS trong nước (Đắt hơn)

**Ưu điểm:**
- ✅ Ping thấp (5-10ms)
- ✅ Tốc độ cao cho traffic VN
- ✅ Kết nối ổn định

**Nhà cung cấp VN:**
- BKNS Cloud (bkns.vn)
- VinaHost (vinahost.vn)
- Inet.vn
- **Chi phí:** ~200-500k/tháng

**Nhược điểm:**
- ❌ Đắt hơn Google Cloud
- ❌ Vẫn không cần thiết cho traffic VN thuần
- ❌ Chỉ hữu ích nếu cần CDN/cache

### Option B: Giữ VPS Singapore + Routing thông minh (Khuyến nghị)

**Ưu điểm:**
- ✅ FREE (Google Cloud trial)
- ✅ Traffic VN đi thẳng (không qua VPS)
- ✅ Traffic quốc tế qua VPS (vượt throttling)
- ✅ Cân bằng tốc độ & chi phí

**Setup:**
```
1. Cấu hình "Bypass mainland" trong v2rayNG
2. Traffic VN tự động đi thẳng
3. Done!
```

---

## 📱 CẤU HÌNH NHANH (Copy & Paste)

### File config tối ưu cho v2rayNG:

```json
{
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      {
        "type": "field",
        "outboundTag": "direct",
        "domain": [
          "geosite:vn",
          "domain:vn"
        ]
      },
      {
        "type": "field",
        "outboundTag": "direct",
        "ip": [
          "geoip:vn",
          "geoip:private"
        ]
      }
    ]
  }
}
```

**Cách import:**
1. Copy đoạn trên
2. v2rayNG → Settings → Custom Config
3. Paste → Save

---

## 🎯 KẾT LUẬN

### Để TỐI ƯU cho Việt Nam:

✅ **Giải pháp TỐT NHẤT:**
- Cấu hình "Bypass mainland" trong v2rayNG
- Traffic VN đi thẳng (31 Mbps)
- Traffic quốc tế qua VPS (vượt throttling)

✅ **KHÔNG cần:**
- ❌ VPS trong nước (đắt, không cần thiết)
- ❌ Thay đổi VPS hiện tại
- ❌ Cài thêm tool gì

✅ **Chỉ cần:**
- Bật "Bypass mainland" trong v2rayNG
- Done! 🎉

---

## 📞 TÓM TẮT NHANH

```
Mục tiêu: Traffic VN nhanh, quốc tế vượt throttling

Giải pháp:
1. v2rayNG → Settings → Routing Settings
2. Chọn: "Bypass mainland China"
3. Domain Strategy: "IPIfNonMatch"
4. Save → Reconnect

Kết quả:
✅ Zalo, Shopee, VNExpress: 31 Mbps (đi thẳng)
✅ YouTube, Netflix, Gaming: 25 Mbps (qua VPS, vượt throttling)
```

**→ Đây là cấu hình TỐI ƯU nhất cho người VN!** 🇻🇳

