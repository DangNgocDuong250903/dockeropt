# 🚀 Multi-VM Quick Start Guide

Hướng dẫn triển khai hệ thống Multi-VM Management System trong 30 phút.

---

## 📋 Kiến trúc hệ thống

```
┌──────────────────────────────────────────┐
│      CENTRAL DASHBOARD (Main Server)     │
│      - Multi-VM Management               │
│      - Load Balancing                    │
│      - Health Monitoring                 │
│      - Auto Failover                     │
│      http://main-server-ip:8080          │
└──────────────┬───────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │           │
    ▼          ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐
│  VM 1  │ │  VM 2  │ │  VM 3  │
│  Xray  │ │  Xray  │ │  Xray  │
│  Agent │ │  Agent │ │  Agent │
└────────┘ └────────┘ └────────┘
```

---

## 🎯 BƯỚC 1: Setup Central Dashboard (Main Server)

### 1.1. SSH vào Main Server

```bash
ssh -i ~/.ssh/id_rsa user@MAIN_SERVER_IP
```

### 1.2. Upload files

**Từ máy local (Windows PowerShell):**
```powershell
scp -r C:\Users\NgocDuong\Downloads\AUTO\* user@MAIN_SERVER_IP:~/
```

### 1.3. Chạy setup script

```bash
cd ~/AUTO
chmod +x setup/setup-multi-vm-system.sh
sudo bash setup/setup-multi-vm-system.sh
```

**Script sẽ tự động:**
- ✅ Cài đặt dependencies (Python, Flask, SQLite...)
- ✅ Tạo databases
- ✅ Cài đặt 4 systemd services
- ✅ Start dashboard trên port 8080
- ✅ Tạo CLI tool `vm-manager`

### 1.4. Truy cập Dashboard

```
URL: http://YOUR_MAIN_SERVER_IP:8080
Login: Ngocduong2509
Password: Ngocduong2509
```

---

## 🖥️ BƯỚC 2: Setup VM Servers (Xray Agents)

### 2.1. Tạo VMs trên Google Cloud

```bash
# Tạo 3 VMs ở các regions khác nhau
gcloud compute instances create hk-server-1 \
  --zone=asia-east2-a \
  --machine-type=e2-micro \
  --image-family=debian-11 \
  --image-project=debian-cloud

gcloud compute instances create sg-server-1 \
  --zone=asia-southeast1-a \
  --machine-type=e2-micro \
  --image-family=debian-11 \
  --image-project=debian-cloud

gcloud compute instances create jp-server-1 \
  --zone=asia-northeast1-a \
  --machine-type=e2-micro \
  --image-family=debian-11 \
  --image-project=debian-cloud
```

### 2.2. Mở firewall

```bash
gcloud compute firewall-rules create allow-xray-multi \
  --allow tcp:22,tcp:443,tcp:8081 \
  --description "Allow SSH, Xray, and Agent"
```

### 2.3. Cài Xray trên mỗi VM

**SSH vào VM:**
```bash
ssh -i ~/.ssh/id_rsa root@VM_IP
```

**Chạy cài đặt:**
```bash
# Install Xray
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install

# Enable service
systemctl enable xray

# Create directories
mkdir -p /var/log/xray
mkdir -p /opt/xray-monitor
```

### 2.4. Deploy Xray Agent lên VM

**Từ Main Server:**
```bash
# Copy agent files
scp /opt/xray-monitor/xray-agent.py root@VM_IP:/opt/xray-monitor/
scp ~/AUTO/monitoring/setup-xray-agent.sh root@VM_IP:~/
```

**SSH vào VM và setup:**
```bash
ssh root@VM_IP

# Edit service file to set CENTRAL_DASHBOARD_URL
nano /etc/systemd/system/xray-agent.service
# Set: Environment="CENTRAL_DASHBOARD_URL=http://MAIN_SERVER_IP:8080"
# Set: Environment="AGENT_TOKEN=your-secret-token"

# Run setup
bash setup-xray-agent.sh
```

**Verify agent:**
```bash
systemctl status xray-agent
curl http://localhost:8081/api/ping
```

---

## 📡 BƯỚC 3: Add Servers vào Central Dashboard

### 3.1. Qua Web UI

1. Truy cập: `http://MAIN_SERVER_IP:8080/servers`
2. Click **"Add New Server"**
3. Nhập thông tin:
   - Name: `HK-Server-1`
   - IP: `35.200.x.x`
   - Region: `Hong Kong`
   - SSH User: `root`
   - SSH Key Path: `~/.ssh/id_rsa`
4. Click **"Add Server"**

### 3.2. Hoặc qua CLI

```bash
vm-manager servers add \
  --name HK-Server-1 \
  --ip 35.200.x.x \
  --region "Hong Kong"

vm-manager servers add \
  --name SG-Server-1 \
  --ip 34.150.x.x \
  --region "Singapore"

vm-manager servers add \
  --name JP-Server-1 \
  --ip 35.243.x.x \
  --region "Japan"
```

### 3.3. Verify

```bash
# List servers
vm-manager servers list

# Health check
vm-manager servers health --all
```

---

