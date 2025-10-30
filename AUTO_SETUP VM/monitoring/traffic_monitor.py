#!/usr/bin/env python3
"""
Traffic Monitor per User
Track bandwidth usage cho từng user và enforce limits
"""

import sqlite3
import subprocess
import json
import time
from datetime import datetime, timedelta
import sys
import re
sys.path.append('/opt/xray-monitor')
from user_manager import UserManager

DB_FILE = '/opt/xray-monitor/users.db'
XRAY_LOG = '/var/log/xray/access.log'

class TrafficMonitor:
    def __init__(self):
        self.user_manager = UserManager()
        self.last_stats = {}
    
    def get_xray_stats_api(self):
        """Query Xray Stats API để lấy traffic per user"""
        try:
            # Query Xray API for user stats
            result = subprocess.run(
                ['/usr/local/bin/xray', 'api', 'statsquery', '--server=127.0.0.1:10085'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0 and result.stdout.strip():
                # Parse JSON output
                try:
                    data = json.loads(result.stdout)
                    traffic_data = {}
                    
                    # Parse stats array
                    for stat in data.get('stat', []):
                        name = stat.get('name', '')
                        value = stat.get('value')
                        
                        # Format: user>>>email>>>traffic>>>uplink or downlink
                        if 'user>>>' in name and '>>>traffic>>>' in name and value:
                            parts = name.split('>>>')
                            if len(parts) >= 4:
                                email = parts[1]
                                direction = parts[3]  # uplink or downlink
                                
                                if email not in traffic_data:
                                    traffic_data[email] = {'upload': 0, 'download': 0}
                                
                                if direction == 'uplink':
                                    traffic_data[email]['upload'] = int(value)
                                elif direction == 'downlink':
                                    traffic_data[email]['download'] = int(value)
                    
                    return traffic_data
                except json.JSONDecodeError as e:
                    print(f"JSON parse error: {e}")
                    return self.parse_xray_logs()
            else:
                print(f"Xray API error: {result.stderr}")
                return self.parse_xray_logs()
        except FileNotFoundError:
            print("Xray API not available, falling back to log parsing")
            return self.parse_xray_logs()
        except Exception as e:
            print(f"Error querying Xray API: {e}")
            return self.parse_xray_logs()
    
    def parse_xray_logs(self):
        """Parse Xray logs để lấy traffic info (fallback method)"""
        try:
            # Đọc Xray access logs
            with open(XRAY_LOG, 'r') as f:
                logs = f.readlines()
            
            # Parse từng log entry
            traffic_data = {}
            for line in logs[-5000:]:  # Last 5000 lines
                try:
                    # Format: ... email: username ... from ... to ... downlink: 123 uplink: 456
                    if 'email:' in line:
                        # Extract email/username
                        email_match = re.search(r'email:\s*(\S+)', line)
                        if email_match:
                            email = email_match.group(1)
                            
                            # Extract traffic numbers
                            downlink_match = re.search(r'downlink:\s*(\d+)', line)
                            uplink_match = re.search(r'uplink:\s*(\d+)', line)
                            
                            if email not in traffic_data:
                                traffic_data[email] = {'upload': 0, 'download': 0}
                            
                            if downlink_match:
                                traffic_data[email]['download'] += int(downlink_match.group(1))
                            if uplink_match:
                                traffic_data[email]['upload'] += int(uplink_match.group(1))
                except:
                    continue
            
            return traffic_data
        except FileNotFoundError:
            print(f"Log file not found: {XRAY_LOG}")
            return {}
        except Exception as e:
            print(f"Error parsing logs: {e}")
            return {}
    
    def update_user_traffic(self):
        """Cập nhật traffic usage cho users"""
        # Try API first, fallback to logs
        traffic_data = self.get_xray_stats_api()
        
        if not traffic_data:
            print("No traffic data available")
            return
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        updated_count = 0
        for email_or_username, traffic in traffic_data.items():
            # Find user by email OR username
            c.execute('SELECT id, total_upload, total_download FROM users WHERE email = ? OR username = ?', 
                     (email_or_username, email_or_username))
            user = c.fetchone()
            
            if user:
                user_id = user[0]
                
                # Set total traffic from Xray API
                # (Xray API returns cumulative traffic since Xray started)
                c.execute('''
                    UPDATE users 
                    SET total_upload = ?,
                        total_download = ?
                    WHERE id = ?
                ''', (traffic['upload'], traffic['download'], user_id))
                
                updated_count += 1
                print(f"Updated {email_or_username}: ↑{traffic['upload']/1024/1024:.2f}MB ↓{traffic['download']/1024/1024:.2f}MB")
        
        conn.commit()
        conn.close()
        
        print(f"[{datetime.now()}] Updated traffic for {updated_count}/{len(traffic_data)} users")
    
    def check_and_enforce_limits(self):
        """Kiểm tra và enforce traffic limits"""
        users = self.user_manager.get_all_users()
        
        for user in users:
            if user['traffic_limit'] > 0 and user['enabled'] == 1:
                total_traffic = user['total_upload'] + user['total_download']
                
                if total_traffic >= user['traffic_limit']:
                    # Disable user khi vượt quota
                    print(f"[{datetime.now()}] User {user['username']} exceeded limit. Disabling...")
                    self.user_manager.update_user(user['id'], enabled=0)
    
    def reset_monthly_traffic(self):
        """Reset traffic counters hàng tháng"""
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Reset all users on first day of month
        if datetime.now().day == 1:
            c.execute('UPDATE users SET total_upload = 0, total_download = 0')
            conn.commit()
            print(f"[{datetime.now()}] Monthly traffic reset completed")
        
        conn.close()
    
    def run(self):
        """Main monitoring loop"""
        print("Traffic Monitor started...")
        
        while True:
            try:
                # Update traffic every 5 minutes
                self.update_user_traffic()
                
                # Check and enforce limits
                self.check_and_enforce_limits()
                
                # Check for monthly reset (every hour)
                if datetime.now().minute == 0:
                    self.reset_monthly_traffic()
                
                time.sleep(300)  # 5 minutes
            except Exception as e:
                print(f"Error in monitoring loop: {e}")
                time.sleep(60)

if __name__ == '__main__':
    monitor = TrafficMonitor()
    monitor.run()

