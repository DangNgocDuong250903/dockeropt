# 🎛️ Script Control Panel

Modern web-based control panel để quản lý và chạy scripts từ trình duyệt.

## ✨ Features

- 🎨 **Modern UI** - Tailwind CSS, glassmorphism, gradient effects
- 🌙 **Dark/Light Mode** - Toggle theme với localStorage persistence
- 📊 **Dashboard Stats** - Thống kê scripts theo loại (.ps1, .py, .sh, .bat)
- 🔍 **Advanced Search** - Filter theo tên và loại file
- 📱 **Responsive Design** - Hoạt động tốt trên mobile & desktop
- ⚡ **Real-time Logs** - Auto-refresh logs với highlighting
- 🎯 **Grid/List View** - Chuyển đổi giữa 2 chế độ xem
- 📥 **Download Logs** - Export execution logs
- ⌨️ **Keyboard Shortcuts** - Ctrl+R để refresh, End để scroll to bottom

## 🚀 Quick Start

### 1. Cài đặt dependencies

```bash
cd script_panel
pip install -r requirements.txt
```

### 2. Chạy server

```bash
# Development mode
python app.py

# Production mode
export HOST=0.0.0.0
export PORT=5173
python app.py
```

### 3. Truy cập

Mở browser: `http://localhost:5173`

## 📋 Supported Script Types

| Type | Extension | Icon |
|------|-----------|------|
| PowerShell | `.ps1` | 🪟 Windows |
| Python | `.py` | 🐍 Python |
| Shell | `.sh` | 💻 Terminal |
| Batch | `.bat` | 📄 Batch |
| Command | `.cmd` | 📄 Command |

## 🎨 UI Components

### 📊 Stats Dashboard
- Total scripts count
- Scripts by type (PowerShell, Python, Shell)
- Quick overview

### 🔍 Search & Filter
- Real-time search by name/path
- Filter by script type
- Clear filters button
- Visible count indicator

### 📜 Script Cards
- Color-coded by type
- Icon indicators
- Hover effects with glow
- One-click execution
- Path & metadata display

### 📝 Log Viewer
- Real-time updates (auto-refresh every 1.5s)
- Status indicators (Running, Success, Failed)
- Copy to clipboard
- Download logs
- Clear display
- Keyboard shortcuts

## 🎯 Keyboard Shortcuts

### Log Viewer
- `Ctrl + R` - Manual refresh
- `End` - Scroll to bottom

## 🔧 Configuration

### Environment Variables

```bash
# Server host (default: 127.0.0.1)
export HOST=0.0.0.0

# Server port (default: 5173)
export PORT=5000
```

### Base Directory

Scripts được tự động discover từ thư mục cha của `script_panel/`:

```python
BASE_DIR = Path(__file__).resolve().parents[1]  # AUTO/
```

### Skip Directories

Các thư mục này sẽ bị bỏ qua khi scan:

```python
SKIP_DIRS = {".git", ".venv", "venv", "node_modules", "script_panel"}
```

## 📂 Project Structure

```
script_panel/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── logs/                  # Execution logs (auto-created)
├── templates/
│   ├── base.html         # Base template with Tailwind
│   ├── index.html        # Scripts dashboard
│   ├── logs.html         # Logs listing
│   └── log_view.html     # Log viewer with real-time updates
└── static/
    └── styles.css        # Legacy CSS (can be removed)
```

## 🎨 Design System

### Colors

```
Primary: Blue (#3b82f6)
Secondary: Purple (#a855f7)
Success: Green (#22c55e)
Error: Red (#ef4444)
Warning: Yellow (#eab308)
```

### Typography

- Font: Inter (Google Fonts)
- Monospace: System monospace for code/logs

### Effects

- Glassmorphism: `backdrop-filter: blur(10px)`
- Gradients: Blue to Purple
- Hover effects: Scale, glow, color transitions
- Smooth animations: 200-300ms transitions

## 🔄 Auto-refresh

### Scripts List
- Auto-refresh every 30 seconds (optional, commented out)

### Logs List
- Auto-refresh every 10 seconds

### Log Viewer
- Auto-refresh every 1.5 seconds
- Toggle on/off with button
- Smart scroll (preserves position if not at bottom)
- Highlight new content

## 🚨 Error Handling

- Script execution errors hiển thị trong logs
- Failed runs được đánh dấu với status indicator
- Exit codes được hiển thị
- Error messages trong console output

## 📱 Mobile Support

- Responsive grid (1 column on mobile, 2+ on desktop)
- Touch-friendly buttons
- Collapsible navigation
- Optimized spacing

## 🔐 Security Notes

- Scripts chỉ chạy trong `BASE_DIR`
- Path validation to prevent directory traversal
- Scripts run với quyền của process owner
- Logs stored locally, không public

## 🚀 Production Deployment

### Using Gunicorn

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5173 app:app
```

### Using systemd

```ini
[Unit]
Description=Script Control Panel
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/script_panel
Environment="HOST=0.0.0.0"
Environment="PORT=5173"
ExecStart=/usr/bin/python3 app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## 💡 Tips

1. **Custom Script Icons**: Edit templates để thêm icons cho các loại files khác
2. **Theme Persistence**: Theme preference được lưu trong localStorage
3. **Log Retention**: Manually delete old logs từ `logs/` directory
4. **Performance**: Với nhiều scripts (100+), consider pagination
5. **Security**: Chỉ expose control panel trên local network hoặc qua VPN

## 🐛 Troubleshooting

### Scripts không hiển thị?
- Check `BASE_DIR` path
- Verify file extensions trong `SCRIPT_EXTS`
- Check permissions

### Không chạy được .sh scripts trên Windows?
- Cài WSL hoặc Git Bash
- Script sẽ tự động detect và sử dụng

### Logs không auto-refresh?
- Check browser console for errors
- Verify `/logs/<run_id>/raw` endpoint
- Disable browser extensions that block refresh

## 📝 TODO

- [ ] Add authentication/login
- [ ] Implement log cleanup API
- [ ] Add script favorites/bookmarks
- [ ] Script scheduling (cron-like)
- [ ] WebSocket for real-time updates
- [ ] Multi-user support with permissions
- [ ] Script templates & snippets
- [ ] Execution history charts

## 🤝 Contributing

Feel free to submit issues or PRs!

## 📄 License

MIT License

---

**Made with ❤️ for automation enthusiasts**