## 👥 BƯỚC 4: Tạo Users (Auto-Assigned)

### 4.1. Qua Web UI

1. Vào `/users`
2. Click **"Add New User"**
3. Nhập:
   - Username: `user1`
   - Email: `user1@example.com`
   - Traffic Limit: `10737418240` (10GB)
   - Device Limit: `3`
4. Click **"Add User"**

**User sẽ tự động được assign vào server tối ưu!**

### 4.2. Qua API

```python
import requests

response = requests.post(
    'http://MAIN_SERVER_IP:8080/api/users/add',
    json={
        'username': 'user1',
        'email': 'user1@example.com',
        'traffic_limit': 10737418240,  # 10GB
        'device_limit': 3
    },
    auth=('Ngocduong2509', 'Ngocduong2509')
)

print(response.json())
```

---

## 🔄 BƯỚC 5: Load Balancing Configuration

### 5.1. Cấu hình strategy

```bash
# Xem config hiện tại
vm-manager loadbalancer --show

# Đổi strategy
vm-manager loadbalancer --strategy least-connections

# Enable auto-failover
vm-manager loadbalancer --auto-failover 1
```

### 5.2. Các strategies

| Strategy | Mô tả |
|----------|-------|
| `round-robin` | Luân phiên tuần tự |
| `least-connections` | Server ít users nhất |
| `weighted-random` | Dựa trên weight |
| `load-based` | Dựa trên CPU/RAM/Users |
| `geo-based` | Dựa trên vị trí user |

---

## 📊 BƯỚC 6: Monitoring & Management

### 6.1. Dashboard Pages

```
http://MAIN_SERVER_IP:8080/          → Main Dashboard
http://MAIN_SERVER_IP:8080/servers   → Servers Management
http://MAIN_SERVER_IP:8080/users     → Users Management
http://MAIN_SERVER_IP:8080/health    → Health Monitor
http://MAIN_SERVER_IP:8080/logs      → System Logs
```

### 6.2. CLI Commands

```bash
# Servers
vm-manager servers list
vm-manager servers health --all
vm-manager servers delete <id>

# Users
vm-manager users assign --user-id 1 --uuid xxx --username test
vm-manager users migrate <user_id> <to_server_id>

# Traffic
vm-manager traffic collect
vm-manager traffic top --limit 10

# Failover
vm-manager failover <server_id>
```

### 6.3. Systemd Services

```bash
# Check status
systemctl status monitoring-dashboard
systemctl status health-monitor
systemctl status traffic-aggregator
systemctl status connection-monitor

# View logs
journalctl -u monitoring-dashboard -f
journalctl -u health-monitor -f
journalctl -u traffic-aggregator -f

# Restart
systemctl restart monitoring-dashboard
```

---

## 🔧 BƯỚC 7: Testing

### 7.1. Test Load Balancing

**Tạo nhiều users:**
```bash
for i in {1..10}; do
  curl -X POST http://MAIN_SERVER_IP:8080/api/users/add \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"test$i\", \"email\":\"test$i@example.com\"}" \
    -u Ngocduong2509:Ngocduong2509
done
```

**Kiểm tra distribution:**
```bash
vm-manager servers list
```

Bạn sẽ thấy users được phân bố đều trên các servers!

### 7.2. Test Health Monitoring

**Tắt 1 VM:**
```bash
ssh root@VM1_IP "systemctl stop xray"
```

**Chờ ~2 phút**, health monitor sẽ:
- ✅ Detect server DOWN
- ✅ Mark server as DOWN
- ✅ Trigger alert (nếu configured)

**Verify:**
```bash
vm-manager servers list
# Server sẽ hiện status "down"
```

### 7.3. Test Auto Failover

**Enable auto-failover:**
```bash
vm-manager loadbalancer --auto-failover 1
```

**Khi server down, failover sẽ tự động:**
1. Backup config
2. Migrate users sang servers khác
3. Log failover event

**Check logs:**
```bash
journalctl -u health-monitor -f
tail -f /var/log/xray/failover.log
```

---

## 🎉 HOÀN TẤT!

Bạn đã có hệ thống Multi-VM hoàn chỉnh với:

✅ **Central Dashboard** quản lý tất cả  
✅ **Load Balancing** tự động  
✅ **Health Monitoring** 24/7  
✅ **Auto Failover** khi server down  
✅ **Traffic Aggregation** từ tất cả VMs  
✅ **CLI Tool** mạnh mẽ  

---

## 📖 Tài liệu thêm

- [API Documentation](API-DOCS.md)
- [Traffic Tracking Guide](TRAFFIC-TRACKING-GUIDE.md)
- [Troubleshooting](../README.md#troubleshooting)

---

## 🔒 Security Notes

1. **Đổi password mặc định** trong dashboard
2. **Setup firewall** rules chặt chẽ
3. **Sử dụng SSH keys** thay vì passwords
4. **Enable HTTPS** cho dashboard (optional)
5. **Backup database** định kỳ:
   ```bash
   cp /opt/vpn-business/servers.db /backup/servers_$(date +%Y%m%d).db
   ```

---

**Made with ❤️ - Multi-VM Management System**

