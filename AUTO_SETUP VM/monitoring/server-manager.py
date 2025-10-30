#!/usr/bin/env python3
"""
Multi-Server Management System
Quản lý nhiều VPS Xray từ 1 Central Dashboard
"""

import sqlite3
import subprocess
import json
import paramiko
from datetime import datetime
import threading
import queue
import time
from functools import wraps
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SSHConnectionPool:
    """SSH Connection Pool để tái sử dụng connections"""
    def __init__(self, max_connections=10, timeout=300):
        self.max_connections = max_connections
        self.timeout = timeout
        self.pool = {}  # {server_id: {'conn': ssh, 'last_used': timestamp}}
        self.lock = threading.Lock()
    
    def get_connection(self, server_id, server_info):
        """Lấy connection từ pool hoặc tạo mới"""
        with self.lock:
            # Check if connection exists and is alive
            if server_id in self.pool:
                conn_info = self.pool[server_id]
                ssh = conn_info['conn']
                
                # Check if connection is still alive
                try:
                    transport = ssh.get_transport()
                    if transport and transport.is_active():
                        conn_info['last_used'] = time.time()
                        logger.debug(f"Reusing connection for server {server_id}")
                        return ssh
                except:
                    pass
                
                # Connection dead, remove it
                try:
                    ssh.close()
                except:
                    pass
                del self.pool[server_id]
            
            # Create new connection
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            try:
                ssh.connect(
                    hostname=server_info['ip_address'],
                    port=server_info.get('ssh_port', 22),
                    username=server_info.get('ssh_user', 'root'),
                    key_filename=server_info.get('ssh_key_path'),
                    timeout=10,
                    banner_timeout=10
                )
                
                self.pool[server_id] = {
                    'conn': ssh,
                    'last_used': time.time()
                }
                
                logger.info(f"New SSH connection created for server {server_id}")
                return ssh
            
            except Exception as e:
                logger.error(f"SSH connection failed for server {server_id}: {e}")
                return None
    
    def release_connection(self, server_id):
        """Release connection (keep in pool)"""
        # Don't actually close, just update last_used
        if server_id in self.pool:
            self.pool[server_id]['last_used'] = time.time()
    
    def close_all(self):
        """Close all connections"""
        with self.lock:
            for server_id, conn_info in self.pool.items():
                try:
                    conn_info['conn'].close()
                except:
                    pass
            self.pool.clear()
    
    def cleanup_idle(self):
        """Cleanup idle connections"""
        with self.lock:
            now = time.time()
            to_remove = []
            
            for server_id, conn_info in self.pool.items():
                if now - conn_info['last_used'] > self.timeout:
                    to_remove.append(server_id)
            
            for server_id in to_remove:
                try:
                    self.pool[server_id]['conn'].close()
                except:
                    pass
                del self.pool[server_id]
                logger.info(f"Closed idle connection for server {server_id}")


