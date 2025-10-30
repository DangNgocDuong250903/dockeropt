#!/usr/bin/env python3
"""
Smart Load Balancer
Chọn server tối ưu khi assign user mới
"""

import sqlite3
import random
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class LoadBalancer:
    def __init__(self, db_path='/opt/vpn-business/servers.db'):
        self.db_path = db_path
    
    def get_config(self):
        """Lấy config hiện tại"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM load_balancer_config WHERE id = 1')
        config = dict(c.fetchone()) if c.fetchone() else None
        conn.close()
        return config
    
    def update_config(self, strategy=None, enabled=None, auto_failover=None, health_check_interval=None):
        """Update config"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        updates = []
        values = []
        
        if strategy:
            updates.append('strategy = ?')
            values.append(strategy)
        if enabled is not None:
            updates.append('enabled = ?')
            values.append(1 if enabled else 0)
        if auto_failover is not None:
            updates.append('auto_failover = ?')
            values.append(1 if auto_failover else 0)
        if health_check_interval:
            updates.append('health_check_interval = ?')
            values.append(health_check_interval)
        
        updates.append('updated_at = ?')
        values.append(datetime.now().isoformat())
        
        query = f"UPDATE load_balancer_config SET {', '.join(updates)} WHERE id = 1"
        c.execute(query, values)
        
        conn.commit()
        conn.close()
        
        return {'success': True}
    
    def get_active_servers(self):
        """Lấy danh sách servers đang active"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM servers WHERE status = 'active' ORDER BY priority DESC, weight DESC")
        servers = [dict(row) for row in c.fetchall()]
        conn.close()
        return servers
    
    def calculate_server_load(self, server):
        """Tính load score của server (lower is better)"""
        # Get latest stats
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('''
            SELECT * FROM server_stats 
            WHERE server_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        ''', (server['id'],))
        stats = c.fetchone()
        conn.close()
        
        if not stats:
            # No stats yet, use defaults
            cpu_factor = 0
            ram_factor = 0
            user_factor = (server.get('current_users', 0) / server.get('max_users', 100)) * 100
        else:
            stats = dict(stats)
            cpu_factor = stats.get('cpu_usage', 0)
            ram_factor = stats.get('ram_usage', 0)
            user_factor = (server.get('current_users', 0) / server.get('max_users', 100)) * 100
        
        # Weighted load score
        load_score = (cpu_factor * 0.3) + (ram_factor * 0.3) + (user_factor * 0.4)
        
        return load_score
    
    def select_server_round_robin(self, servers):
        """Round-robin: Luân phiên"""
        # Get last assigned server
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            SELECT server_id FROM user_server_mapping 
            ORDER BY created_at DESC 
            LIMIT 1
        ''')
        last = c.fetchone()
        conn.close()
        
        if not last:
            return servers[0] if servers else None
        
        last_server_id = last[0]
        
        # Find next server
        server_ids = [s['id'] for s in servers]
        try:
            current_index = server_ids.index(last_server_id)
            next_index = (current_index + 1) % len(servers)
            return servers[next_index]
        except ValueError:
            return servers[0]
    
    def select_server_least_connections(self, servers):
        """Least-connections: Server có ít user nhất"""
        if not servers:
            return None
        
        # Sort by current_users
        sorted_servers = sorted(servers, key=lambda s: s.get('current_users', 0))
        return sorted_servers[0]
    
    def select_server_weighted_random(self, servers):
        """Weighted-random: Dựa trên weight"""
        if not servers:
            return None
        
        # Get total weight
        total_weight = sum(s.get('weight', 100) for s in servers)
        
        # Random selection based on weight
        rand = random.uniform(0, total_weight)
        cumulative = 0
        
        for server in servers:
            cumulative += server.get('weight', 100)
            if rand <= cumulative:
                return server
        
        return servers[0]
    
    def select_server_load_based(self, servers):
        """Load-based: Dựa trên CPU, RAM, Users"""
        if not servers:
            return None
        
        # Calculate load for each server
        server_loads = []
        for server in servers:
            load = self.calculate_server_load(server)
            server_loads.append({
                'server': server,
                'load': load
            })
        
        # Sort by load (ascending - lowest first)
        sorted_loads = sorted(server_loads, key=lambda x: x['load'])
        
        return sorted_loads[0]['server']
    
    def select_server_geo_based(self, servers, user_region=None):
        """Geo-based: Dựa trên vị trí user"""
        if not servers:
            return None
        
        if not user_region:
            # Fallback to load-based
            return self.select_server_load_based(servers)
        
        # Filter servers in same region
        same_region = [s for s in servers if s.get('region', '').lower() == user_region.lower()]
        
        if same_region:
            # Use load-based within same region
            return self.select_server_load_based(same_region)
        else:
            # No servers in same region, use load-based globally
            return self.select_server_load_based(servers)
    
    def select_server(self, strategy=None, user_region=None):
        """
        Chọn server tối ưu dựa trên strategy
        
        Args:
            strategy: 'round-robin', 'least-connections', 'weighted-random', 'load-based', 'geo-based'
            user_region: Region của user (cho geo-based)
        
        Returns:
            Selected server dict hoặc None
        """
        # Get active servers
        servers = self.get_active_servers()
        
        if not servers:
            logger.error("No active servers available")
            return None
        
        # Get strategy from config if not provided
        if not strategy:
            config = self.get_config()
            strategy = config.get('strategy', 'least-connections') if config else 'least-connections'
        
        logger.info(f"Selecting server using strategy: {strategy}")
        
        # Select based on strategy
        if strategy == 'round-robin':
            server = self.select_server_round_robin(servers)
        elif strategy == 'least-connections':
            server = self.select_server_least_connections(servers)
        elif strategy == 'weighted-random':
            server = self.select_server_weighted_random(servers)
        elif strategy == 'load-based':
            server = self.select_server_load_based(servers)
        elif strategy == 'geo-based':
            server = self.select_server_geo_based(servers, user_region)
        else:
            # Default: least-connections
            server = self.select_server_least_connections(servers)
        
        if server:
            logger.info(f"Selected server: {server['name']} (ID: {server['id']})")
        
        return server
    
    def assign_user_to_server(self, user_id, user_uuid, user_name, user_region=None):
        """
        Tự động assign user vào server tối ưu
        
        Returns:
            {'success': True, 'server_id': ..., 'server_name': ..., 'server_ip': ...}
        """
        try:
            # Check if load balancer is enabled
            config = self.get_config()
            if config and not config.get('enabled', 1):
                return {'success': False, 'error': 'Load balancer is disabled'}
            
            # Select optimal server
            server = self.select_server(user_region=user_region)
            
            if not server:
                return {'success': False, 'error': 'No servers available'}
            
            # Check if server has capacity
            if server.get('current_users', 0) >= server.get('max_users', 100):
                logger.warning(f"Server {server['id']} is at capacity, trying next...")
                # TODO: Try next server
                return {'success': False, 'error': 'All servers at capacity'}
            
            # Add to user_server_mapping
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            
            c.execute('''
                INSERT INTO user_server_mapping (user_id, server_id, uuid)
                VALUES (?, ?, ?)
            ''', (user_id, server['id'], user_uuid))
            
            # Update server user count
            c.execute('''
                UPDATE servers 
                SET current_users = current_users + 1
                WHERE id = ?
            ''', (server['id'],))
            
            conn.commit()
            conn.close()
            
            logger.info(f"User {user_name} (ID: {user_id}) assigned to server {server['name']}")
            
            return {
                'success': True,
                'server_id': server['id'],
                'server_name': server['name'],
                'server_ip': server['ip_address'],
                'server_region': server.get('region')
            }
        
        except Exception as e:
            logger.error(f"Error assigning user to server: {e}")
            return {'success': False, 'error': str(e)}


if __name__ == '__main__':
    # Test
    lb = LoadBalancer()
    
    print("=== Load Balancer Test ===\n")
    
    config = lb.get_config()
    print(f"Current config: {config}\n")
    
    servers = lb.get_active_servers()
    print(f"Active servers: {len(servers)}")
    for s in servers:
        print(f"  - {s['name']}: {s['ip_address']}")
    
    print("\n=== Server Selection Tests ===")
    
    for strategy in ['round-robin', 'least-connections', 'weighted-random', 'load-based']:
        server = lb.select_server(strategy=strategy)
        if server:
            print(f"{strategy}: Selected {server['name']}")
        else:
            print(f"{strategy}: No server selected")

