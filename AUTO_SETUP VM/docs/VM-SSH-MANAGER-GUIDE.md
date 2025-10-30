# 🚀 VM SSH Manager - Hướng dẫn sử dụng

Công cụ quản lý kết nối SSH đến các VM với giao diện CLI đẹp. **Không cần cấu hình lại khi chuyển máy!**

---

## ✨ Tính năng

- ✅ **Quản lý nhiều VMs** - Lưu thông tin tất cả VMs trong 1 file config
- ✅ **Kết nối nhanh** - Kết nối SSH chỉ với 1 lệnh
- ✅ **Menu interactive** - Giao diện đẹp, dễ sử dụng
- ✅ **Test connection** - Kiểm tra kết nối trước khi SSH
- ✅ **Export/Import** - Dễ dàng chuyển config giữa các máy
- ✅ **Multi-profile** - Hỗ trợ nhiều profiles (công ty, cá nhân...)
- ✅ **Cross-platform** - Windows, Linux, Mac

---

## 📦 Cài đặt

### Windows (PowerShell)

```powershell
# 1. Di chuyển đến thư mục project
cd D:\AUTO

# 2. Chạy setup script
.\setup-vm-manager.ps1
```

### Linux/Mac (Bash)

```bash
# 1. Di chuyển đến thư mục project
cd ~/AUTO

# 2. Chạy setup script
chmod +x setup-vm-manager.sh
./setup-vm-manager.sh

# 3. Load alias
source ~/.bashrc  # hoặc ~/.zshrc
```

---

## 🎯 Quick Start

### 1️⃣ Khởi tạo lần đầu

```bash
# Windows
.\vm.bat init

# Linux/Mac
vm init
```

Config sẽ được lưu tại: `~/.xray-vm-manager/config.json`

### 2️⃣ Thêm VM đầu tiên

**Cách 1: Interactive**
```bash
vm add
```
Sau đó nhập thông tin theo prompt.

**Cách 2: One-line**
```bash
vm add --name hk-server-1 \
       --host 34.150.92.64 \
       --user root \
       --key ~/.ssh/id_rsa \
       --desc "Hong Kong Server 1"
```

### 3️⃣ Xem danh sách VMs

```bash
vm list
```

Output:
```
┌───┬─────────────┬──────────────┬──────┬──────┬───────────────────┬─────────────────────┐
│ # │ Tên         │ Host         │ User │ Port │ SSH Key           │ Mô tả               │
├───┼─────────────┼──────────────┼──────┼──────┼───────────────────┼─────────────────────┤
│ 1 │ hk-server-1 │ 34.150.92.64 │ root │  22  │ .../.ssh/id_rsa   │ Hong Kong Server 1  │
│ 2 │ sg-server-1 │ 35.200.10.20 │ root │  22  │ .../.ssh/id_rsa   │ Singapore Server 1  │
└───┴─────────────┴──────────────┴──────┴──────┴───────────────────┴─────────────────────┘
```

### 4️⃣ Kết nối đến VM

**Theo số thứ tự:**
```bash
vm connect 1
```

**Theo tên:**
```bash
vm connect hk-server-1
```

### 5️⃣ Test kết nối

```bash
vm test 1
# hoặc
vm test hk-server-1
```

---

## 📚 Commands đầy đủ

### `vm init`
Khởi tạo config lần đầu

```bash
vm init
```

### `vm add`
Thêm VM mới

```bash
# Interactive
vm add

# With options
vm add --name <name> \
       --host <ip> \
       --user <user> \
       --port <port> \
       --key <ssh_key_path> \
       --desc <description>
```

**Options:**
- `-n, --name`: Tên VM (bắt buộc)
- `-h, --host`: IP hoặc hostname (bắt buộc)
- `-u, --user`: SSH username (mặc định: root)
- `-p, --port`: SSH port (mặc định: 22)
- `-k, --key`: Đường dẫn SSH private key
- `-d, --desc`: Mô tả VM

