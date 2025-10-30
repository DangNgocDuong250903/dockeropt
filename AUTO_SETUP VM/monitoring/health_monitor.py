#!/usr/bin/env python3
"""
Health Monitor - Periodic health checks cho tất cả servers
Auto-detect server down và trigger alerts
"""

import sqlite3
import subprocess
import requests
import time
import logging
from datetime import datetime
import threading

logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/xray/health-monitor.log'),
        logging.StreamHandler()
    ]
)


class HealthMonitor:
    def __init__(self, db_path='/opt/vpn-business/servers.db'):
        self.db_path = db_path
        self.check_interval = 60  # seconds
        self.failure_threshold = 3  # failures before marking DOWN
        self.running = False
    
    def get_config(self):
        """Get monitoring config"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM load_balancer_config WHERE id = 1')
        config = dict(c.fetchone()) if c.fetchone() else None
        conn.close()
        
        if config:
            self.check_interval = config.get('health_check_interval', 60)
        
        return config
    
    def ping_check(self, ip_address, timeout=5):
        """Ping test"""
        try:
            result = subprocess.run(
                ['ping', '-c', '3', '-W', str(timeout), ip_address],
                capture_output=True,
                timeout=timeout + 2
            )
            
            if result.returncode == 0:
                # Parse response time
                output = result.stdout.decode()
                # Extract avg time from: rtt min/avg/max/mdev = 10.123/15.456/20.789/3.210 ms
                if 'rtt' in output:
                    parts = output.split('rtt')[-1].split('=')[-1].strip().split()[0]
                    avg_time = float(parts.split('/')[1])
                else:
                    avg_time = 0
                
                return {'success': True, 'response_time': avg_time}
            else:
                return {'success': False, 'error': 'Ping failed'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def ssh_check(self, server):
        """SSH connection test"""
        try:
            # Quick SSH test
            result = subprocess.run([
                'ssh',
                '-i', server.get('ssh_key_path', '~/.ssh/id_rsa'),
                '-o', 'ConnectTimeout=5',
                '-o', 'BatchMode=yes',
                f"{server.get('ssh_user', 'root')}@{server['ip_address']}",
                'echo "SSH OK"'
            ], capture_output=True, timeout=10)
            
            if result.returncode == 0:
                return {'success': True}
            else:
                return {'success': False, 'error': 'SSH connection failed'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def agent_check(self, server):
        """Check Xray Agent API"""
        try:
            agent_port = server.get('agent_port', 8081)
            url = f"http://{server['ip_address']}:{agent_port}/api/ping"
            
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'agent_version': data.get('agent_version'),
                    'response_time': response.elapsed.total_seconds()
                }
            else:
                return {'success': False, 'error': f'HTTP {response.status_code}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def xray_check(self, server):
        """Check if Xray is running"""
        try:
            # Query via agent API
            agent_port = server.get('agent_port', 8081)
            url = f"http://{server['ip_address']}:{agent_port}/api/status"
            
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                xray_status = data.get('xray', {})
                
                return {
                    'success': xray_status.get('is_active', False),
                    'version': xray_status.get('version'),
                    'error': None if xray_status.get('is_active') else 'Xray not running'
                }
            else:
                return {'success': False, 'error': 'Agent API failed'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def comprehensive_check(self, server):
        """Run all checks on a server"""
        server_id = server['id']
        server_name = server['name']
        
        logger.info(f"Checking server: {server_name} ({server['ip_address']})")
        
        results = {
            'server_id': server_id,
            'server_name': server_name,
            'timestamp': datetime.now().isoformat(),
            'checks': {}
        }
        
        # 1. Ping check
        ping_result = self.ping_check(server['ip_address'])
        results['checks']['ping'] = ping_result
        
        if not ping_result['success']:
            logger.warning(f"  ❌ Ping failed: {ping_result.get('error')}")
            results['overall_status'] = 'down'
            return results
        else:
            logger.info(f"  ✅ Ping OK ({ping_result.get('response_time', 0):.2f}ms)")
        
        # 2. SSH check
        ssh_result = self.ssh_check(server)
        results['checks']['ssh'] = ssh_result
        
        if not ssh_result['success']:
            logger.warning(f"  ⚠️  SSH failed: {ssh_result.get('error')}")
        else:
            logger.info(f"  ✅ SSH OK")
        
        # 3. Agent check
        agent_result = self.agent_check(server)
        results['checks']['agent'] = agent_result
        
        if not agent_result['success']:
            logger.warning(f"  ⚠️  Agent failed: {agent_result.get('error')}")
        else:
            logger.info(f"  ✅ Agent OK (v{agent_result.get('agent_version')})")
        
        # 4. Xray check
        xray_result = self.xray_check(server)
        results['checks']['xray'] = xray_result
        
        if not xray_result['success']:
            logger.warning(f"  ❌ Xray failed: {xray_result.get('error')}")
            results['overall_status'] = 'warning'
        else:
            logger.info(f"  ✅ Xray OK ({xray_result.get('version')})")
            results['overall_status'] = 'active'
        
        return results
    
    def log_health_check(self, server_id, check_type, status, response_time=None, error_message=None):
        """Log health check result to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            
            c.execute('''
                INSERT INTO server_health_logs 
                (server_id, timestamp, check_type, status, response_time, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                server_id,
                datetime.now().isoformat(),
                check_type,
                status,
                response_time,
                error_message
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to log health check: {e}")
    
    def update_server_status(self, server_id, status):
        """Update server status in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            
            c.execute('''
                UPDATE servers 
                SET status = ?, last_check = ?, last_online = ?
                WHERE id = ?
            ''', (
                status,
                datetime.now().isoformat(),
                datetime.now().isoformat() if status == 'active' else None,
                server_id
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Server {server_id} status updated to: {status}")
        except Exception as e:
            logger.error(f"Failed to update server status: {e}")
    
    def check_all_servers(self):
        """Run health checks on all servers"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute('SELECT * FROM servers')
            servers = [dict(row) for row in c.fetchall()]
            conn.close()
            
            logger.info(f"\n{'='*60}")
            logger.info(f"Health Check Started - {len(servers)} servers")
            logger.info(f"{'='*60}\n")
            
            results = []
            
            for server in servers:
                result = self.comprehensive_check(server)
                results.append(result)
                
                # Log each check
                for check_type, check_result in result['checks'].items():
                    self.log_health_check(
                        server['id'],
                        check_type,
                        'success' if check_result['success'] else 'failed',
                        check_result.get('response_time'),
                        check_result.get('error')
                    )
                
                # Update server status
                new_status = result.get('overall_status', 'unknown')
                if new_status != server.get('status'):
                    self.update_server_status(server['id'], new_status)
                    
                    # Trigger alert if status changed
                    if new_status == 'down':
                        self.send_alert(server, 'Server DOWN')
                    elif new_status == 'warning':
                        self.send_alert(server, 'Server WARNING - Xray not running')
            
            logger.info(f"\n{'='*60}")
            logger.info(f"Health Check Completed")
            logger.info(f"{'='*60}\n")
            
            return results
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return []
    
    def send_alert(self, server, message):
        """Send alert (Telegram/Email)"""
        logger.warning(f"⚠️  ALERT: {server['name']} - {message}")
        
        # TODO: Implement Telegram bot alert
        # TODO: Implement email alert
    
    def run(self):
        """Main monitoring loop"""
        logger.info("Health Monitor started")
        logger.info(f"Check interval: {self.check_interval}s")
        
        self.running = True
        
        while self.running:
            try:
                # Get latest config
                self.get_config()
                
                # Run checks
                self.check_all_servers()
                
                # Sleep until next check
                time.sleep(self.check_interval)
            except KeyboardInterrupt:
                logger.info("Health Monitor stopped by user")
                self.running = False
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
                time.sleep(60)  # Wait 1 minute before retry
    
    def start_background(self):
        """Start monitoring in background thread"""
        thread = threading.Thread(target=self.run, daemon=True)
        thread.start()
        logger.info("Health Monitor running in background")
        return thread


if __name__ == '__main__':
    monitor = HealthMonitor()
    
    # Run continuous monitoring
    monitor.run()

