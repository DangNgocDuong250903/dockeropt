#!/usr/bin/env python3
"""
Traffic Aggregator
Collect và aggregate traffic từ tất cả VMs
"""

import sqlite3
import requests
import logging
from datetime import datetime, timedelta
import time
import threading

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


class TrafficAggregator:
    def __init__(self, db_path='/opt/vpn-business/servers.db'):
        self.db_path = db_path
        self.collection_interval = 300  # 5 minutes
        self.running = False
    
    def get_all_servers(self):
        """Get active servers"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM servers WHERE status = 'active'")
        servers = [dict(row) for row in c.fetchall()]
        conn.close()
        return servers
    
    def collect_traffic_from_agent(self, server):
        """Collect traffic stats from a server's agent"""
        try:
            agent_port = server.get('agent_port', 8081)
            url = f"http://{server['ip_address']}:{agent_port}/api/stats"
            
            response = requests.get(url, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'system': data.get('system', {}),
                    'traffic': data.get('traffic', {}),
                    'connections': data.get('connections', 0)
                }
            else:
                return {'success': False, 'error': f'HTTP {response.status_code}'}
        except Exception as e:
            logger.error(f"Failed to collect from {server['name']}: {e}")
            return {'success': False, 'error': str(e)}
    
    def store_server_stats(self, server_id, system_stats, connections):
        """Store server stats to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            
            c.execute('''
                INSERT INTO server_stats (
                    server_id, timestamp,
                    cpu_usage, ram_usage, ram_total,
                    disk_usage, disk_total,
                    network_rx, network_tx,
                    active_connections
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                server_id,
                datetime.now().isoformat(),
                system_stats.get('cpu_usage', 0),
                system_stats.get('ram_usage', 0),
                system_stats.get('ram_total', 0),
                system_stats.get('disk_usage', 0),
                system_stats.get('disk_total', 0),
                system_stats.get('network_rx', 0),
                system_stats.get('network_tx', 0),
                connections
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to store stats for server {server_id}: {e}")
    
    def aggregate_user_traffic(self, server_id, traffic_data):
        """Aggregate traffic per user across servers"""
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            
            for email_or_username, traffic in traffic_data.items():
                # Find user by email or username
                c.execute('''
                    SELECT u.id, usm.server_id 
                    FROM users u
                    LEFT JOIN user_server_mapping usm ON u.id = usm.user_id
                    WHERE u.email = ? OR u.username = ?
                ''', (email_or_username, email_or_username))
                
                user = c.fetchone()
                
                if user:
                    user_id = user[0]
                    mapped_server_id = user[1]
                    
                    # Only update if user is on this server
                    if mapped_server_id == server_id:
                        upload = traffic.get('upload', 0)
                        download = traffic.get('download', 0)
                        
                        # Update user traffic
                        c.execute('''
                            UPDATE users 
                            SET total_upload = ?,
                                total_download = ?
                            WHERE id = ?
                        ''', (upload, download, user_id))
                        
                        logger.debug(f"Updated traffic for user {email_or_username}: ↑{upload/1024/1024:.2f}MB ↓{download/1024/1024:.2f}MB")
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to aggregate user traffic: {e}")
    
    def collect_all(self):
        """Collect from all servers"""
        servers = self.get_all_servers()
        
        if not servers:
            logger.warning("No active servers to collect from")
            return
        
        logger.info(f"Collecting traffic from {len(servers)} servers...")
        
        for server in servers:
            logger.info(f"  Collecting from {server['name']}...")
            
            result = self.collect_traffic_from_agent(server)
            
            if result['success']:
                # Store server stats
                self.store_server_stats(
                    server['id'],
                    result.get('system', {}),
                    result.get('connections', 0)
                )
                
                # Aggregate user traffic
                traffic_data = result.get('traffic', {})
                if traffic_data:
                    self.aggregate_user_traffic(server['id'], traffic_data)
                
                logger.info(f"    ✅ Collected ({len(traffic_data)} users)")
            else:
                logger.warning(f"    ❌ Failed: {result.get('error')}")
    
    def get_user_total_traffic(self, user_id):
        """Get total traffic for a user across all servers"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            c.execute('''
                SELECT total_upload, total_download
                FROM users
                WHERE id = ?
            ''', (user_id,))
            
            result = c.fetchone()
            conn.close()
            
            if result:
                return {
                    'upload': result['total_upload'],
                    'download': result['total_download'],
                    'total': result['total_upload'] + result['total_download']
                }
            return None
        except Exception as e:
            logger.error(f"Failed to get user traffic: {e}")
            return None
    
    def get_server_traffic_summary(self, server_id, hours=24):
        """Get traffic summary for a server"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            since = (datetime.now() - timedelta(hours=hours)).isoformat()
            
            c.execute('''
                SELECT 
                    AVG(cpu_usage) as avg_cpu,
                    AVG(ram_usage) as avg_ram,
                    MAX(active_connections) as max_connections,
                    SUM(network_rx) as total_rx,
                    SUM(network_tx) as total_tx
                FROM server_stats
                WHERE server_id = ? AND timestamp >= ?
            ''', (server_id, since))
            
            result = c.fetchone()
            conn.close()
            
            if result:
                return dict(result)
            return None
        except Exception as e:
            logger.error(f"Failed to get server summary: {e}")
            return None
    
    def get_top_users_by_traffic(self, limit=10):
        """Get top users by total traffic"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            c.execute('''
                SELECT 
                    id, username, email,
                    total_upload, total_download,
                    (total_upload + total_download) as total_traffic
                FROM users
                ORDER BY total_traffic DESC
                LIMIT ?
            ''', (limit,))
            
            results = [dict(row) for row in c.fetchall()]
            conn.close()
            
            return results
        except Exception as e:
            logger.error(f"Failed to get top users: {e}")
            return []
    
    def cleanup_old_stats(self, days=30):
        """Cleanup stats older than X days"""
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            
            cutoff = (datetime.now() - timedelta(days=days)).isoformat()
            
            c.execute('DELETE FROM server_stats WHERE timestamp < ?', (cutoff,))
            c.execute('DELETE FROM server_health_logs WHERE timestamp < ?', (cutoff,))
            
            deleted = c.rowcount
            conn.commit()
            conn.close()
            
            logger.info(f"Cleaned up {deleted} old stat records")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
    
    def run(self):
        """Main collection loop"""
        logger.info("Traffic Aggregator started")
        logger.info(f"Collection interval: {self.collection_interval}s")
        
        self.running = True
        
        while self.running:
            try:
                # Collect traffic
                self.collect_all()
                
                # Cleanup old data (once per day at midnight)
                if datetime.now().hour == 0 and datetime.now().minute < 5:
                    self.cleanup_old_stats()
                
                # Sleep until next collection
                time.sleep(self.collection_interval)
            except KeyboardInterrupt:
                logger.info("Traffic Aggregator stopped by user")
                self.running = False
            except Exception as e:
                logger.error(f"Aggregator loop error: {e}")
                time.sleep(60)
    
    def start_background(self):
        """Start in background thread"""
        thread = threading.Thread(target=self.run, daemon=True)
        thread.start()
        logger.info("Traffic Aggregator running in background")
        return thread


if __name__ == '__main__':
    aggregator = TrafficAggregator()
    
    # Run continuous aggregation
    aggregator.run()

