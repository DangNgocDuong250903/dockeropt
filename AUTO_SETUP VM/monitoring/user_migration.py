#!/usr/bin/env python3
"""
User Migration System
Migrate users giữa các servers
"""

import sqlite3
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class UserMigration:
    def __init__(self, db_path='/opt/vpn-business/servers.db'):
        self.db_path = db_path
    
    def get_user_server(self, user_id):
        """Lấy thông tin server hiện tại của user"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        c.execute('''
            SELECT usm.*, s.name as server_name, s.ip_address, s.region
            FROM user_server_mapping usm
            JOIN servers s ON usm.server_id = s.id
            WHERE usm.user_id = ?
        ''', (user_id,))
        
        result = c.fetchone()
        conn.close()
        
        return dict(result) if result else None
    
    def migrate_user(self, user_id, from_server_id, to_server_id):
        """
        Migrate user từ server A sang server B
        
        Steps:
        1. Validate servers exist
        2. Check target server capacity
        3. Update user_server_mapping
        4. Update user counts
        5. Sync configs to both servers
        
        Returns:
            {'success': True/False, 'message': ...}
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            # 1. Validate servers
            c.execute('SELECT * FROM servers WHERE id = ?', (from_server_id,))
            from_server = c.fetchone()
            
            c.execute('SELECT * FROM servers WHERE id = ?', (to_server_id,))
            to_server = c.fetchone()
            
            if not from_server or not to_server:
                conn.close()
                return {'success': False, 'error': 'Server not found'}
            
            to_server = dict(to_server)
            
            # 2. Check capacity
            if to_server.get('current_users', 0) >= to_server.get('max_users', 100):
                conn.close()
                return {'success': False, 'error': 'Target server at capacity'}
            
            # 3. Get user info
            c.execute('SELECT * FROM user_server_mapping WHERE user_id = ? AND server_id = ?', 
                     (user_id, from_server_id))
            mapping = c.fetchone()
            
            if not mapping:
                conn.close()
                return {'success': False, 'error': 'User not found on source server'}
            
            mapping = dict(mapping)
            
            # 4. Update mapping
            c.execute('''
                UPDATE user_server_mapping 
                SET server_id = ?
                WHERE user_id = ? AND server_id = ?
            ''', (to_server_id, user_id, from_server_id))
            
            # 5. Update user counts
            c.execute('UPDATE servers SET current_users = current_users - 1 WHERE id = ?', (from_server_id,))
            c.execute('UPDATE servers SET current_users = current_users + 1 WHERE id = ?', (to_server_id,))
            
            # 6. Log migration
            c.execute('''
                INSERT INTO migration_logs (user_id, from_server_id, to_server_id, timestamp, status)
                VALUES (?, ?, ?, ?, 'success')
            ''', (user_id, from_server_id, to_server_id, datetime.now().isoformat()))
            
            conn.commit()
            conn.close()
            
            logger.info(f"User {user_id} migrated from server {from_server_id} to {to_server_id}")
            
            # TODO: Sync Xray configs to both servers
            
            return {
                'success': True,
                'message': f'User migrated successfully',
                'from_server': from_server_id,
                'to_server': to_server_id
            }
        
        except Exception as e:
            logger.error(f"Migration error: {e}")
            return {'success': False, 'error': str(e)}
    
    def bulk_migrate(self, user_ids, to_server_id):
        """Migrate nhiều users cùng lúc"""
        results = {
            'success': 0,
            'failed': 0,
            'details': []
        }
        
        for user_id in user_ids:
            # Get current server
            user_server = self.get_user_server(user_id)
            
            if not user_server:
                results['failed'] += 1
                results['details'].append({
                    'user_id': user_id,
                    'success': False,
                    'error': 'User not assigned to any server'
                })
                continue
            
            # Migrate
            result = self.migrate_user(user_id, user_server['server_id'], to_server_id)
            
            if result['success']:
                results['success'] += 1
            else:
                results['failed'] += 1
            
            results['details'].append({
                'user_id': user_id,
                **result
            })
        
        return results
    
    def auto_balance_users(self):
        """
        Tự động balance users across servers
        Move users từ servers quá tải sang servers nhàn rỗi
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            # Get all active servers
            c.execute("SELECT * FROM servers WHERE status = 'active' ORDER BY current_users DESC")
            servers = [dict(row) for row in c.fetchall()]
            conn.close()
            
            if len(servers) < 2:
                return {'success': False, 'error': 'Need at least 2 servers for balancing'}
            
            # Calculate average users
            total_users = sum(s.get('current_users', 0) for s in servers)
            avg_users = total_users / len(servers)
            
            logger.info(f"Balancing {total_users} users across {len(servers)} servers (avg: {avg_users:.1f})")
            
            # Find overloaded and underloaded servers
            overloaded = [s for s in servers if s.get('current_users', 0) > avg_users * 1.2]
            underloaded = [s for s in servers if s.get('current_users', 0) < avg_users * 0.8]
            
            if not overloaded or not underloaded:
                return {'success': True, 'message': 'Servers already balanced'}
            
            migrations = []
            
            # Move users from overloaded to underloaded
            for over_server in overloaded:
                users_to_move = int(over_server.get('current_users', 0) - avg_users)
                
                # Get users from this server
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                c = conn.cursor()
                c.execute('''
                    SELECT user_id FROM user_server_mapping 
                    WHERE server_id = ? 
                    LIMIT ?
                ''', (over_server['id'], users_to_move))
                users = [row[0] for row in c.fetchall()]
                conn.close()
                
                # Migrate to underloaded servers
                for user_id in users:
                    if not underloaded:
                        break
                    
                    target_server = underloaded[0]
                    result = self.migrate_user(user_id, over_server['id'], target_server['id'])
                    
                    if result['success']:
                        migrations.append(result)
                        
                        # Update underloaded list
                        target_server['current_users'] = target_server.get('current_users', 0) + 1
                        if target_server['current_users'] >= avg_users:
                            underloaded.pop(0)
            
            return {
                'success': True,
                'migrations': len(migrations),
                'details': migrations
            }
        
        except Exception as e:
            logger.error(f"Auto-balance error: {e}")
            return {'success': False, 'error': str(e)}


# Add migration_logs table
def init_migration_db(db_path='/opt/vpn-business/servers.db'):
    """Initialize migration logs table"""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS migration_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            from_server_id INTEGER,
            to_server_id INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT,
            notes TEXT
        )
    ''')
    
    conn.commit()
    conn.close()


if __name__ == '__main__':
    # Test
    init_migration_db()
    
    migration = UserMigration()
    
    print("=== User Migration Test ===\n")
    
    # Test get user server
    user_server = migration.get_user_server(1)
    if user_server:
        print(f"User 1 is on server: {user_server['server_name']}")
    else:
        print("User 1 not assigned to any server")

