#!/bin/bash

# Setup Traffic Monitor Service

set -e

echo "📊 Setting up Traffic Monitor..."

# Create log directory
sudo mkdir -p /var/log/xray

# Copy file
sudo cp traffic_monitor.py /opt/xray-monitor/

# Create systemd service
sudo bash -c 'cat > /etc/systemd/system/traffic-monitor.service <<EOF
[Unit]
Description=Xray Traffic Monitor
After=network.target xray.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xray-monitor
ExecStart=/usr/bin/python3 /opt/xray-monitor/traffic_monitor.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF'

# Start service
sudo systemctl daemon-reload
sudo systemctl enable traffic-monitor
sudo systemctl start traffic-monitor

echo "✅ Traffic Monitor started!"
sudo systemctl status traffic-monitor --no-pager

