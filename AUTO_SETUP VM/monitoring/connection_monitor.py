#!/usr/bin/env python3
"""
Connection Monitor - Track concurrent connections per user
Enforce device limits
"""

import sqlite3
import subprocess
import re
import time
from datetime import datetime
from collections import defaultdict

DB_FILE = '/opt/xray-monitor/users.db'

class ConnectionMonitor:
    def __init__(self):
        self.user_connections = defaultdict(set)
    
    def get_active_connections(self):
        """Lấy danh sách connections từ Xray access log"""
        try:
            # Get recent connections (last 1 minute)
            result = subprocess.run(
                ['sudo', 'tail', '-1000', '/var/log/xray/access.log'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode != 0:
                return {}
            
            # Parse connections
            connections = defaultdict(set)
            current_time = time.time()
            
            for line in result.stdout.split('\n'):
                # Extract email and source IP
                # Format: ... from 171.225.184.100:18108 ... email: direct@duongtech.me
                
                if 'accepted' in line and 'email:' in line:
                    # Extract email
                    email_match = re.search(r'email:\s*(\S+)', line)
                    # Extract source IP
                    ip_match = re.search(r'from\s+(\d+\.\d+\.\d+\.\d+):(\d+)', line)
                    
                    if email_match and ip_match:
                        email = email_match.group(1)
                        source_ip = ip_match.group(1)
                        
                        # Track unique IP per user
                        connections[email].add(source_ip)
            
            return connections
        
        except Exception as e:
            print(f"Error getting connections: {e}")
            return {}
    
    def get_active_connections_from_netstat(self):
        """Alternative: Get connections from netstat/ss"""
        try:
            # Get established connections on port 443
            result = subprocess.run(
                ['sudo', 'ss', '-nt', 'state', 'established', 'sport', '=', ':443'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode != 0:
                return {}
            
            # Count unique IPs
            ips = set()
            for line in result.stdout.split('\n'):
                # Parse line like: ESTAB 0 0 34.150.92.64:443 171.225.184.100:12345
                match = re.search(r'(\d+\.\d+\.\d+\.\d+):\d+\s+(\d+\.\d+\.\d+\.\d+):(\d+)', line)
                if match:
                    source_ip = match.group(2)
                    ips.add(source_ip)
            
            # Note: This gives total IPs, can't map to specific user without more parsing
            return {'total': ips}
        
        except Exception as e:
            print(f"Error getting netstat connections: {e}")
            return {}
    
    def update_user_connections(self):
        """Update current_connections trong database"""
        connections = self.get_active_connections()
        
        if not connections:
            print("No active connections found")
            return
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Reset all to 0 first
        c.execute('UPDATE users SET current_connections = 0')
        
        # Update each user
        for email, ips in connections.items():
            num_connections = len(ips)
            
            c.execute('''
                UPDATE users 
                SET current_connections = ?
                WHERE email = ? OR username = ?
            ''', (num_connections, email, email))
            
            print(f"User {email}: {num_connections} device(s) connected")
        
        conn.commit()
        conn.close()
    
    def check_and_enforce_limits(self):
        """Kiểm tra và enforce device limits - AUTO BLOCK nếu vượt"""
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Get users with device limits
        c.execute('''
            SELECT id, username, email, device_limit, current_connections, enabled, notes
            FROM users 
            WHERE device_limit > 0
        ''')
        
        violations = []
        auto_disabled = []
        auto_enabled = []
        
        for row in c.fetchall():
            user = dict(row)
            
            # Case 1: User OVER limit và đang enabled → AUTO DISABLE
            if user['current_connections'] > user['device_limit'] and user['enabled'] == 1:
                violations.append(user)
                
                print(f"🚫 AUTO-BLOCK: User {user['username']}: {user['current_connections']}/{user['device_limit']} devices (OVER LIMIT!)")
                
                # Disable user
                c.execute('UPDATE users SET enabled = 0, notes = ? WHERE id = ?', 
                         (f"Auto-disabled: Too many devices ({user['current_connections']}/{user['device_limit']})", 
                          user['id']))
                
                auto_disabled.append(user['username'])
                
            # Case 2: User dưới limit nhưng bị disabled (do auto-block trước đó) → AUTO ENABLE
            elif user['current_connections'] <= user['device_limit'] and user['enabled'] == 0:
                # Check if was auto-disabled (check notes)
                if user.get('notes', '').startswith('Auto-disabled:'):
                    print(f"✅ AUTO-RESTORE: User {user['username']}: {user['current_connections']}/{user['device_limit']} devices (OK now)")
                    
                    # Re-enable user
                    c.execute('UPDATE users SET enabled = 1, notes = ? WHERE id = ?',
                             (f"Auto-restored: Device limit OK", user['id']))
                    
                    auto_enabled.append(user['username'])
        
        conn.commit()
        conn.close()
        
        # Sync Xray config if any changes
        if auto_disabled or auto_enabled:
            print(f"\n🔄 Syncing Xray config...")
            try:
                from user_manager import UserManager
                um = UserManager()
                um.update_xray_config()
                
                # Restart Xray
                subprocess.run(['sudo', 'systemctl', 'restart', 'xray'], check=True)
                print(f"✅ Xray restarted")
                
                if auto_disabled:
                    print(f"   Disabled users: {', '.join(auto_disabled)}")
                if auto_enabled:
                    print(f"   Re-enabled users: {', '.join(auto_enabled)}")
                    
            except Exception as e:
                print(f"❌ Error syncing Xray: {e}")
        
        return violations
    
    def run(self, interval=30):
        """Main monitoring loop"""
        print("Connection Monitor started...")
        print(f"Checking every {interval} seconds")
        
        while True:
            try:
                print(f"\n[{datetime.now()}] Checking connections...")
                
                # Update connections
                self.update_user_connections()
                
                # Check limits
                violations = self.check_and_enforce_limits()
                
                if violations:
                    # In future: could auto-disable users or send alerts
                    print(f"⚠️  {len(violations)} user(s) exceeded device limit")
                
                time.sleep(interval)
            
            except Exception as e:
                print(f"Error in monitoring loop: {e}")
                time.sleep(60)


if __name__ == '__main__':
    monitor = ConnectionMonitor()
    monitor.run(interval=30)

