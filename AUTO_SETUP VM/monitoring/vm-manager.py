#!/usr/bin/env python3
"""
VM Manager CLI Tool
Command-line interface để quản lý multi-VM system
"""

import sys
import argparse
sys.path.append('/opt/xray-monitor')

from server_manager import ServerManager
from load_balancer import LoadBalancer
from user_migration import UserMigration, init_migration_db
from health_monitor import HealthMonitor
from auto_failover import AutoFailover
from traffic_aggregator import TrafficAggregator


def cmd_servers_list(args):
    """List all servers"""
    sm = ServerManager()
    servers = sm.get_all_servers()
    
    if not servers:
        print("No servers configured")
        return
    
    print(f"\n{'='*80}")
    print(f"{'ID':<5} {'Name':<20} {'IP':<18} {'Region':<15} {'Status':<10} {'Users':<10}")
    print(f"{'='*80}")
    
    for s in servers:
        users = f"{s.get('current_users', 0)}/{s.get('max_users', 100)}"
        print(f"{s['id']:<5} {s['name']:<20} {s['ip_address']:<18} {s.get('region', 'N/A'):<15} {s['status']:<10} {users:<10}")
    
    print(f"{'='*80}\n")


def cmd_servers_add(args):
    """Add new server"""
    sm = ServerManager()
    
    result = sm.add_server(
        name=args.name,
        ip=args.ip,
        region=args.region,
        ssh_user=args.ssh_user,
        ssh_key_path=args.ssh_key
    )
    
    if result['success']:
        print(f"✅ Server added successfully (ID: {result['server_id']})")
    else:
        print(f"❌ Failed: {result.get('error')}")


def cmd_servers_delete(args):
    """Delete server"""
    sm = ServerManager()
    
    confirm = input(f"Are you sure you want to delete server ID {args.id}? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Cancelled")
        return
    
    result = sm.delete_server(args.id)
    
    if result['success']:
        print(f"✅ Server deleted successfully")
    else:
        print(f"❌ Failed: {result.get('error')}")


def cmd_servers_health(args):
    """Check server health"""
    hm = HealthMonitor()
    
    if args.all:
        print("Running health check on all servers...")
        results = hm.check_all_servers()
        print(f"\n✅ Checked {len(results)} servers")
    else:
        sm = ServerManager()
        stats = sm.get_server_stats(args.id)
        
        if stats:
            print("\n📊 Server Stats:")
            print(f"  CPU: {stats['cpu']:.1f}%")
            print(f"  RAM: {stats['ram']:.1f}%")
            print(f"  Disk: {stats['disk']:.1f}%")
            print(f"  Connections: {stats['connections']}")
        else:
            print("❌ Health check failed")


def cmd_users_assign(args):
    """Assign user to server"""
    lb = LoadBalancer()
    
    result = lb.assign_user_to_server(
        user_id=args.user_id,
        user_uuid=args.uuid,
        user_name=args.username,
        user_region=args.region
    )
    
    if result['success']:
        print(f"✅ User assigned to server: {result['server_name']} ({result['server_ip']})")
    else:
        print(f"❌ Failed: {result.get('error')}")


def cmd_users_migrate(args):
    """Migrate user to another server"""
    migration = UserMigration()
    
    # Get current server
    user_server = migration.get_user_server(args.user_id)
    
    if not user_server:
        print(f"❌ User {args.user_id} not assigned to any server")
        return
    
    print(f"Current server: {user_server['server_name']}")
    print(f"Target server: {args.to_server_id}")
    
    confirm = input("Proceed with migration? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Cancelled")
        return
    
    result = migration.migrate_user(
        args.user_id,
        user_server['server_id'],
        args.to_server_id
    )
    
    if result['success']:
        print(f"✅ User migrated successfully")
    else:
        print(f"❌ Failed: {result.get('error')}")


def cmd_loadbalancer_config(args):
    """Configure load balancer"""
    lb = LoadBalancer()
    
    if args.show:
        config = lb.get_config()
        print("\n📋 Load Balancer Config:")
        print(f"  Strategy: {config.get('strategy')}")
        print(f"  Enabled: {config.get('enabled')}")
        print(f"  Auto-failover: {config.get('auto_failover')}")
        print(f"  Health check interval: {config.get('health_check_interval')}s")
    else:
        result = lb.update_config(
            strategy=args.strategy,
            enabled=args.enabled,
            auto_failover=args.auto_failover
        )
        
        if result['success']:
            print("✅ Config updated")
        else:
            print(f"❌ Failed: {result.get('error')}")


def cmd_failover_trigger(args):
    """Trigger manual failover"""
    failover = AutoFailover()
    
    confirm = input(f"Trigger failover for server {args.server_id}? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Cancelled")
        return
    
    result = failover.execute_failover(args.server_id)
    
    if result['success']:
        print(f"✅ Failover completed: {result['migrated']} users migrated")
    else:
        print(f"❌ Failed: {result.get('error')}")