def retry_on_failure(max_retries=3, delay=2):
    """Decorator để retry khi function fail"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"{func.__name__} failed (attempt {attempt + 1}/{max_retries}): {e}")
                        time.sleep(delay * (attempt + 1))  # Exponential backoff
                    else:
                        logger.error(f"{func.__name__} failed after {max_retries} attempts: {e}")
                        raise
            return None
        return wrapper
    return decorator


class ServerManager:
    def __init__(self, db_path='/opt/xray-monitor/servers.db'):
        self.db_path = db_path
        self.ssh_pool = SSHConnectionPool()
        self.init_db()
    
    def init_db(self):
        """Khởi tạo database cho servers"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Bảng servers - Thông tin các VMs
        c.execute('''
            CREATE TABLE IF NOT EXISTS servers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                ip_address TEXT NOT NULL,
                region TEXT,
                ssh_port INTEGER DEFAULT 22,
                ssh_user TEXT DEFAULT 'root',
                ssh_key_path TEXT,
                status TEXT DEFAULT 'active',
                max_users INTEGER DEFAULT 100,
                current_users INTEGER DEFAULT 0,
                weight INTEGER DEFAULT 100,
                priority INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_check TIMESTAMP,
                last_online TIMESTAMP,
                xray_version TEXT,
                agent_version TEXT,
                agent_port INTEGER DEFAULT 8081,
                notes TEXT
            )
        ''')
        
        # Bảng user-server mapping
        c.execute('''
            CREATE TABLE IF NOT EXISTS user_server_mapping (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                server_id INTEGER,
                uuid TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(server_id) REFERENCES servers(id)
            )
        ''')
        
        # Bảng server stats - Metrics theo thời gian
        c.execute('''
            CREATE TABLE IF NOT EXISTS server_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                cpu_usage REAL,
                ram_usage REAL,
                ram_total INTEGER,
                disk_usage REAL,
                disk_total INTEGER,
                network_rx INTEGER,
                network_tx INTEGER,
                bandwidth_up INTEGER,
                bandwidth_down INTEGER,
                active_connections INTEGER,
                FOREIGN KEY(server_id) REFERENCES servers(id)
            )
        ''')
        
        # Bảng server health logs - Log health checks
        c.execute('''
            CREATE TABLE IF NOT EXISTS server_health_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                check_type TEXT,
                status TEXT,
                response_time REAL,
                error_message TEXT,
                FOREIGN KEY(server_id) REFERENCES servers(id)
            )
        ''')
        
        # Bảng load balancer config
        c.execute('''
            CREATE TABLE IF NOT EXISTS load_balancer_config (
                id INTEGER PRIMARY KEY,
                strategy TEXT DEFAULT 'least-connections',
                enabled INTEGER DEFAULT 1,
                auto_failover INTEGER DEFAULT 1,
                health_check_interval INTEGER DEFAULT 60,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert default config nếu chưa có
        c.execute('INSERT OR IGNORE INTO load_balancer_config (id, strategy) VALUES (1, "least-connections")')
        
        conn.commit()
        conn.close()
    
    def add_server(self, name, ip, region, ssh_user='root', ssh_key_path='~/.ssh/id_rsa'):
        """Thêm server mới"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        try:
            c.execute('''
                INSERT INTO servers (name, ip_address, region, ssh_user, ssh_key_path)
                VALUES (?, ?, ?, ?, ?)
            ''', (name, ip, region, ssh_user, ssh_key_path))
            
            server_id = c.lastrowid
            conn.commit()
            
            print(f"✅ Server added: {name} ({ip})")
            return {'success': True, 'server_id': server_id}
        
        except sqlite3.IntegrityError:
            print(f"❌ Server {name} already exists")
            return {'success': False, 'error': 'Server already exists'}
        finally:
            conn.close()
    
    def get_server_info(self, server_id):
        """Lấy thông tin server từ database"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM servers WHERE id = ?', (server_id,))
        row = c.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def ssh_connect(self, server_id):
        """Kết nối SSH tới server (sử dụng connection pool)"""
        server = self.get_server_info(server_id)
        if not server:
            logger.error(f"Server {server_id} not found")
            return None
        
        return self.ssh_pool.get_connection(server_id, server)
    
    @retry_on_failure(max_retries=3, delay=2)
    def ssh_execute(self, server_id, command, timeout=30):
        """Execute command qua SSH với retry logic"""
        ssh = self.ssh_connect(server_id)
        if not ssh:
            raise Exception(f"Cannot connect to server {server_id}")
        
        try:
            stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
            exit_status = stdout.channel.recv_exit_status()
            
            output = stdout.read().decode('utf-8', errors='ignore')
            error = stderr.read().decode('utf-8', errors='ignore')
            
            self.ssh_pool.release_connection(server_id)
            
            return {
                'success': exit_status == 0,
                'output': output,
                'error': error,
                'exit_code': exit_status
            }
        except Exception as e:
            logger.error(f"Command execution failed on server {server_id}: {e}")
            raise
    
    def install_xray(self, server_id):
        """Cài đặt Xray trên server"""
        print(f"📦 Installing Xray on server {server_id}...")
        
        ssh = self.ssh_connect(server_id)
        if not ssh:
            return {'success': False, 'error': 'SSH connection failed'}
        
        commands = [
            # Download Xray
            "bash -c \"$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)\" @ install",
            
            # Enable service
            "systemctl enable xray",
            
            # Create log directory
            "mkdir -p /var/log/xray",
            
            # Get version
            "/usr/local/bin/xray version"
        ]
        
        for cmd in commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            output = stdout.read().decode()
            error = stderr.read().decode()
            
            if "version" in cmd:
                version = output.split('\n')[0] if output else "Unknown"
                self.update_server_info(server_id, xray_version=version)
        
        ssh.close()
        print(f"✅ Xray installed on server {server_id}")
        return {'success': True}
    
    def sync_users_to_server(self, server_id, users):
        """Sync danh sách users tới server"""
        print(f"🔄 Syncing {len(users)} users to server {server_id}...")
        
        ssh = self.ssh_connect(server_id)
        if not ssh:
            return {'success': False}
        
        # Get server info
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM servers WHERE id = ?', (server_id,))
        server = dict(c.fetchone())
        conn.close()
        
        # Generate Xray config
        config = {
            "log": {
                "loglevel": "warning",
                "access": "/var/log/xray/access.log",
                "error": "/var/log/xray/error.log"
            },
            "inbounds": [
                {
                    "port": 443,
                    "protocol": "vmess",
                    "settings": {
                        "clients": [
                            {
                                "id": user['uuid'],
                                "email": user['username']
                            }
                            for user in users
                        ]
                    },
                    "streamSettings": {
                        "network": "tcp"
                    }
                }
            ],
            "outbounds": [
                {
                    "protocol": "freedom",
                    "tag": "direct"
                }
            ]
        }
        
        # Upload config
        config_json = json.dumps(config, indent=2)
        sftp = ssh.open_sftp()
        
        # Write to temp file then move
        with sftp.open('/tmp/xray-config.json', 'w') as f:
            f.write(config_json)
        
        ssh.exec_command('sudo mv /tmp/xray-config.json /usr/local/etc/xray/config.json')
        ssh.exec_command('sudo systemctl restart xray')
        
        sftp.close()
        ssh.close()
        
        print(f"✅ Users synced to server {server_id}")
        return {'success': True}
    
    def get_server_stats(self, server_id):
        """Lấy stats từ server"""
        ssh = self.ssh_connect(server_id)
        if not ssh:
            return None
        
        # CPU usage
        stdin, stdout, stderr = ssh.exec_command("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'")
        cpu = float(stdout.read().decode().strip().replace('%', ''))
        
        # RAM usage
        stdin, stdout, stderr = ssh.exec_command("free | grep Mem | awk '{print ($3/$2) * 100.0}'")
        ram = float(stdout.read().decode().strip())
        
        # Disk usage
        stdin, stdout, stderr = ssh.exec_command("df -h / | awk 'NR==2 {print $5}'")
        disk = float(stdout.read().decode().strip().replace('%', ''))
        
        # Active connections
        stdin, stdout, stderr = ssh.exec_command("ss -ant | grep ESTAB | wc -l")
        connections = int(stdout.read().decode().strip())
        
        ssh.close()
        
        # Save to database
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            INSERT INTO server_stats 
            (server_id, cpu_usage, ram_usage, disk_usage, active_connections)
            VALUES (?, ?, ?, ?, ?)
        ''', (server_id, cpu, ram, disk, connections))
        conn.commit()
        conn.close()
        
        return {
            'cpu': cpu,
            'ram': ram,
            'disk': disk,
            'connections': connections
        }
    
    def update_server_info(self, server_id, **kwargs):
        """Update server info"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        fields = []
        values = []
        for key, value in kwargs.items():
            fields.append(f"{key} = ?")
            values.append(value)
        
        values.append(server_id)
        query = f"UPDATE servers SET {', '.join(fields)} WHERE id = ?"
        
        c.execute(query, values)
        conn.commit()
        conn.close()
    
    def get_all_servers(self):
        """Lấy danh sách tất cả servers"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM servers ORDER BY created_at DESC')
        servers = [dict(row) for row in c.fetchall()]
        conn.close()
        return servers
    
    def delete_server(self, server_id):
        """Xóa server"""
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            
            # Check if server has users
            c.execute('SELECT COUNT(*) FROM user_server_mapping WHERE server_id = ?', (server_id,))
            user_count = c.fetchone()[0]
            
            if user_count > 0:
                conn.close()
                return {'success': False, 'error': f'Cannot delete server with {user_count} users. Migrate users first.'}
            
            # Delete server
            c.execute('DELETE FROM servers WHERE id = ?', (server_id,))
            c.execute('DELETE FROM server_stats WHERE server_id = ?', (server_id,))
            c.execute('DELETE FROM server_health_logs WHERE server_id = ?', (server_id,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Server {server_id} deleted successfully")
            return {'success': True}
        except Exception as e:
            logger.error(f"Error deleting server {server_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    def health_check_all(self):
        """Health check tất cả servers"""
        servers = self.get_all_servers()
        
        print(f"🏥 Health checking {len(servers)} servers...")
        
        for server in servers:
            print(f"\n📡 Checking {server['name']} ({server['ip_address']})...")
            
            # Ping test
            result = subprocess.run(
                ['ping', '-c', '3', server['ip_address']],
                capture_output=True,
                timeout=10
            )
            
            if result.returncode == 0:
                print(f"  ✅ Ping: OK")
                
                # Get stats
                stats = self.get_server_stats(server['id'])
                if stats:
                    print(f"  📊 CPU: {stats['cpu']:.1f}%")
                    print(f"  💾 RAM: {stats['ram']:.1f}%")
                    print(f"  💿 Disk: {stats['disk']:.1f}%")
                    print(f"  🔗 Connections: {stats['connections']}")
                    
                    self.update_server_info(
                        server['id'],
                        status='active',
                        last_check=datetime.now().isoformat()
                    )
                else:
                    print(f"  ⚠️  Stats: Failed")
            else:
                print(f"  ❌ Ping: FAILED")
                self.update_server_info(server['id'], status='down')
    
    def assign_user_to_server(self, user_id, user_uuid, user_name):
        """Tự động assign user vào server ít user nhất"""
        servers = self.get_all_servers()
        
        # Filter active servers
        active_servers = [s for s in servers if s['status'] == 'active']
        
        if not active_servers:
            return {'success': False, 'error': 'No active servers'}
        
        # Sort by current users
        active_servers.sort(key=lambda x: x['current_users'])
        
        # Assign to server with least users
        target_server = active_servers[0]
        
        # Add to database
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            INSERT INTO user_server_mapping (user_id, server_id, uuid)
            VALUES (?, ?, ?)
        ''', (user_id, target_server['id'], user_uuid))
        conn.commit()
        
        # Update server user count
        c.execute('''
            UPDATE servers 
            SET current_users = current_users + 1
            WHERE id = ?
        ''', (target_server['id'],))
        conn.commit()
        conn.close()
        
        # Sync config to server
        # (Sẽ implement riêng)
        
        return {
            'success': True,
            'server_id': target_server['id'],
            'server_name': target_server['name'],
            'server_ip': target_server['ip_address']
        }


if __name__ == '__main__':
    # Demo usage
    sm = ServerManager()
    
    print("=== Server Manager Demo ===\n")
    
    # Add server
    result = sm.add_server(
        name="HK-Server-1",
        ip="34.150.92.64",
        region="Hong Kong",
        ssh_key_path="~/.ssh/id_rsa"
    )
    
    if result['success']:
        server_id = result['server_id']
        
        # Health check
        sm.health_check_all()
        
        # List servers
        servers = sm.get_all_servers()
        print(f"\n📋 Total servers: {len(servers)}")
        for s in servers:
            print(f"  - {s['name']}: {s['ip_address']} ({s['status']})")

