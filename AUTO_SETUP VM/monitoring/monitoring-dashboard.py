#!/usr/bin/env python3
"""
Xray VPS Monitoring Dashboard
Real-time web UI để monitor VPS
"""

from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash, send_file
import subprocess
import psutil
import json
from datetime import datetime
import os
import hashlib
import secrets
import qrcode
from io import BytesIO
import base64

# Import user manager and bandwidth tracker
import sys
import os

# Add both possible paths for imports
sys.path.append('/opt/xray-monitor')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from user_manager import UserManager
from bandwidth_tracker import BandwidthTracker

# Import server manager
try:
    from server_manager import ServerManager
    server_manager = ServerManager()
    print(f"✅ Server manager loaded successfully")
except ImportError as e:
    server_manager = None
    print(f"⚠️ Server manager not available: {e}")
except Exception as e:
    server_manager = None
    print(f"❌ Server manager error: {e}")

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.secret_key = secrets.token_hex(32)  # Random secret key for sessions

# Initialize managers
user_manager = UserManager()
bandwidth_tracker = BandwidthTracker()

# Login credentials
USERS = {
    'Ngocduong2509': hashlib.sha256('Ngocduong2509'.encode()).hexdigest()
}

def check_auth():
    """Kiểm tra xem user đã login chưa"""
    return session.get('logged_in', False)

def verify_password(username, password):
    """Verify username và password"""
    if username in USERS:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        return USERS[username] == password_hash
    return False

def get_xray_status():
    """Kiểm tra Xray service status"""
    try:
        result = subprocess.run(['systemctl', 'is-active', 'xray'], 
                              capture_output=True, text=True)
        return result.stdout.strip() == 'active'
    except:
        return False

def get_connections():
    """Đếm số connections đang active"""
    try:
        # Đếm connections trên port 443
        result = subprocess.run(['ss', '-an'], capture_output=True, text=True)
        lines = result.stdout.split('\n')
        count = sum(1 for line in lines if ':443' in line and 'ESTAB' in line)
        return count
    except:
        return 0

def get_bandwidth():
    """Lấy bandwidth usage"""
    try:
        net_io = psutil.net_io_counters()
        return {
            'sent_mb': round(net_io.bytes_sent / 1024 / 1024, 2),
            'recv_mb': round(net_io.bytes_recv / 1024 / 1024, 2),
            'sent_gb': round(net_io.bytes_sent / 1024 / 1024 / 1024, 2),
            'recv_gb': round(net_io.bytes_recv / 1024 / 1024 / 1024, 2)
        }
    except:
        return {'sent_mb': 0, 'recv_mb': 0, 'sent_gb': 0, 'recv_gb': 0}

def get_system_stats():
    """Lấy CPU, RAM stats"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            'cpu': round(cpu_percent, 1),
            'ram_used': round(mem.used / 1024 / 1024 / 1024, 2),
            'ram_total': round(mem.total / 1024 / 1024 / 1024, 2),
            'ram_percent': round(mem.percent, 1),
            'disk_used': round(disk.used / 1024 / 1024 / 1024, 2),
            'disk_total': round(disk.total / 1024 / 1024 / 1024, 2),
            'disk_percent': round(disk.percent, 1)
        }
    except Exception as e:
        return {
            'cpu': 0, 'ram_used': 0, 'ram_total': 0, 
            'ram_percent': 0, 'disk_used': 0, 'disk_total': 0, 'disk_percent': 0
        }

def get_uptime():
    """Lấy uptime"""
    try:
        with open('/proc/uptime', 'r') as f:
            uptime_seconds = float(f.readline().split()[0])
            days = int(uptime_seconds // 86400)
            hours = int((uptime_seconds % 86400) // 3600)
            minutes = int((uptime_seconds % 3600) // 60)
            return f"{days}d {hours}h {minutes}m"
    except:
        return "Unknown"

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if verify_password(username, password):
            session['logged_in'] = True
            session['username'] = username
            flash('Login successful!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password', 'error')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    """Logout"""
    session.clear()
    flash('Logged out successfully', 'success')
    return redirect(url_for('login'))

@app.route('/')
def index():
    """Main dashboard page"""
    if not check_auth():
        return redirect(url_for('login'))
    return render_template('dashboard.html', username=session.get('username'))

@app.route('/api/stats')
def api_stats():
    """API endpoint cho stats"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    stats = {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'xray_status': 'Running' if get_xray_status() else 'Stopped',
        'connections': get_connections(),
        'bandwidth': get_bandwidth(),
        'system': get_system_stats(),
        'uptime': get_uptime()
    }
    return jsonify(stats)