**Ví dụ:**
```bash
vm add -n hk-server-1 \
       -h 34.150.92.64 \
       -u root \
       -k ~/.ssh/id_rsa \
       -d "Hong Kong Production Server"
```

### `vm list`
Liệt kê tất cả VMs

```bash
vm list
```

### `vm connect`
Kết nối SSH đến VM

```bash
# Theo số thứ tự
vm connect 1

# Theo tên
vm connect hk-server-1
```

### `vm test`
Test kết nối SSH

```bash
vm test 1
# hoặc
vm test hk-server-1
```

### `vm remove`
Xóa VM khỏi danh sách

```bash
vm remove hk-server-1
```

### `vm export`
Export config ra file

```bash
vm export my-vms-config.json
```

### `vm import`
Import config từ file

```bash
vm import my-vms-config.json
```

**Lưu ý:** Config cũ sẽ được backup tự động.

### `vm menu`
Mở menu interactive

```bash
vm menu
```

Menu bao gồm:
1. Xem danh sách VMs
2. Kết nối đến VM
3. Thêm VM mới
4. Xóa VM
5. Test kết nối
6. Export config
7. Import config
0. Thoát

### `vm info`
Xem thông tin config

```bash
vm info
```

---

## 🔄 Workflow chuyển máy

### Máy cũ (Export)

```bash
# 1. Export config hiện tại
vm export my-vms.json

# 2. Copy file my-vms.json sang máy mới
# Có thể dùng USB, email, cloud storage...
```

### Máy mới (Import)

```bash
# 1. Cài đặt VM Manager
.\setup-vm-manager.ps1  # Windows
# hoặc
./setup-vm-manager.sh   # Linux/Mac

# 2. Import config
vm import my-vms.json

# 3. Xem danh sách
vm list

# 4. Kết nối!
vm connect 1
```

**Chỉ mất 2 phút!** ⚡

---

## 📂 Cấu trúc Config

Config được lưu tại: `~/.xray-vm-manager/config.json`

```json
{
  "version": "1.0",
  "created_at": "2025-10-29T10:00:00",
  "current_profile": "default",
  "profiles": {
    "default": {
      "name": "Default Profile",
      "vms": [
        {
          "name": "hk-server-1",
          "host": "34.150.92.64",
          "user": "root",
          "port": 22,
          "ssh_key_path": "~/.ssh/id_rsa",
          "description": "Hong Kong Server 1",
          "added_at": "2025-10-29T10:01:00",
          "last_connected": "2025-10-29T15:30:00"
        }
      ]
    }
  }
}
```

---

## 🔐 Quản lý SSH Keys

### Copy SSH key sang máy mới

**Windows:**
```powershell
# Copy từ máy cũ
Copy-Item $env:USERPROFILE\.ssh\id_rsa D:\backup\

# Paste sang máy mới
Copy-Item D:\backup\id_rsa $env:USERPROFILE\.ssh\
```

**Linux/Mac:**
```bash
# Copy từ máy cũ
cp ~/.ssh/id_rsa ~/backup/

# Paste sang máy mới
cp ~/backup/id_rsa ~/.ssh/
chmod 600 ~/.ssh/id_rsa
```

### Hoặc dùng password thay vì SSH key

Khi thêm VM, bỏ qua SSH key:
```bash
vm add --name test-vm --host 1.2.3.4 --user root
# Không điền --key
```

Khi connect sẽ được hỏi password.

---

## 💡 Tips & Tricks

### 1. Đặt alias ngắn hơn

**Windows:** Tạo file `v.bat`:
```batch
@echo off
python D:\AUTO\vm-ssh-manager.py %*
```

**Linux/Mac:** Thêm vào `~/.bashrc`:
```bash
alias v='vm'
```

Giờ có thể dùng:
```bash
v list
v connect 1
```

### 2. Tổ chức VMs theo region

Đặt tên có prefix:
- `hk-server-1`, `hk-server-2` (Hong Kong)
- `sg-server-1`, `sg-server-2` (Singapore)
- `jp-server-1`, `jp-server-2` (Japan)