def cmd_traffic_collect(args):
    """Collect traffic from all servers"""
    aggregator = TrafficAggregator()
    
    print("Collecting traffic from all servers...")
    aggregator.collect_all()
    print("✅ Collection completed")


def cmd_traffic_top(args):
    """Show top users by traffic"""
    aggregator = TrafficAggregator()
    
    users = aggregator.get_top_users_by_traffic(limit=args.limit)
    
    print(f"\n{'='*80}")
    print(f"{'Rank':<6} {'Username':<20} {'Upload (GB)':<15} {'Download (GB)':<15} {'Total (GB)':<15}")
    print(f"{'='*80}")
    
    for i, user in enumerate(users, 1):
        upload_gb = user['total_upload'] / 1024 / 1024 / 1024
        download_gb = user['total_download'] / 1024 / 1024 / 1024
        total_gb = user['total_traffic'] / 1024 / 1024 / 1024
        
        print(f"{i:<6} {user['username']:<20} {upload_gb:<15.2f} {download_gb:<15.2f} {total_gb:<15.2f}")
    
    print(f"{'='*80}\n")


def main():
    parser = argparse.ArgumentParser(description='VM Manager CLI - Multi-VM Management Tool')
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Servers commands
    servers_parser = subparsers.add_parser('servers', help='Server management')
    servers_sub = servers_parser.add_subparsers(dest='action')
    
    servers_sub.add_parser('list', help='List all servers')
    
    add_parser = servers_sub.add_parser('add', help='Add new server')
    add_parser.add_argument('--name', required=True, help='Server name')
    add_parser.add_argument('--ip', required=True, help='Server IP')
    add_parser.add_argument('--region', required=True, help='Server region')
    add_parser.add_argument('--ssh-user', default='root', help='SSH user')
    add_parser.add_argument('--ssh-key', default='~/.ssh/id_rsa', help='SSH key path')
    
    delete_parser = servers_sub.add_parser('delete', help='Delete server')
    delete_parser.add_argument('id', type=int, help='Server ID')
    
    health_parser = servers_sub.add_parser('health', help='Check server health')
    health_parser.add_argument('--id', type=int, help='Server ID')
    health_parser.add_argument('--all', action='store_true', help='Check all servers')
    
    # Users commands
    users_parser = subparsers.add_parser('users', help='User management')
    users_sub = users_parser.add_subparsers(dest='action')
    
    assign_parser = users_sub.add_parser('assign', help='Assign user to server')
    assign_parser.add_argument('--user-id', type=int, required=True)
    assign_parser.add_argument('--uuid', required=True)
    assign_parser.add_argument('--username', required=True)
    assign_parser.add_argument('--region', help='User region')
    
    migrate_parser = users_sub.add_parser('migrate', help='Migrate user')
    migrate_parser.add_argument('user_id', type=int, help='User ID')
    migrate_parser.add_argument('to_server_id', type=int, help='Target server ID')
    
    # Load balancer commands
    lb_parser = subparsers.add_parser('loadbalancer', help='Load balancer management')
    lb_parser.add_argument('--show', action='store_true', help='Show config')
    lb_parser.add_argument('--strategy', choices=['round-robin', 'least-connections', 'weighted-random', 'load-based', 'geo-based'])
    lb_parser.add_argument('--enabled', type=int, choices=[0, 1])
    lb_parser.add_argument('--auto-failover', type=int, choices=[0, 1])
    
    # Failover commands
    failover_parser = subparsers.add_parser('failover', help='Failover management')
    failover_parser.add_argument('server_id', type=int, help='Server ID to failover')
    
    # Traffic commands
    traffic_parser = subparsers.add_parser('traffic', help='Traffic management')
    traffic_sub = traffic_parser.add_subparsers(dest='action')
    
    traffic_sub.add_parser('collect', help='Collect traffic from all servers')
    
    top_parser = traffic_sub.add_parser('top', help='Show top users by traffic')
    top_parser.add_argument('--limit', type=int, default=10, help='Number of users to show')
    
    # Parse args
    args = parser.parse_args()
    
    # Route to commands
    if args.command == 'servers':
        if args.action == 'list':
            cmd_servers_list(args)
        elif args.action == 'add':
            cmd_servers_add(args)
        elif args.action == 'delete':
            cmd_servers_delete(args)
        elif args.action == 'health':
            cmd_servers_health(args)
    
    elif args.command == 'users':
        if args.action == 'assign':
            cmd_users_assign(args)
        elif args.action == 'migrate':
            cmd_users_migrate(args)
    
    elif args.command == 'loadbalancer':
        cmd_loadbalancer_config(args)
    
    elif args.command == 'failover':
        cmd_failover_trigger(args)
    
    elif args.command == 'traffic':
        if args.action == 'collect':
            cmd_traffic_collect(args)
        elif args.action == 'top':
            cmd_traffic_top(args)
    
    else:
        parser.print_help()


if __name__ == '__main__':
    # Initialize migration table
    init_migration_db()
    
    main()