# ============= USER MANAGEMENT ROUTES =============

@app.route('/users')
def users():
    """User management page"""
    if not check_auth():
        return redirect(url_for('login'))
    
    users = user_manager.get_all_users()
    return render_template('users.html', users=users, username=session.get('username'))

@app.route('/api/users', methods=['GET'])
def api_get_users():
    """API: Get all users"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    users = user_manager.get_all_users()
    return jsonify({'success': True, 'users': users})

@app.route('/api/users/add', methods=['POST'])
def api_add_user():
    """API: Add new user"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    username = data.get('username')
    email = data.get('email', '')
    traffic_limit = int(data.get('traffic_limit', 0))
    device_limit = int(data.get('device_limit', 3))
    notes = data.get('notes', '')
    
    if not username:
        return jsonify({'success': False, 'error': 'Username is required'})
    
    result = user_manager.add_user(username, email, traffic_limit, device_limit, notes)
    return jsonify(result)

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def api_update_user(user_id):
    """API: Update user"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    result = user_manager.update_user(user_id, **data)
    return jsonify(result)

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def api_delete_user(user_id):
    """API: Delete user"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    result = user_manager.delete_user(user_id)
    return jsonify(result)

@app.route('/api/users/<int:user_id>/qr')
def api_get_qr(user_id):
    """API: Get QR code for user"""
    if not check_auth():
        return redirect(url_for('login'))
    
    # Get server IP
    server_ip = request.host.split(':')[0]
    
    config_str = user_manager.generate_qr_config(user_id, server_ip)
    if not config_str:
        return "User not found", 404
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(config_str)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    img_io = BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    return send_file(img_io, mimetype='image/png')

# ============= BANDWIDTH CHART ROUTES =============

@app.route('/api/bandwidth/history')
def api_bandwidth_history():
    """API: Get bandwidth history"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    hours = request.args.get('hours', 24, type=int)
    history = bandwidth_tracker.get_history(hours)
    
    return jsonify({'success': True, 'history': history})

# ============= CONNECTION LOGS ROUTES =============

@app.route('/logs')
def logs_page():
    """Connection logs page"""
    if not check_auth():
        return redirect(url_for('login'))
    return render_template('logs.html', username=session.get('username'))

@app.route('/api/logs/xray')
def api_xray_logs():
    """API: Get Xray logs"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    lines = request.args.get('lines', 100, type=int)
    
    try:
        # Get Xray logs from journalctl
        result = subprocess.run(
            ['journalctl', '-u', 'xray', '-n', str(lines), '--no-pager', '-o', 'json'],
            capture_output=True, text=True
        )
        
        logs = []
        for line in result.stdout.strip().split('\n'):
            if line:
                try:
                    log_entry = json.loads(line)
                    logs.append({
                        'timestamp': log_entry.get('__REALTIME_TIMESTAMP', ''),
                        'message': log_entry.get('MESSAGE', ''),
                        'priority': log_entry.get('PRIORITY', '6')
                    })
                except:
                    pass
        
        return jsonify({'success': True, 'logs': logs})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/logs/connections')
def api_connection_logs():
    """API: Get active connections"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Get active connections on port 443
        result = subprocess.run(
            ['ss', '-tunp', 'state', 'established', '( dport = :443 or sport = :443 )'],
            capture_output=True, text=True
        )
        
        connections = []
        for line in result.stdout.split('\n')[1:]:  # Skip header
            if line.strip():
                parts = line.split()
                if len(parts) >= 5:
                    connections.append({
                        'proto': parts[0],
                        'state': parts[1],
                        'local': parts[4],
                        'remote': parts[5] if len(parts) > 5 else '',
                        'process': parts[6] if len(parts) > 6 else ''
                    })
        
        return jsonify({'success': True, 'connections': connections})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ============= SPEED TEST ROUTES =============

@app.route('/api/speedtest')
def api_speedtest():
    """API: Run speed test"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Check if speedtest-cli is installed
        check = subprocess.run(['which', 'speedtest-cli'], capture_output=True)
        if check.returncode != 0:
            return jsonify({
                'success': False, 
                'error': 'speedtest-cli not installed. Install with: sudo apt install speedtest-cli'
            })
        
        # Run speedtest
        result = subprocess.run(
            ['speedtest-cli', '--simple'],
            capture_output=True, text=True, timeout=60
        )
        
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            data = {}
            for line in lines:
                if 'Ping:' in line:
                    data['ping'] = line.split(':')[1].strip()
                elif 'Download:' in line:
                    data['download'] = line.split(':')[1].strip()
                elif 'Upload:' in line:
                    data['upload'] = line.split(':')[1].strip()
            
            return jsonify({'success': True, 'result': data})
        else:
            return jsonify({'success': False, 'error': result.stderr})
    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Speed test timed out'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ============= RESTFUL API FOR XRAY CONTROL =============

