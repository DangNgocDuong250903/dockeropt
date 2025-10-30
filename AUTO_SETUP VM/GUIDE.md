# 📚 AUTO Project - Complete Guide

**All-in-one documentation for AUTO project**

---

## 🚀 Quick Start (5 phút)

### 1. Setup VM SSH Manager
```bash
# Windows
.\setup-vm-manager.ps1

# Linux/Mac
./setup-vm-manager.sh && source ~/.bashrc
```

### 2. Start Script Panel
```bash
python auto.py scripts start
# Open: http://127.0.0.1:5173
```

### 3. Add first VM
```bash
# Option 1: Wizard (easiest)
python auto.py vm wizard

# Option 2: Quick add
python auto.py vm quick-add root@your-server-ip
```

---

## 📖 Table of Contents

1. [AUTO CLI Tool](#auto-cli-tool)
2. [VM SSH Manager](#vm-ssh-manager)
3. [Script Control Panel](#script-control-panel)
4. [Common Workflows](#common-workflows)
5. [Troubleshooting](#troubleshooting)

---

## 🛠️ AUTO CLI Tool

### Overview
Unified CLI cho tất cả tools trong project.

### Commands
```bash
# Project info
auto info
auto docs

# VM management
auto vm list
auto vm quick-add user@host
auto vm wizard
auto vm connect <vm>

# Key management
auto vm key generate
auto vm key list
auto vm key copy <key> user@host

# Batch operations
auto vm batch exec "command" --parallel
auto vm batch deploy script.sh --execute

# Script Panel
auto scripts start
auto scripts list

# Monitoring
auto monitor status
auto monitor dashboard
```

---

## 🖥️ VM SSH Manager

### Quick Commands

```bash
# Add VM (super fast)
vm quick-add root@1.2.3.4
vm quick-add ubuntu@server.com:2222

# Wizard (guided setup)
vm wizard

# Basic operations
vm list
vm connect server-name
vm test server-name
vm remove server-name

# Edit VM
vm edit server-1 --host new-ip --port 2222
vm clone old-vm new-vm
```

### SSH Key Management

```bash
# Generate key
vm key generate                      # RSA 4096
vm key generate --type ed25519       # ED25519
vm key generate --name my-server     # Custom name

# List keys
vm key list

# Copy to server
vm key copy id_rsa root@server.com
```

### Batch Operations

```bash
# Execute on multiple VMs
vm batch exec "uptime" --parallel
vm batch exec "df -h" --pattern "prod-.*"

# Deploy scripts
vm batch deploy setup.sh --execute --parallel
vm batch deploy script.sh --pattern "hk-.*" --dest /opt/
```

### Profiles

```bash
vm profile list
vm profile create production
vm profile switch production
```

---

## 📜 Script Control Panel

### Start Server
```bash
auto scripts start
# or
cd script_panel && python app.py
```

### Features
- ✨ Modern UI with Tailwind CSS
- 🌙 Dark/Light mode
- 📊 Stats dashboard
- 🔍 Advanced search & filter
- 📦 **Deploy to VMs** from web
- 📝 Real-time log viewer

### Deploy from Web
1. Open `http://127.0.0.1:5173`
2. Find your script
3. Click **"Deploy"** button
4. Select target VMs
5. Configure options
6. Click **"Deploy to VMs"**
7. See results!

---

## 🎯 Common Workflows

### Workflow 1: Setup new VPS
```bash
# Step 1: Run wizard
vm wizard

# Answer questions:
# - Connection: root@your-server-ip
# - Generate key: Yes
# - Copy to server: Yes (enter password once)
# - Test: Yes

# Done! Connect:
vm connect 1
```

### Workflow 2: Add multiple servers
```bash
# Generate shared key
vm key generate --name prod-key

# Copy to all servers
vm key copy prod-key root@server1.com
vm key copy prod-key root@server2.com
vm key copy prod-key root@server3.com

# Quick add all
vm quick-add root@server1.com
vm quick-add root@server2.com
vm quick-add root@server3.com

# Deploy to all
vm batch deploy setup.sh --execute --parallel
```

### Workflow 3: Deploy from web UI
```bash
# Start web UI
auto scripts start

# In browser:
# 1. Browse to http://127.0.0.1:5173
# 2. Find script
# 3. Click "Deploy"
# 4. Select VMs
# 5. Click "Deploy to VMs"
```

### Workflow 4: Health check
```bash
vm batch exec "systemctl status xray" --parallel
vm batch exec "df -h && free -m" --parallel > health.txt
```

---

## 🔧 Troubleshooting

### Script Panel won't start
```bash
# Install dependencies
pip install flask paramiko
# or
pip install -r script_panel/requirements.txt
```

### VM connection failed
```bash
# Test connection
vm test server-name

# Check/fix details
vm edit server-name --host correct-ip --port 22

# Regenerate & copy key
vm key generate --name new-key
vm key copy new-key root@server
vm edit server-name --key ~/.xray-vm-manager/ssh_keys/new-key
```

### ssh-keygen not found (Windows)
```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

### Permission denied (publickey)
```bash
# Copy key again
vm key copy your-key root@server

# Or manual:
vm key list  # Get key path
cat ~/.xray-vm-manager/ssh_keys/your-key.pub
# Add to server's ~/.ssh/authorized_keys
```

---

## 📋 Command Reference

### VM Commands
| Command | Description | Example |
|---------|-------------|---------|
| `vm quick-add` | Add VM from connection string | `vm quick-add root@1.2.3.4` |
| `vm wizard` | Interactive setup | `vm wizard` |
| `vm list` | List all VMs | `vm list` |
| `vm connect` | Connect to VM | `vm connect server-1` |
| `vm test` | Test connection | `vm test server-1` |
| `vm edit` | Edit VM config | `vm edit server-1 --port 2222` |
| `vm clone` | Clone VM | `vm clone old new` |

### Key Commands
| Command | Description | Example |
|---------|-------------|---------|
| `vm key generate` | Generate SSH key | `vm key generate --type ed25519` |
| `vm key list` | List keys | `vm key list` |
| `vm key copy` | Copy key to server | `vm key copy id_rsa root@server` |

### Batch Commands
| Command | Description | Example |
|---------|-------------|---------|
| `vm batch exec` | Execute on multiple VMs | `vm batch exec "uptime" -P` |
| `vm batch deploy` | Deploy to multiple VMs | `vm batch deploy setup.sh -x` |

### Script Commands
| Command | Description | Example |
|---------|-------------|---------|
| `auto scripts start` | Start web UI | `auto scripts start --port 5173` |
| `auto scripts list` | List scripts | `auto scripts list --type .py` |

---

## 💡 Tips & Best Practices

### 1. Use wizard for first time
```bash
vm wizard  # Guides you through everything
```

### 2. Quick add for speed
```bash
vm quick-add root@server  # Fastest way
```

### 3. ED25519 keys for new servers
```bash
vm key generate --type ed25519  # Modern & secure
```

### 4. Organize with profiles
```bash
vm profile create production
vm profile create staging
```

### 5. Deploy from web for convenience
```bash
auto scripts start  # Use browser instead of CLI
```

### 6. Batch operations for scale
```bash
vm batch exec "command" --pattern "prod-.*" --parallel
```

---

## 📂 Project Structure

```
AUTO/
├── auto.py                 # Unified CLI tool
├── vm-ssh-manager.py       # VM SSH Manager
├── script_panel/           # Web UI
│   ├── app.py
│   ├── templates/
│   └── requirements.txt
├── monitoring/             # Xray monitoring
├── setup/                  # Setup scripts
├── docs/                   # Additional docs
└── GUIDE.md               # This file
```

---

## 🎊 Quick Reference Card

### Most Used Commands
```bash
vm wizard                              # Setup wizard
vm quick-add root@1.2.3.4             # Quick add VM
vm list                                # List VMs
vm connect 1                           # Connect to VM
vm key generate                        # Generate key
vm batch deploy script.sh -x -P        # Deploy to all
auto scripts start                     # Start web UI
auto vm list                          # Via unified CLI
```

---

## 🆘 Need Help?

```bash
auto --help              # General help
auto vm --help           # VM commands
auto vm key --help       # Key management
vm wizard                # Guided setup
```

---

## 📖 Additional Documentation

- `README.md` - Project overview
- `script_panel/README.md` - Script Panel details
- `docs/` - Original Xray setup guides

---

**Made with ❤️ for automation**

Last updated: October 29, 2025

