# 🔌 Xray VPS Monitor - REST API Documentation

Complete REST API reference for controlling Xray VPS Monitor programmatically.

## 📋 Base URL

```
http://YOUR_VPS_IP:8080
```

## 🔐 Authentication

All API endpoints require authentication. You must first login to obtain a session cookie.

### Login
```bash
curl -c cookies.txt -X POST http://YOUR_VPS_IP:8080/login \
  -d "username=admin&password=admin"
```

Then use the cookie for subsequent requests:
```bash
curl -b cookies.txt http://YOUR_VPS_IP:8080/api/stats
```

---

## 📊 Stats & Monitoring APIs

### GET /api/stats
Get current system statistics.

**Response:**
```json
{
  "timestamp": "2025-10-28 00:40:00",
  "xray_status": "Running",
  "connections": 5,
  "bandwidth": {
    "sent_mb": 1234.56,
    "recv_mb": 5678.90,
    "sent_gb": 1.21,
    "recv_gb": 5.55
  },
  "system": {
    "cpu": 15.2,
    "ram_used": 1.5,
    "ram_total": 4.0,
    "ram_percent": 37.5,
    "disk_used": 8.2,
    "disk_total": 30.0,
    "disk_percent": 27.3
  },
  "uptime": "5d 3h 25m"
}
```

### GET /api/bandwidth/history?hours=24
Get bandwidth history.

**Parameters:**
- `hours` (optional): Number of hours to retrieve (default: 24)

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": 1,
      "timestamp": "2025-10-28 00:00:00",
      "bytes_sent": 123456789,
      "bytes_recv": 987654321,
      "delta_sent": 12345,
      "delta_recv": 98765
    }
  ]
}
```

---

## 👥 User Management APIs

### GET /api/users
Get all users.

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "user1",
      "uuid": "12345678-1234-1234-1234-123456789abc",
      "email": "user1@example.com",
      "created_at": "2025-10-28 00:00:00",
      "enabled": 1,
      "total_upload": 0,
      "total_download": 0,
      "traffic_limit": 0,
      "notes": ""
    }
  ]
}
```

### POST /api/users/add
Add new user.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "traffic_limit": 53687091200,
  "notes": "Test user"
}
```

**Response:**
```json
{
  "success": true,
  "user_id": 2,
  "uuid": "87654321-4321-4321-4321-cba987654321"
}
```

### PUT /api/users/{user_id}
Update user.

**Request Body:**
```json
{
  "username": "updated_name",
  "enabled": 1,
  "traffic_limit": 107374182400
}
```

### DELETE /api/users/{user_id}
Delete user.

**Response:**
```json
{
  "success": true
}
```

### GET /api/users/{user_id}/qr
Get QR code image for user config.

**Response:** PNG image

---

## 📜 Logs APIs

### GET /api/logs/xray?lines=100
Get Xray service logs.

**Parameters:**
- `lines` (optional): Number of log lines to retrieve (default: 100)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "1730073600000000",
      "message": "Xray started successfully",
      "priority": "6"
    }
  ]
}
```

### GET /api/logs/connections
Get active connections.

**Response:**
```json
{
  "success": true,
  "connections": [
    {
      "proto": "tcp",
      "state": "ESTAB",
      "local": "0.0.0.0:443",
      "remote": "1.2.3.4:12345",
      "process": "xray"
    }
  ]
}
```

---

## ⚡ Speed Test API

### GET /api/speedtest
Run internet speed test.

**Response:**
```json
{
  "success": true,
  "result": {
    "ping": "5.23 ms",
    "download": "892.45 Mbit/s",
    "upload": "456.78 Mbit/s"
  }
}
```

---

## 🎛️ Xray Control APIs

### POST /api/xray/restart
Restart Xray service.

**Response:**
```json
{
  "success": true,
  "message": "Xray restarted successfully"
}
```

### POST /api/xray/stop
Stop Xray service.

**Response:**
```json
{
  "success": true,
  "message": "Xray stopped successfully"
}
```

### POST /api/xray/start
Start Xray service.

**Response:**
```json
{
  "success": true,
  "message": "Xray started successfully"
}
```

### GET /api/xray/status
Get Xray service status.

**Response:**
```json
{
  "success": true,
  "status": "active",
  "details": "● xray.service - Xray Service\n   Loaded: loaded...\n   Active: active (running)..."
}
```

### GET /api/system/info
Get complete system information.

**Response:**
```json
{
  "success": true,
  "data": {
    "xray": {
      "status": "running",
      "connections": 5
    },
    "bandwidth": {
      "sent_gb": 1.21,
      "recv_gb": 5.55
    },
    "system": {
      "cpu": 15.2,
      "ram_percent": 37.5,
      "disk_percent": 27.3
    },
    "uptime": "5d 3h 25m",
    "users": 3
  }
}
```

---

## 💡 Usage Examples

### Python Example
```python
import requests

# Login
session = requests.Session()
session.post('http://YOUR_VPS_IP:8080/login', 
             data={'username': 'admin', 'password': 'admin'})

# Get stats
stats = session.get('http://YOUR_VPS_IP:8080/api/stats').json()
print(f"Connections: {stats['connections']}")

# Add user
new_user = session.post('http://YOUR_VPS_IP:8080/api/users/add', 
                       json={'username': 'newuser', 'email': 'test@example.com'}).json()
print(f"UUID: {new_user['uuid']}")

# Restart Xray
session.post('http://YOUR_VPS_IP:8080/api/xray/restart')
```

### cURL Example
```bash
# Login and save cookie
curl -c cookies.txt -X POST http://YOUR_VPS_IP:8080/login \
  -d "username=admin&password=admin"

# Get stats
curl -b cookies.txt http://YOUR_VPS_IP:8080/api/stats

# Add user
curl -b cookies.txt -X POST http://YOUR_VPS_IP:8080/api/users/add \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","email":"test@example.com"}'

# Restart Xray
curl -b cookies.txt -X POST http://YOUR_VPS_IP:8080/api/xray/restart
```

### JavaScript Example
```javascript
// Login
await fetch('http://YOUR_VPS_IP:8080/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/x-www-form-urlencoded'},
  body: 'username=admin&password=admin',
  credentials: 'include'
});

// Get stats
const stats = await fetch('http://YOUR_VPS_IP:8080/api/stats', {
  credentials: 'include'
}).then(r => r.json());

// Add user
const user = await fetch('http://YOUR_VPS_IP:8080/api/users/add', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username: 'newuser', email: 'test@example.com'}),
  credentials: 'include'
}).then(r => r.json());
```

---

## 🔒 Security Notes

1. **Always use HTTPS in production** (consider adding nginx reverse proxy with SSL)
2. **Change default password** immediately after installation
3. **Restrict API access** to trusted IP addresses using firewall rules
4. **Use strong passwords** for all accounts
5. **Keep session cookies secure** and don't expose them

---

## ⚠️ Error Responses

All APIs return consistent error format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `401` - Unauthorized (need to login)
- `404` - Not found
- `500` - Internal server error

