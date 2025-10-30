#!/bin/bash

# Setup Bandwidth Tracker Service

set -e

echo "📊 Setting up Bandwidth Tracker..."

# Copy file
sudo cp bandwidth_tracker.py /opt/xray-monitor/

# Create systemd service
sudo bash -c 'cat > /etc/systemd/system/bandwidth-tracker.service <<EOF
[Unit]
Description=Xray Bandwidth Tracker
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xray-monitor
ExecStart=/usr/bin/python3 /opt/xray-monitor/bandwidth_tracker.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF'

# Start service
sudo systemctl daemon-reload
sudo systemctl enable bandwidth-tracker
sudo systemctl start bandwidth-tracker

echo "✅ Bandwidth Tracker started!"
sudo systemctl status bandwidth-tracker --no-pager

