#!/usr/bin/env python3
"""
Xray User Management System
Quản lý users với UUID riêng cho Xray
"""

import sqlite3
import uuid
import json
import subprocess
from datetime import datetime
import os

DB_FILE = '/opt/xray-monitor/users.db'
XRAY_CONFIG = '/usr/local/etc/xray/config.json'

class UserManager:
    def __init__(self):
        self.init_db()
    
    def init_db(self):
        """Khởi tạo database"""
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                uuid TEXT UNIQUE NOT NULL,
                email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                enabled INTEGER DEFAULT 1,
                total_upload INTEGER DEFAULT 0,
                total_download INTEGER DEFAULT 0,
                traffic_limit INTEGER DEFAULT 0,
                notes TEXT
            )
        ''')
        conn.commit()
        conn.close()
    
    def add_user(self, username, email='', traffic_limit=0, device_limit=3, notes=''):
        """Thêm user mới"""
        user_uuid = str(uuid.uuid4())
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        try:
            c.execute('''
                INSERT INTO users (username, uuid, email, traffic_limit, device_limit, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (username, user_uuid, email, traffic_limit, device_limit, notes))
            conn.commit()
            user_id = c.lastrowid
            
            # Thêm vào Xray config
            self.update_xray_config()
            
            return {'success': True, 'user_id': user_id, 'uuid': user_uuid}
        except sqlite3.IntegrityError:
            return {'success': False, 'error': 'Username already exists'}
        finally:
            conn.close()
    
    def get_all_users(self):
        """Lấy danh sách tất cả users"""
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM users ORDER BY created_at DESC')
        users = [dict(row) for row in c.fetchall()]
        conn.close()
        return users
    
    def get_user(self, user_id):
        """Lấy thông tin 1 user"""
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = c.fetchone()
        conn.close()
        return dict(user) if user else None
    
    def update_user(self, user_id, **kwargs):
        """Cập nhật thông tin user"""
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Build UPDATE query dynamically
        fields = []
        values = []
        for key, value in kwargs.items():
            if key in ['username', 'email', 'enabled', 'traffic_limit', 'notes']:
                fields.append(f"{key} = ?")
                values.append(value)
        
        if not fields:
            return {'success': False, 'error': 'No valid fields to update'}
        
        values.append(user_id)
        query = f"UPDATE users SET {', '.join(fields)} WHERE id = ?"
        
        try:
            c.execute(query, values)
            conn.commit()
            
            # Update Xray config
            self.update_xray_config()
            
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def delete_user(self, user_id):
        """Xóa user"""
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        conn.close()
        
        # Update Xray config
        self.update_xray_config()
        
        return {'success': True}
    
    def update_xray_config(self):
        """Cập nhật Xray config với danh sách users"""
        try:
            # Read current config
            with open(XRAY_CONFIG, 'r') as f:
                config = json.load(f)
            
            # Get all active users
            users = self.get_all_users()
            active_users = [u for u in users if u['enabled'] == 1]
            
            # Update VLESS inbound (port 443)
            for inbound in config.get('inbounds', []):
                if inbound.get('port') == 443:
                    # VMess protocol
                    if inbound.get('protocol') == 'vmess':
                        clients = []
                        for user in active_users:
                            clients.append({
                                'id': user['uuid'],
                                'email': user['email'] or user['username']
                            })
                        
                        if 'settings' not in inbound:
                            inbound['settings'] = {}
                        inbound['settings']['clients'] = clients
            
            # Backup old config
            subprocess.run(['cp', XRAY_CONFIG, f'{XRAY_CONFIG}.bak'])
            
            # Write new config
            with open(XRAY_CONFIG, 'w') as f:
                json.dump(config, f, indent=2)
            
            # Restart Xray
            subprocess.run(['systemctl', 'restart', 'xray'])
            
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def generate_qr_config(self, user_id, server_ip):
        """Generate config string và QR code cho user"""
        user = self.get_user(user_id)
        if not user:
            return None
        
        # VMess config format
        config = {
            'v': '2',
            'ps': f"Xray-{user['username']}",
            'add': server_ip,
            'port': '443',
            'id': user['uuid'],
            'aid': '0',
            'scy': 'auto',
            'net': 'tcp',
            'type': 'none',
            'host': '',
            'path': '',
            'tls': '',
            'sni': '',
            'alpn': ''
        }
        
        import base64
        config_json = json.dumps(config)
        config_str = 'vmess://' + base64.b64encode(config_json.encode()).decode()
        
        return config_str

if __name__ == '__main__':
    # Test
    um = UserManager()
    print("User Manager initialized!")