@app.route('/api/xray/restart', methods=['POST'])
def api_xray_restart():
    """API: Restart Xray service"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        result = subprocess.run(['systemctl', 'restart', 'xray'], capture_output=True, text=True)
        if result.returncode == 0:
            return jsonify({'success': True, 'message': 'Xray restarted successfully'})
        else:
            return jsonify({'success': False, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/xray/stop', methods=['POST'])
def api_xray_stop():
    """API: Stop Xray service"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        result = subprocess.run(['systemctl', 'stop', 'xray'], capture_output=True, text=True)
        if result.returncode == 0:
            return jsonify({'success': True, 'message': 'Xray stopped successfully'})
        else:
            return jsonify({'success': False, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/xray/start', methods=['POST'])
def api_xray_start():
    """API: Start Xray service"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        result = subprocess.run(['systemctl', 'start', 'xray'], capture_output=True, text=True)
        if result.returncode == 0:
            return jsonify({'success': True, 'message': 'Xray started successfully'})
        else:
            return jsonify({'success': False, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/xray/status', methods=['GET'])
def api_xray_status():
    """API: Get Xray service status"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        result = subprocess.run(['systemctl', 'status', 'xray', '--no-pager'], 
                              capture_output=True, text=True)
        
        is_active = subprocess.run(['systemctl', 'is-active', 'xray'], 
                                  capture_output=True, text=True).stdout.strip()
        
        return jsonify({
            'success': True, 
            'status': is_active,
            'details': result.stdout
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/system/info', methods=['GET'])
def api_system_info():
    """API: Get full system information"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        info = {
            'xray': {
                'status': 'running' if get_xray_status() else 'stopped',
                'connections': get_connections()
            },
            'bandwidth': get_bandwidth(),
            'system': get_system_stats(),
            'uptime': get_uptime(),
            'users': len(user_manager.get_all_users())
        }
        return jsonify({'success': True, 'data': info})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ============= TRAFFIC LIMIT ROUTES =============

@app.route('/api/users/<int:user_id>/reset-traffic', methods=['POST'])
def api_reset_user_traffic(user_id):
    """API: Reset user traffic counters"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        conn = sqlite3.connect('/opt/xray-monitor/users.db')
        c = conn.cursor()
        c.execute('UPDATE users SET total_upload = 0, total_download = 0 WHERE id = ?', (user_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Traffic reset successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ============= GEOIP ROUTES =============

@app.route('/api/geoip/status')
def api_geoip_status():
    """API: Check if GeoIP is configured"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        import os
        geoip_file = '/usr/local/share/xray/geoip.dat'
        geosite_file = '/usr/local/share/xray/geosite.dat'
        
        geoip_exists = os.path.exists(geoip_file)
        geosite_exists = os.path.exists(geosite_file)
        
        # Check config for routing rules
        with open('/usr/local/etc/xray/config.json', 'r') as f:
            config = json.load(f)
        
        has_routing = 'routing' in config and 'rules' in config.get('routing', {})
        
        return jsonify({
            'success': True,
            'geoip_installed': geoip_exists,
            'geosite_installed': geosite_exists,
            'routing_configured': has_routing,
            'status': 'enabled' if (geoip_exists and has_routing) else 'disabled'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ============= SERVERS MANAGEMENT ROUTES =============

@app.route('/servers')
def servers_page():
    """Servers management page"""
    if not check_auth():
        return redirect(url_for('login'))
    return render_template('servers.html', username=session.get('username'))

@app.route('/api/servers', methods=['GET'])
def api_get_servers():
    """API: Get all servers"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not server_manager:
        return jsonify({'success': False, 'error': 'Server manager not available'})
    
    try:
        servers = server_manager.get_all_servers()
        return jsonify({'success': True, 'servers': servers})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/servers/add', methods=['POST'])
def api_add_server():
    """API: Add new server"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not server_manager:
        return jsonify({'success': False, 'error': 'Server manager not available'})
    
    try:
        data = request.get_json()
        name = data.get('name')
        ip = data.get('ip')
        region = data.get('region')
        ssh_user = data.get('ssh_user', 'root')
        ssh_key_path = data.get('ssh_key_path', '~/.ssh/id_rsa')
        
        if not name or not ip or not region:
            return jsonify({'success': False, 'error': 'Missing required fields'})
        
        result = server_manager.add_server(name, ip, region, ssh_user, ssh_key_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/servers/<int:server_id>', methods=['DELETE'])
def api_delete_server(server_id):
    """API: Delete server"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not server_manager:
        return jsonify({'success': False, 'error': 'Server manager not available'})
    
    try:
        result = server_manager.delete_server(server_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/servers/<int:server_id>/update', methods=['PUT'])
def api_update_server(server_id):
    """API: Update server configuration"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not server_manager:
        return jsonify({'success': False, 'error': 'Server manager not available'})
    
    try:
        data = request.get_json()
        # Update server info using server_manager
        update_fields = {}
        if 'ip' in data:
            update_fields['ip_address'] = data['ip']
        if 'region' in data:
            update_fields['region'] = data['region']
        if 'ssh_user' in data:
            update_fields['ssh_user'] = data['ssh_user']
        if 'ssh_key_path' in data:
            update_fields['ssh_key_path'] = data['ssh_key_path']
        if 'max_users' in data:
            update_fields['max_users'] = data['max_users']
        if 'status' in data:
            update_fields['status'] = data['status']
        
        server_manager.update_server_info(server_id, **update_fields)
        return jsonify({'success': True, 'message': 'Server updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/servers/<int:server_id>/health', methods=['GET'])
def api_server_health(server_id):
    """API: Check server health"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not server_manager:
        return jsonify({'success': False, 'error': 'Server manager not available'})
    
    try:
        stats = server_manager.get_server_stats(server_id)
        if stats:
            return jsonify({'success': True, 'stats': stats})
        else:
            return jsonify({'success': False, 'error': 'Health check failed'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ============= SETTINGS ROUTES =============

@app.route('/settings')
def settings_page():
    """Settings page"""
    if not check_auth():
        return redirect(url_for('login'))
    return render_template('settings.html', username=session.get('username'))

@app.route('/api/settings/password', methods=['POST'])
def api_change_password():
    """API: Change password"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    # Verify current password
    username = session.get('username')
    if not verify_password(username, current_password):
        return jsonify({'success': False, 'error': 'Current password is incorrect'})
    
    # Update password (in-memory only, requires restart to persist)
    USERS[username] = hashlib.sha256(new_password.encode()).hexdigest()
    
    return jsonify({
        'success': True, 
        'message': 'Password changed! Please update in /opt/xray-monitor/monitoring-dashboard.py for persistence'
    })

# ============= SSH KEY ROUTES =============

@app.route('/api/ssh/public-key', methods=['GET'])
def api_get_ssh_public_key():
    """API: Get or generate SSH public key"""
    if not check_auth():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        ssh_key_path = os.path.expanduser('~/.ssh/id_rsa')
        ssh_pub_path = os.path.expanduser('~/.ssh/id_rsa.pub')
        
        # Generate SSH key if not exists
        if not os.path.exists(ssh_key_path):
            os.makedirs(os.path.expanduser('~/.ssh'), mode=0o700, exist_ok=True)
            result = subprocess.run(
                ['ssh-keygen', '-t', 'rsa', '-b', '4096', '-f', ssh_key_path, '-N', '', '-C', 'xray-monitor'],
                capture_output=True, text=True
            )
            if result.returncode != 0:
                return jsonify({'success': False, 'error': 'Failed to generate SSH key'})
        
        # Read public key
        if os.path.exists(ssh_pub_path):
            with open(ssh_pub_path, 'r') as f:
                public_key = f.read().strip()
            return jsonify({'success': True, 'public_key': public_key})
        else:
            return jsonify({'success': False, 'error': 'Public key not found'})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    # Chạy trên tất cả interfaces, port 8080
    app.run(host='0.0.0.0', port=8080, debug=False)

