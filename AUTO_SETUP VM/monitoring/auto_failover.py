#!/usr/bin/env python3
"""
Auto Failover & Recovery
Tự động migrate users khi server down
"""

import sqlite3
import logging
import json
import subprocess
from datetime import datetime
import sys
sys.path.append('/opt/xray-monitor')

from user_migration import UserMigration
from load_balancer import LoadBalancer

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/xray/failover.log'),
        logging.StreamHandler()
    ]
)


class AutoFailover:
    def __init__(self, db_path='/opt/vpn-business/servers.db'):
        self.db_path = db_path
        self.migration = UserMigration(db_path)
        self.load_balancer = LoadBalancer(db_path)
    
    def get_config(self):
        """Get failover config"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM load_balancer_config WHERE id = 1')
        config = dict(c.fetchone()) if c.fetchone() else None
        conn.close()
        return config
    
    def is_auto_failover_enabled(self):
        """Check if auto failover is enabled"""
        config = self.get_config()
        return config and config.get('auto_failover', 1) == 1
    
    def get_failed_servers(self):
        """Get servers that are marked as DOWN"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM servers WHERE status = 'down'")
        servers = [dict(row) for row in c.fetchall()]
        conn.close()
        return servers
    
    def get_users_on_server(self, server_id):
        """Get all users assigned to a server"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        c.execute('''
            SELECT u.*, usm.uuid as assigned_uuid
            FROM users u
            JOIN user_server_mapping usm ON u.id = usm.user_id
            WHERE usm.server_id = ?
        ''', (server_id,))
        
        users = [dict(row) for row in c.fetchall()]
        conn.close()
        
        return users
    
    def backup_server_config(self, server_id):
        """Backup Xray config before failover"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_file = f"/opt/xray-monitor/backups/server_{server_id}_{timestamp}.json"
            
            # Create backup directory
            subprocess.run(['mkdir', '-p', '/opt/xray-monitor/backups'], check=True)
            
            # Get server info
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute('SELECT * FROM servers WHERE id = ?', (server_id,))
            server = dict(c.fetchone()) if c.fetchone() else None
            
            # Get users
            c.execute('SELECT * FROM user_server_mapping WHERE server_id = ?', (server_id,))
            users = [dict(row) for row in c.fetchall()]
            
            conn.close()
            
            # Create backup data
            backup_data = {
                'timestamp': timestamp,
                'server': server,
                'users': users
            }
            
            # Write to file
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            logger.info(f"Config backup saved: {backup_file}")
            
            return {'success': True, 'backup_file': backup_file}
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def execute_failover(self, failed_server_id):
        """
        Execute failover for a failed server
        
        Steps:
        1. Backup config
        2. Get users on failed server
        3. Select healthy target servers
        4. Migrate users
        5. Log failover event
        
        Returns:
            {'success': bool, 'migrated': int, 'failed': int}
        """
        logger.warning(f"{'='*60}")
        logger.warning(f"FAILOVER TRIGGERED - Server ID: {failed_server_id}")
        logger.warning(f"{'='*60}")
        
        try:
            # Get server info
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute('SELECT * FROM servers WHERE id = ?', (failed_server_id,))
            failed_server = dict(c.fetchone()) if c.fetchone() else None
            conn.close()
            
            if not failed_server:
                return {'success': False, 'error': 'Server not found'}
            
            logger.info(f"Failed server: {failed_server['name']} ({failed_server['ip_address']})")
            
            # 1. Backup config
            logger.info("Step 1/5: Backing up config...")
            backup_result = self.backup_server_config(failed_server_id)
            
            if not backup_result['success']:
                logger.warning(f"  Backup failed: {backup_result.get('error')}")
            else:
                logger.info(f"  ✅ Backup saved")
            
            # 2. Get users
            logger.info("Step 2/5: Getting users on failed server...")
            users = self.get_users_on_server(failed_server_id)
            logger.info(f"  Found {len(users)} users to migrate")
            
            if len(users) == 0:
                logger.info("  No users to migrate, failover complete")
                return {'success': True, 'migrated': 0, 'failed': 0}
            
            # 3. Get healthy servers
            logger.info("Step 3/5: Finding healthy servers...")
            healthy_servers = self.load_balancer.get_active_servers()
            
            if not healthy_servers:
                logger.error("  ❌ No healthy servers available!")
                return {'success': False, 'error': 'No healthy servers available'}
            
            logger.info(f"  Found {len(healthy_servers)} healthy servers")
            
            # 4. Migrate users
            logger.info("Step 4/5: Migrating users...")
            
            migrated_count = 0
            failed_count = 0
            
            for user in users:
                user_id = user['id']
                username = user['username']
                
                # Select target server using load balancer
                target_server = self.load_balancer.select_server()
                
                if not target_server:
                    logger.error(f"  ❌ Cannot find target server for user {username}")
                    failed_count += 1
                    continue
                
                # Migrate
                logger.info(f"  Migrating user {username} to {target_server['name']}...")
                
                result = self.migration.migrate_user(
                    user_id,
                    failed_server_id,
                    target_server['id']
                )
                
                if result['success']:
                    logger.info(f"    ✅ {username} migrated successfully")
                    migrated_count += 1
                else:
                    logger.error(f"    ❌ {username} migration failed: {result.get('error')}")
                    failed_count += 1
            
            # 5. Log failover event
            logger.info("Step 5/5: Logging failover event...")
            self.log_failover_event(
                failed_server_id,
                migrated_count,
                failed_count,
                backup_result.get('backup_file')
            )
            
            logger.warning(f"{'='*60}")
            logger.warning(f"FAILOVER COMPLETED")
            logger.warning(f"Migrated: {migrated_count}, Failed: {failed_count}")
            logger.warning(f"{'='*60}")
            
            return {
                'success': True,
                'migrated': migrated_count,
                'failed': failed_count,
                'server': failed_server['name']
            }
        
        except Exception as e:
            logger.error(f"Failover error: {e}")
            return {'success': False, 'error': str(e)}
    
    def log_failover_event(self, server_id, migrated, failed, backup_file=None):
        """Log failover event to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            
            # Create failover_logs table if not exists
            c.execute('''
                CREATE TABLE IF NOT EXISTS failover_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    server_id INTEGER,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    users_migrated INTEGER,
                    users_failed INTEGER,
                    backup_file TEXT,
                    status TEXT
                )
            ''')
            
            c.execute('''
                INSERT INTO failover_logs 
                (server_id, timestamp, users_migrated, users_failed, backup_file, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                server_id,
                datetime.now().isoformat(),
                migrated,
                failed,
                backup_file,
                'completed'
            ))
            
            conn.commit()
            conn.close()
            
            logger.info("Failover event logged to database")
        except Exception as e:
            logger.error(f"Failed to log failover event: {e}")
    
    def check_and_trigger_failover(self):
        """Check for failed servers and trigger failover if needed"""
        if not self.is_auto_failover_enabled():
            logger.info("Auto-failover is disabled")
            return
        
        failed_servers = self.get_failed_servers()
        
        if not failed_servers:
            logger.info("No failed servers detected")
            return
        
        logger.warning(f"Found {len(failed_servers)} failed servers")
        
        for server in failed_servers:
            # Check if already processed
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute('''
                SELECT COUNT(*) FROM failover_logs 
                WHERE server_id = ? 
                AND timestamp > datetime('now', '-1 hour')
            ''', (server['id'],))
            recent_failovers = c.fetchone()[0]
            conn.close()
            
            if recent_failovers > 0:
                logger.info(f"Server {server['name']} already failed over recently, skipping")
                continue
            
            # Execute failover
            self.execute_failover(server['id'])
    
    def rollback_failover(self, backup_file):
        """Rollback failover using backup"""
        try:
            logger.info(f"Rolling back failover from backup: {backup_file}")
            
            # Read backup
            with open(backup_file, 'r') as f:
                backup_data = json.load(f)
            
            server = backup_data['server']
            users = backup_data['users']
            
            logger.info(f"Restoring {len(users)} users to server {server['name']}")
            
            # Restore user mappings
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            
            for user in users:
                c.execute('''
                    UPDATE user_server_mapping
                    SET server_id = ?
                    WHERE user_id = ?
                ''', (server['id'], user['user_id']))
            
            conn.commit()
            conn.close()
            
            logger.info("✅ Rollback completed")
            
            return {'success': True}
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return {'success': False, 'error': str(e)}


if __name__ == '__main__':
    failover = AutoFailover()
    
    # Check and trigger failover if needed
    failover.check_and_trigger_failover()

