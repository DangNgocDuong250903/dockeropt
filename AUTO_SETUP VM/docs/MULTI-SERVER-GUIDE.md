# 🌐 MULTI-SERVER MANAGEMENT SYSTEM

## 📚 MỤC LỤC

1. [Tổng quan](#tổng-quan)
2. [Cài đặt](#cài-đặt)
3. [Thêm Server mới](#thêm-server-mới)
4. [Quản lý Users](#quản-lý-users)
5. [Monitoring](#monitoring)

---

## 🎯 TỔNG QUAN

### Kiến trúc:

```
┌─────────────────────────────────────┐
│   CENTRAL SERVER                    │
│   - Dashboard Web                   │
│   - PostgreSQL Database             │
│   - Server Manager API              │
│   IP: <your-central-ip>             │
└─────────────────────────────────────┘
        ↓ SSH/API Control
┌────────────┬────────────┬────────────┐
│  VPS #1    │  VPS #2    │  VPS #3    │
│  HK        │  SG        │  JP        │
│  Xray      │  Xray      │  Xray      │
│  100 users │  100 users │  100 users │
└────────────┴────────────┴────────────┘
```

### Tính năng:

✅ **Quản lý từ 1 dashboard duy nhất**
✅ **Tự động phân phối users**
✅ **Load balancing**
✅ **Health monitoring**
✅ **Auto-sync config**
✅ **Traffic tracking tập trung**

---

## 📦 CÀI ĐẶT

### Bước 1: Setup Central Server

```bash
# Trên VPS Central (VD: 34.150.92.64)

# Install dependencies
sudo apt update
sudo apt install -y python3 python3-pip git

# Install Python packages
pip3 install flask psutil paramiko

# Clone project
git clone https://github.com/your-repo/vpn-management.git
cd vpn-management

# Init database
python3 server-manager.py
```

### Bước 2: Chuẩn bị SSH Keys

```bash
# Generate SSH key (nếu chưa có)
ssh-keygen -t rsa -b 4096

# Copy public key tới các VPS workers
ssh-copy-id root@<worker-ip>

# Test connection
ssh root@<worker-ip> "echo 'Connected!'"
```

---

## ➕ THÊM SERVER MỚI

### Cách 1: Auto Setup (Khuyến nghị) ⭐

**Chỉ cần 1 lệnh:**

```bash
bash add-server.sh \
  --ip 35.200.100.50 \
  --region "Singapore" \
  --name "SG-Server-1"
```

**Script sẽ tự động:**
1. ✅ Test SSH connection
2. ✅ Install Xray
3. ✅ Configure firewall
4. ✅ Install monitoring tools
5. ✅ Upload scripts
6. ✅ Create basic config
7. ✅ Add to Central database

**Thời gian:** ~3-5 phút

### Cách 2: Manual Setup

```python
from server_manager import ServerManager

sm = ServerManager()

# Add server
result = sm.add_server(
    name="SG-Server-1",
    ip="35.200.100.50",
    region="Singapore",
    ssh_user="root",
    ssh_key_path="~/.ssh/id_rsa"
)

print(result)  # {'success': True, 'server_id': 1}

# Install Xray
sm.install_xray(server_id=1)

# Sync users
users = [
    {'uuid': 'xxx-xxx-xxx', 'username': 'user1'},
    {'uuid': 'yyy-yyy-yyy', 'username': 'user2'},
]
sm.sync_users_to_server(server_id=1, users=users)
```

---

## 👥 QUẢN LÝ USERS

### Auto-assign User vào Server

Khi có user mới, hệ thống **TƯ ĐỘNG** assign vào server ít user nhất:

```python
from server_manager import ServerManager

sm = ServerManager()

# Assign user
result = sm.assign_user_to_server(
    user_id=123,
    user_uuid='5b85a927-5a03-4c93-bec2-cdc5f4b19b18',
    user_name='newuser'
)

print(result)
# {
#     'success': True,
#     'server_id': 2,
#     'server_name': 'SG-Server-1',
#     'server_ip': '35.200.100.50'
# }
```

### Generate Connection Config cho User

```python
# User sẽ nhận được config tự động
# với IP của server được assign

config = {
    'address': result['server_ip'],  # 35.200.100.50
    'port': 443,
    'uuid': 'xxx-xxx-xxx',
    'network': 'tcp'
}
```

---

## 📊 MONITORING

### Health Check Tất Cả Servers

```python
from server_manager import ServerManager

sm = ServerManager()

# Check tất cả servers
sm.health_check_all()

# Output:
# 🏥 Health checking 3 servers...
# 
# 📡 Checking HK-Server-1 (34.150.92.64)...
#   ✅ Ping: OK
#   📊 CPU: 15.2%
#   💾 RAM: 42.1%
#   💿 Disk: 28.5%
#   🔗 Connections: 47
# 
# 📡 Checking SG-Server-1 (35.200.100.50)...
#   ✅ Ping: OK
#   📊 CPU: 8.7%
#   💾 RAM: 35.4%
#   💿 Disk: 31.2%
#   🔗 Connections: 32
```

### Lấy Stats của 1 Server

```python
stats = sm.get_server_stats(server_id=1)

print(stats)
# {
#     'cpu': 15.2,
#     'ram': 42.1,
#     'disk': 28.5,
#     'connections': 47
# }
```

### Liệt kê Tất Cả Servers

```python
servers = sm.get_all_servers()

for s in servers:
    print(f"{s['name']}: {s['current_users']}/{s['max_users']} users ({s['status']})")

# Output:
# HK-Server-1: 47/100 users (active)
# SG-Server-1: 32/100 users (active)
# JP-Server-1: 0/100 users (down)
```

---

## 🔄 WORKFLOW THỰC TẾ

### Khi có User Mới Đăng Ký:

```
1. User đăng ký gói Premium (200GB/tháng)
2. Payment confirmed
3. System tự động:
   - Tạo user trong database
   - Generate UUID
   - Assign vào server ít user nhất
   - Sync config tới server đó
   - Generate QR code với IP server
   - Gửi email cho user
```

### Code Example:

```python
# user-registration.py

from server_manager import ServerManager
from user_manager import UserManager
import uuid

def register_new_user(username, plan='basic'):
    # Create user
    um = UserManager()
    user_uuid = str(uuid.uuid4())
    
    # Traffic limit based on plan
    limits = {
        'basic': 50 * 1024 * 1024 * 1024,     # 50GB
        'premium': 200 * 1024 * 1024 * 1024,  # 200GB
        'unlimited': 0                         # Unlimited
    }
    
    result = um.add_user(
        username=username,
        traffic_limit=limits[plan]
    )
    
    if not result['success']:
        return {'error': 'Failed to create user'}
    
    user_id = result['user_id']
    
    # Assign to server
    sm = ServerManager()
    server_result = sm.assign_user_to_server(
        user_id=user_id,
        user_uuid=user_uuid,
        user_name=username
    )
    
    if not server_result['success']:
        return {'error': 'Failed to assign server'}
    
    # Generate config
    config = {
        'address': server_result['server_ip'],
        'port': 443,
        'uuid': user_uuid,
        'network': 'tcp'
    }
    
    # Generate VMess link
    vmess_link = generate_vmess_link(config)
    
    # Send email
    send_welcome_email(username, vmess_link)
    
    return {
        'success': True,
        'server': server_result['server_name'],
        'config': vmess_link
    }

# Usage
result = register_new_user('john_doe', plan='premium')
print(result)
```

---

## 🚀 SCALING

### Khi cần thêm capacity:

```bash
# Mua VPS mới
# VD: DigitalOcean Singapore - $5/month

# Add vào hệ thống (1 lệnh)
bash add-server.sh \
  --ip 159.223.45.67 \
  --region "Singapore" \
  --name "SG-Server-2"

# DONE! 
# Hệ thống tự động phân phối users mới vào server này
```

### Load Balancing Strategy:

```
Server 1: 95/100 users (95%) → Gần full
Server 2: 80/100 users (80%) → OK
Server 3: 30/100 users (30%) → Plenty space

User mới → Tự động assign vào Server 3
```

---

## 💰 CHI PHÍ VẬN HÀNH

### Example với 300 users:

```
VPS Specs (khuyến nghị):
- 2 CPU cores
- 4GB RAM
- 100GB SSD
- 4TB bandwidth

Cost per VPS: $10-20/month

Math:
- 300 users / 100 users per VPS = 3 VPS
- 3 VPS × $15 = $45/month

Revenue (nếu bán $5/user/month):
- 300 users × $5 = $1,500/month

Profit:
- $1,500 - $45 = $1,455/month 💰
```

---

## 🔧 TROUBLESHOOTING

### Server Down?

```python
# Auto-detect và chuyển users sang server khác

def handle_server_down(server_id):
    sm = ServerManager()
    
    # Get users on down server
    users = get_users_on_server(server_id)
    
    # Reassign to other servers
    for user in users:
        sm.assign_user_to_server(
            user_id=user['id'],
            user_uuid=user['uuid'],
            user_name=user['username']
        )
    
    # Notify users về config mới
    notify_users_config_changed(users)
```

### Server Overload?

```python
# Auto-add server mới khi CPU/RAM cao

def auto_scale():
    servers = sm.get_all_servers()
    
    for server in servers:
        stats = sm.get_server_stats(server['id'])
        
        if stats['cpu'] > 80 or stats['ram'] > 80:
            # Alert admin to add more servers
            send_alert(f"Server {server['name']} is overloaded!")
```

---

## 📝 SUMMARY

### Quy Trình Hoàn Chỉnh:

```
1. Setup Central Server (1 lần)
   └─ Install dependencies, init database

2. Add Workers (mỗi khi cần scale)
   └─ bash add-server.sh --ip X --region Y --name Z
   
3. Register Users (tự động)
   └─ User pays → System assigns server → Send config

4. Monitor (tự động)
   └─ Health checks every 5 minutes
   └─ Alert if server down
   └─ Auto-reassign users if needed

5. Scale (khi cần)
   └─ Add more servers
   └─ System auto-balance load
```

### Thời Gian Setup:

- Central Server: **30 phút** (1 lần)
- Mỗi Worker Server: **5 phút** (tự động)
- Total cho 3 servers: **~45 phút**

---

## ✅ DONE!

Bây giờ bạn có hệ thống quản lý **NHIỀU VPS** chỉ từ **1 DASHBOARD**!

**Questions?** Check code hoặc hỏi tôi! 🚀