### 3. Backup config định kỳ

```bash
# Tự động backup mỗi tuần
vm export backup-$(date +%Y%m%d).json
```

### 4. Sync config qua Git

```bash
# Tạo Git repo cho config
cd ~/.xray-vm-manager
git init
git add config.json
git commit -m "Initial config"
git remote add origin <your-private-repo>
git push

# Máy mới: Clone về
git clone <your-private-repo> ~/.xray-vm-manager
```

**⚠️ Lưu ý bảo mật:** Dùng private repo!

---

## 🔧 Troubleshooting

### ❌ Lỗi: `ModuleNotFoundError: No module named 'click'`

**Giải pháp:**
```bash
pip install -r requirements-vm-manager.txt
```

### ❌ Lỗi: `Permission denied (publickey)`

**Nguyên nhân:** SSH key không đúng hoặc không có quyền.

**Giải pháp:**
1. Kiểm tra đường dẫn SSH key:
```bash
vm list  # Xem đường dẫn key
ls -la ~/.ssh/id_rsa  # Check file tồn tại
```

2. Set quyền đúng (Linux/Mac):
```bash
chmod 600 ~/.ssh/id_rsa
```

3. Test key thủ công:
```bash
ssh -i ~/.ssh/id_rsa user@host
```

### ❌ Lỗi: `Connection timed out`

**Nguyên nhân:** Firewall hoặc VM đang down.

**Giải pháp:**
1. Ping test:
```bash
ping <vm-ip>
```

2. Check firewall:
```bash
# Google Cloud
gcloud compute firewall-rules list
```

3. Check VM status:
```bash
# Google Cloud
gcloud compute instances list
```

### ❌ Lỗi: Config file bị lỗi

**Giải pháp:**
```bash
# Backup file hiện tại
cp ~/.xray-vm-manager/config.json ~/.xray-vm-manager/config.json.backup

# Reset config
vm init
```

---

## 🔄 Update

### Cập nhật code mới nhất

```bash
# Pull code mới
cd D:\AUTO
git pull

# Reinstall dependencies (nếu có thay đổi)
pip install -r requirements-vm-manager.txt --upgrade
```

Config của bạn sẽ **KHÔNG** bị ảnh hưởng (lưu ở `~/.xray-vm-manager/`).

---

## 📖 Use Cases

### Use Case 1: Dev có nhiều VMs test

```bash
# Thêm VMs
vm add -n dev-hk -h 1.2.3.4 -u dev -d "Dev Hong Kong"
vm add -n dev-sg -h 5.6.7.8 -u dev -d "Dev Singapore"
vm add -n staging -h 9.10.11.12 -u ubuntu -d "Staging Server"

# Kết nối nhanh
vm connect dev-hk
vm connect staging
```

### Use Case 2: Sysadmin quản lý production servers

```bash
# Thêm production VMs
vm add -n prod-web-1 -h 10.0.1.10 -u admin -d "Production Web 1"
vm add -n prod-web-2 -h 10.0.1.11 -u admin -d "Production Web 2"
vm add -n prod-db -h 10.0.2.10 -u admin -d "Production Database"

# Monitor nhanh
vm connect prod-web-1
vm connect prod-db
```

### Use Case 3: Chuyển máy laptop mới

**Laptop cũ:**
```bash
# Export tất cả VMs
vm export my-work-vms.json

# Copy SSH keys
cp -r ~/.ssh ~/backup/
```

**Laptop mới:**
```bash
# Setup VM Manager
./setup-vm-manager.sh

# Restore SSH keys
cp -r ~/backup/.ssh ~/

# Import VMs
vm import my-work-vms.json

# Done! Tất cả VMs đã sẵn sàng
vm list
```

---

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Docs:** `docs/VM-SSH-MANAGER-GUIDE.md`

---

## 📝 License

MIT License

---

**Made with ❤️ for developers who hate reconfiguring SSH every time!**


