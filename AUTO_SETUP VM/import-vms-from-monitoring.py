#!/usr/bin/env python3
"""
Import VMs từ monitoring/server_manager.py vào VM SSH Manager
"""

import json
import sqlite3
import sys
from pathlib import Path
from datetime import datetime

# Config paths
VM_MANAGER_CONFIG = Path.home() / ".xray-vm-manager" / "config.json"
MONITORING_DB = Path("monitoring") / "servers.db"

def load_vm_manager_config():
    """Load config của VM Manager"""
    if not VM_MANAGER_CONFIG.exists():
        print("❌ VM Manager chưa được khởi tạo!")
        print("   Chạy: python vm-ssh-manager.py init")
        return None
    
    with open(VM_MANAGER_CONFIG, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_vm_manager_config(config):
    """Save config của VM Manager"""
    with open(VM_MANAGER_CONFIG, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

def import_from_monitoring_db():
    """Import VMs từ monitoring database"""
    
    if not MONITORING_DB.exists():
        print(f"⚠️  Không tìm thấy database: {MONITORING_DB}")
        print("   Bỏ qua import từ monitoring system.")
        return []
    
    try:
        conn = sqlite3.connect(MONITORING_DB)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        c.execute('SELECT * FROM servers ORDER BY created_at DESC')
        servers = [dict(row) for row in c.fetchall()]
        conn.close()
        
        print(f"✅ Tìm thấy {len(servers)} servers trong monitoring DB")
        return servers
    
    except Exception as e:
        print(f"❌ Lỗi đọc database: {e}")
        return []

def import_from_deploy_script():
    """Import VM info từ deploy-to-vm.ps1"""
    deploy_script = Path("deploy-to-vm.ps1")
    
    if not deploy_script.exists():
        return None
    
    try:
        with open(deploy_script, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Tìm thông tin SSH trong script
        vm_info = {}
        
        # Tìm IP
        for line in content.split('\n'):
            if 'SSH_HOST' in line or '$vmIp' in line:
                parts = line.split('=')
                if len(parts) > 1:
                    ip = parts[1].strip().strip('"').strip("'")
                    if ip and not ip.startswith('$'):
                        vm_info['host'] = ip
            
            if 'SSH_USER' in line or '$vmUser' in line:
                parts = line.split('=')
                if len(parts) > 1:
                    user = parts[1].strip().strip('"').strip("'")
                    if user and not user.startswith('$'):
                        vm_info['user'] = user
            
            if 'SSH_KEY' in line or 'id_rsa' in line:
                parts = line.split('=')
                if len(parts) > 1:
                    key = parts[1].strip().strip('"').strip("'")
                    if 'id_rsa' in key:
                        vm_info['ssh_key_path'] = key
        
        if vm_info:
            print(f"✅ Tìm thấy VM info trong deploy script")
            return vm_info
    
    except Exception as e:
        print(f"⚠️  Không đọc được deploy script: {e}")
    
    return None

def main():
    print("=" * 50)
    print("📥 Import VMs vào VM SSH Manager")
    print("=" * 50)
    print()
    
    # Load config
    config = load_vm_manager_config()
    if not config:
        return
    
    current_profile_name = config.get("current_profile", "default")
    current_profile = config["profiles"][current_profile_name]
    existing_vms = current_profile.get("vms", [])
    
    print(f"Current profile: {current_profile.get('name', 'Default')}")
    print(f"VMs hiện tại: {len(existing_vms)}")
    print()
    
    # Import từ monitoring DB
    print("🔍 Tìm kiếm VMs trong monitoring system...")
    monitoring_servers = import_from_monitoring_db()
    
    # Import từ deploy script
    print("🔍 Tìm kiếm VM info trong deploy scripts...")
    deploy_vm = import_from_deploy_script()
    
    # Merge VMs
    vms_to_add = []
    
    # From monitoring DB
    for server in monitoring_servers:
        vm_config = {
            "name": server['name'],
            "host": server['ip_address'],
            "user": server.get('ssh_user', 'root'),
            "port": server.get('ssh_port', 22),
            "ssh_key_path": server.get('ssh_key_path', '~/.ssh/id_rsa'),
            "description": f"{server.get('region', 'Unknown')} - Imported from monitoring",
            "added_at": datetime.now().isoformat(),
            "last_connected": None,
            "imported_from": "monitoring_db"
        }
        
        # Check if already exists
        exists = False
        for existing in existing_vms:
            if existing['name'] == vm_config['name'] or existing['host'] == vm_config['host']:
                exists = True
                break
        
        if not exists:
            vms_to_add.append(vm_config)
    
    # From deploy script
    if deploy_vm and deploy_vm.get('host'):
        vm_name = f"main-server-{deploy_vm['host'].replace('.', '-')}"
        
        vm_config = {
            "name": vm_name,
            "host": deploy_vm['host'],
            "user": deploy_vm.get('user', 'root'),
            "port": 22,
            "ssh_key_path": deploy_vm.get('ssh_key_path', '~/.ssh/id_rsa'),
            "description": "Main server - Imported from deploy script",
            "added_at": datetime.now().isoformat(),
            "last_connected": None,
            "imported_from": "deploy_script"
        }
        
        # Check if exists
        exists = False
        for existing in existing_vms:
            if existing['host'] == vm_config['host']:
                exists = True
                break
        
        if not exists:
            vms_to_add.append(vm_config)
    
    # Show results
    print()
    print(f"📋 Tìm thấy {len(vms_to_add)} VMs mới để import")
    print()
    
    if not vms_to_add:
        print("✅ Không có VMs mới để import.")
        return
    
    # Show VMs
    for i, vm in enumerate(vms_to_add, 1):
        print(f"{i}. {vm['name']}")
        print(f"   Host: {vm['host']}")
        print(f"   User: {vm['user']}")
        print(f"   Source: {vm['imported_from']}")
        print()
    
    # Confirm
    response = input("Import các VMs này? (Y/n): ").strip().lower()
    
    if response == 'n':
        print("❌ Đã hủy import.")
        return
    
    # Add VMs
    current_profile['vms'].extend(vms_to_add)
    config["profiles"][current_profile_name] = current_profile
    
    # Save
    save_vm_manager_config(config)
    
    print()
    print(f"✅ Đã import {len(vms_to_add)} VMs thành công!")
    print()
    print("🎯 Để xem danh sách:")
    print("   python vm-ssh-manager.py list")
    print()
    print("🔌 Để kết nối:")
    print("   python vm-ssh-manager.py connect 1")

if __name__ == '__main__':
    main()

