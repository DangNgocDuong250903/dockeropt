#!/usr/bin/env python3
"""
Xray Agent - Chạy trên mỗi VM
Report stats về Central Dashboard qua REST API
"""

from flask import Flask, jsonify, request
import psutil
import subprocess
import json
import os
import sqlite3
from datetime import datetime
import requests
import threading
import time

app = Flask(__name__)

# Configuration
AGENT_VERSION = "1.0.0"
AGENT_PORT = 8081
CENTRAL_DASHBOARD_URL = os.getenv('CENTRAL_DASHBOARD_URL', '')  # Set qua env: http://main-server:5000
REGISTRATION_TOKEN = os.getenv('AGENT_TOKEN', 'default-secret-token')  # Security token
SERVER_ID = None  # Will be set after registration

# Local database for user stats
DB_FILE = '/opt/xray-monitor/agent.db'


def init_db():
    """Khởi tạo local database"""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Store local user stats
    c.execute('''
        CREATE TABLE IF NOT EXISTS local_user_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            upload_bytes INTEGER DEFAULT 0,
            download_bytes INTEGER DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()


def get_system_stats():
    """Lấy CPU, RAM, Disk stats"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        net = psutil.net_io_counters()
        
        return {
            'cpu_usage': round(cpu_percent, 1),
            'ram_usage': round(mem.percent, 1),
            'ram_total': round(mem.total / 1024 / 1024 / 1024, 2),  # GB
            'ram_used': round(mem.used / 1024 / 1024 / 1024, 2),
            'disk_usage': round(disk.percent, 1),
            'disk_total': round(disk.total / 1024 / 1024 / 1024, 2),
            'disk_used': round(disk.used / 1024 / 1024 / 1024, 2),
            'network_rx': net.bytes_recv,
            'network_tx': net.bytes_sent,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        return {'error': str(e)}


def get_xray_status():
    """Kiểm tra Xray service status"""
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', 'xray'],
            capture_output=True,
            text=True
        )
        
        is_active = result.stdout.strip() == 'active'
        
        # Get version
        version_result = subprocess.run(
            ['/usr/local/bin/xray', 'version'],
            capture_output=True,
            text=True
        )
        version = version_result.stdout.split('\n')[0] if version_result.returncode == 0 else 'Unknown'
        
        return {
            'status': 'running' if is_active else 'stopped',
            'version': version,
            'is_active': is_active
        }
    except Exception as e:
        return {'status': 'error', 'error': str(e)}


def get_active_connections():
    """Đếm số connections đang active trên port 443"""
    try:
        result = subprocess.run(
            ['ss', '-tn', 'state', 'established', '( dport = :443 or sport = :443 )'],
            capture_output=True,
            text=True
        )
        
        lines = result.stdout.strip().split('\n')
        count = max(0, len(lines) - 1)  # Exclude header
        
        return count
    except:
        return 0


def get_user_list():
    """Lấy danh sách users từ Xray config"""
    try:
        with open('/usr/local/etc/xray/config.json', 'r') as f:
            config = json.load(f)
        
        users = []
        for inbound in config.get('inbounds', []):
            if inbound.get('protocol') in ['vmess', 'vless']:
                clients = inbound.get('settings', {}).get('clients', [])
                for client in clients:
                    users.append({
                        'uuid': client.get('id'),
                        'email': client.get('email', ''),
                        'protocol': inbound.get('protocol')
                    })
        
        return users
    except Exception as e:
        return []


def get_traffic_stats():
    """Lấy traffic stats từ Xray API"""
    try:
        # Try to query Xray Stats API
        result = subprocess.run(
            ['/usr/local/bin/xray', 'api', 'statsquery', '--server=127.0.0.1:10085'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0 and result.stdout.strip():
            data = json.loads(result.stdout)
            
            user_stats = {}
            for stat in data.get('stat', []):
                name = stat.get('name', '')
                value = stat.get('value', 0)
                
                # Parse: user>>>email>>>traffic>>>uplink/downlink
                if 'user>>>' in name and '>>>traffic>>>' in name:
                    parts = name.split('>>>')
                    if len(parts) >= 4:
                        email = parts[1]
                        direction = parts[3]
                        
                        if email not in user_stats:
                            user_stats[email] = {'upload': 0, 'download': 0}
                        
                        if direction == 'uplink':
                            user_stats[email]['upload'] = int(value)
                        elif direction == 'downlink':
                            user_stats[email]['download'] = int(value)
            
            return user_stats
    except:
        pass
    
    return {}


# ============= REST API ENDPOINTS =============

@app.route('/api/ping', methods=['GET'])
def api_ping():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'agent_version': AGENT_VERSION,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/status', methods=['GET'])
def api_status():
    """Tổng hợp status của server"""
    return jsonify({
        'system': get_system_stats(),
        'xray': get_xray_status(),
        'connections': get_active_connections(),
        'agent_version': AGENT_VERSION
    })


@app.route('/api/stats', methods=['GET'])
def api_stats():
    """Chi tiết stats bao gồm traffic per user"""
    return jsonify({
        'system': get_system_stats(),
        'xray': get_xray_status(),
        'connections': get_active_connections(),
        'traffic': get_traffic_stats()
    })


@app.route('/api/users', methods=['GET'])
def api_users():
    """Danh sách users trên server này"""
    return jsonify({
        'users': get_user_list(),
        'count': len(get_user_list())
    })


@app.route('/api/config', methods=['POST'])
def api_update_config():
    """Update Xray config"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if token != REGISTRATION_TOKEN:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        new_config = request.get_json()
        
        # Backup old config
        subprocess.run(['cp', '/usr/local/etc/xray/config.json', '/usr/local/etc/xray/config.json.bak'])
        
        # Write new config
        with open('/usr/local/etc/xray/config.json', 'w') as f:
            json.dump(new_config, f, indent=2)
        
        # Restart Xray
        result = subprocess.run(['systemctl', 'restart', 'xray'], capture_output=True)
        
        if result.returncode == 0:
            return jsonify({'success': True, 'message': 'Config updated and Xray restarted'})
        else:
            # Rollback
            subprocess.run(['cp', '/usr/local/etc/xray/config.json.bak', '/usr/local/etc/xray/config.json'])
            return jsonify({'success': False, 'error': 'Restart failed, config rolled back'}), 500
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/restart', methods=['POST'])
def api_restart_xray():
    """Restart Xray service"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if token != REGISTRATION_TOKEN:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        result = subprocess.run(['systemctl', 'restart', 'xray'], capture_output=True)
        
        if result.returncode == 0:
            return jsonify({'success': True, 'message': 'Xray restarted successfully'})
        else:
            return jsonify({'success': False, 'error': result.stderr.decode()}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/logs', methods=['GET'])
def api_logs():
    """Get Xray logs"""
    lines = request.args.get('lines', 50, type=int)
    
    try:
        result = subprocess.run(
            ['journalctl', '-u', 'xray', '-n', str(lines), '--no-pager'],
            capture_output=True,
            text=True
        )
        
        return jsonify({
            'success': True,
            'logs': result.stdout.split('\n')
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============= BACKGROUND TASKS =============

def report_to_central():
    """Background task: Report stats to central dashboard periodically"""
    while True:
        try:
            if CENTRAL_DASHBOARD_URL and SERVER_ID:
                stats = {
                    'server_id': SERVER_ID,
                    'system': get_system_stats(),
                    'xray': get_xray_status(),
                    'connections': get_active_connections(),
                    'traffic': get_traffic_stats()
                }
                
                response = requests.post(
                    f"{CENTRAL_DASHBOARD_URL}/api/agent/report",
                    json=stats,
                    headers={'Authorization': f'Bearer {REGISTRATION_TOKEN}'},
                    timeout=10
                )
                
                if response.status_code == 200:
                    print(f"[{datetime.now()}] Stats reported to central dashboard")
                else:
                    print(f"[{datetime.now()}] Failed to report: {response.status_code}")
        except Exception as e:
            print(f"[{datetime.now()}] Error reporting to central: {e}")
        
        time.sleep(60)  # Report every 1 minute


def auto_register():
    """Auto-register with central dashboard on startup"""
    global SERVER_ID
    
    if not CENTRAL_DASHBOARD_URL:
        print("CENTRAL_DASHBOARD_URL not set, running in standalone mode")
        return
    
    try:
        # Get server info
        hostname = subprocess.run(['hostname'], capture_output=True, text=True).stdout.strip()
        ip = subprocess.run(['hostname', '-I'], capture_output=True, text=True).stdout.strip().split()[0]
        
        registration_data = {
            'hostname': hostname,
            'ip_address': ip,
            'agent_version': AGENT_VERSION,
            'agent_port': AGENT_PORT
        }
        
        response = requests.post(
            f"{CENTRAL_DASHBOARD_URL}/api/agent/register",
            json=registration_data,
            headers={'Authorization': f'Bearer {REGISTRATION_TOKEN}'},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            SERVER_ID = result.get('server_id')
            print(f"✅ Registered with central dashboard (Server ID: {SERVER_ID})")
        else:
            print(f"❌ Registration failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Auto-registration error: {e}")


# ============= MAIN =============

if __name__ == '__main__':
    print("=" * 50)
    print("   XRAY AGENT")
    print(f"   Version: {AGENT_VERSION}")
    print(f"   Port: {AGENT_PORT}")
    print("=" * 50)
    
    # Initialize database
    init_db()
    
    # Auto-register with central dashboard
    auto_register()
    
    # Start background reporting thread
    if CENTRAL_DASHBOARD_URL:
        reporter_thread = threading.Thread(target=report_to_central, daemon=True)
        reporter_thread.start()
        print("📊 Background reporting started")
    
    # Start Flask server
    print(f"🚀 Agent listening on port {AGENT_PORT}...")
    app.run(host='0.0.0.0', port=AGENT_PORT, debug=False)

