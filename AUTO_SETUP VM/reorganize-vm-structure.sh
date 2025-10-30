#!/bin/bash

# Script tổ chức lại cấu trúc thư mục trên VM
# Chạy: sudo bash reorganize-vm-structure.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}   REORGANIZE VM DIRECTORY STRUCTURE${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# Detect user home directory
if [ -n "$SUDO_USER" ]; then
    USER_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
    ACTUAL_USER="$SUDO_USER"
else
    USER_HOME="$HOME"
    ACTUAL_USER="$(whoami)"
fi

echo -e "${YELLOW}📁 User: ${ACTUAL_USER}${NC}"
echo -e "${YELLOW}📁 Home: ${USER_HOME}${NC}"
echo ""

# Define base directory
BASE_DIR="${USER_HOME}/xray-system"

echo -e "${BLUE}📋 Step 1: Creating backup...${NC}"
BACKUP_DIR="${USER_HOME}/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ Backup directory created: ${BACKUP_DIR}${NC}"

# Backup current files
if [ "$(ls -A ${USER_HOME}/*.sh 2>/dev/null)" ]; then
    cp ${USER_HOME}/*.sh "$BACKUP_DIR/" 2>/dev/null || true
fi
if [ "$(ls -A ${USER_HOME}/*.py 2>/dev/null)" ]; then
    cp ${USER_HOME}/*.py "$BACKUP_DIR/" 2>/dev/null || true
fi
if [ -d "${USER_HOME}/templates" ]; then
    cp -r "${USER_HOME}/templates" "$BACKUP_DIR/" 2>/dev/null || true
fi
if [ -d "${USER_HOME}/static" ]; then
    cp -r "${USER_HOME}/static" "$BACKUP_DIR/" 2>/dev/null || true
fi
echo -e "${GREEN}✅ Files backed up${NC}"
echo ""

echo -e "${BLUE}📋 Step 2: Creating directory structure...${NC}"

# Create main structure
mkdir -p "$BASE_DIR"/{setup,config,monitoring,docs}
mkdir -p "$BASE_DIR/monitoring"/{templates,static}

echo -e "${GREEN}✅ Directory structure created:${NC}"
echo -e "   📁 ${BASE_DIR}/setup/"
echo -e "   📁 ${BASE_DIR}/config/"
echo -e "   📁 ${BASE_DIR}/monitoring/"
echo -e "      📁 monitoring/templates/"
echo -e "      📁 monitoring/static/"
echo -e "   📁 ${BASE_DIR}/docs/"
echo ""

echo -e "${BLUE}📋 Step 3: Moving files to proper locations...${NC}"

# Move setup scripts
echo -e "${YELLOW}Moving setup scripts...${NC}"
for file in install-xray.sh install-xray-fast.sh quick-start.sh check-connection.sh \
            uninstall-xray.sh enable-xray-stats.sh geoip-setup.sh fix-config.sh \
            fix-traffic-tracking.sh debug-traffic.sh test-best-config.sh add-server.sh \
            setup-multi-vm-system.sh; do
    if [ -f "${USER_HOME}/${file}" ] && [ ! -f "${BASE_DIR}/setup/${file}" ]; then
        mv "${USER_HOME}/${file}" "${BASE_DIR}/setup/"
        echo -e "  ✓ ${file} → setup/"
    elif [ -f "${USER_HOME}/${file}" ] && [ "${USER_HOME}/${file}" != "${BASE_DIR}/setup/${file}" ]; then
        rm "${USER_HOME}/${file}"
        echo -e "  ✓ ${file} removed (duplicate)"
    fi
done

# Move config scripts
echo -e "${YELLOW}Moving config scripts...${NC}"
for file in generate-client-config.sh generate-simple-config.sh; do
    if [ -f "${USER_HOME}/${file}" ] && [ ! -f "${BASE_DIR}/config/${file}" ]; then
        mv "${USER_HOME}/${file}" "${BASE_DIR}/config/"
        echo -e "  ✓ ${file} → config/"
    elif [ -f "${USER_HOME}/${file}" ] && [ "${USER_HOME}/${file}" != "${BASE_DIR}/config/${file}" ]; then
        rm "${USER_HOME}/${file}"
        echo -e "  ✓ ${file} removed (duplicate)"
    fi
done

# Move monitoring scripts and services
echo -e "${YELLOW}Moving monitoring files...${NC}"
for file in monitoring-dashboard.py user_manager.py traffic_monitor.py connection_monitor.py \
            bandwidth_tracker.py server-manager.py server_manager.py health_monitor.py \
            load_balancer.py auto_failover.py traffic_aggregator.py user_migration.py \
            vm-manager.py xray-agent.py \
            setup-monitoring.sh setup-bandwidth-tracker.sh setup-traffic-monitor.sh \
            setup-cloudflare-xray.sh setup-health-monitor.sh setup-xray-agent.sh; do
    if [ -f "${USER_HOME}/${file}" ] && [ ! -f "${BASE_DIR}/monitoring/${file}" ]; then
        mv "${USER_HOME}/${file}" "${BASE_DIR}/monitoring/"
        echo -e "  ✓ ${file} → monitoring/"
    elif [ -f "${USER_HOME}/${file}" ] && [ "${USER_HOME}/${file}" != "${BASE_DIR}/monitoring/${file}" ]; then
        rm "${USER_HOME}/${file}"
        echo -e "  ✓ ${file} removed (duplicate)"
    fi
done

# Move templates
if [ -d "${USER_HOME}/templates" ]; then
    echo -e "${YELLOW}Moving templates...${NC}"
    cp -r "${USER_HOME}/templates/"* "${BASE_DIR}/monitoring/templates/" 2>/dev/null || true
    rm -rf "${USER_HOME}/templates"
    echo -e "  ✓ templates/ → monitoring/templates/"
fi

# Move static files
if [ -d "${USER_HOME}/static" ]; then
    echo -e "${YELLOW}Moving static files...${NC}"
    cp -r "${USER_HOME}/static/"* "${BASE_DIR}/monitoring/static/" 2>/dev/null || true
    rm -rf "${USER_HOME}/static"
    echo -e "  ✓ static/ → monitoring/static/"
fi

# Move documentation files
echo -e "${YELLOW}Moving documentation...${NC}"
for file in README.md README-MULTI-VM.md PROJECT-STRUCTURE.md QUICK-START.md HUONG-DAN.md \
            TEST-TOC-DO.md TRAFFIC-TRACKING-GUIDE.md API-DOCS.md MULTI-SERVER-GUIDE.md \
            MULTI-VM-QUICK-START.md QUICK-FIX-TRAFFIC.md WHATS-NEW.md CAU-HINH-TOI-UU-VN.md \
            FIX-LOI-MANG.txt KET-NOI-XRAY.txt; do
    if [ -f "${USER_HOME}/${file}" ] && [ ! -f "${BASE_DIR}/docs/${file}" ]; then
        mv "${USER_HOME}/${file}" "${BASE_DIR}/docs/"
        echo -e "  ✓ ${file} → docs/"
    elif [ -f "${USER_HOME}/${file}" ] && [ "${USER_HOME}/${file}" != "${BASE_DIR}/docs/${file}" ]; then
        rm "${USER_HOME}/${file}"
        echo -e "  ✓ ${file} removed (duplicate)"
    fi
done

echo ""
echo -e "${BLUE}📋 Step 4: Setting permissions...${NC}"
chmod +x ${BASE_DIR}/setup/*.sh 2>/dev/null || true
chmod +x ${BASE_DIR}/config/*.sh 2>/dev/null || true
chmod +x ${BASE_DIR}/monitoring/*.sh 2>/dev/null || true
chmod +x ${BASE_DIR}/monitoring/*.py 2>/dev/null || true
chown -R ${ACTUAL_USER}:${ACTUAL_USER} "$BASE_DIR"
echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

echo -e "${BLUE}📋 Step 5: Updating systemd services...${NC}"

# Update monitoring-dashboard service
if [ -f "/etc/systemd/system/monitoring-dashboard.service" ]; then
    echo -e "${YELLOW}Updating monitoring-dashboard.service...${NC}"
    
    cat > /etc/systemd/system/monitoring-dashboard.service <<EOF
[Unit]
Description=Xray Monitoring Dashboard
After=network.target xray.service

[Service]
Type=simple
User=${ACTUAL_USER}
WorkingDirectory=${BASE_DIR}/monitoring
ExecStart=/usr/bin/python3 ${BASE_DIR}/monitoring/monitoring-dashboard.py
Restart=always
RestartSec=3
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF
    echo -e "  ✓ monitoring-dashboard.service updated"
fi

# Update traffic-monitor service
if [ -f "/etc/systemd/system/traffic-monitor.service" ]; then
    echo -e "${YELLOW}Updating traffic-monitor.service...${NC}"
    
    cat > /etc/systemd/system/traffic-monitor.service <<EOF
[Unit]
Description=Xray Traffic Monitor
After=network.target xray.service

[Service]
Type=simple
User=${ACTUAL_USER}
WorkingDirectory=${BASE_DIR}/monitoring
ExecStart=/usr/bin/python3 ${BASE_DIR}/monitoring/traffic_monitor.py
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF
    echo -e "  ✓ traffic-monitor.service updated"
fi

# Update connection-monitor service
if [ -f "/etc/systemd/system/connection-monitor.service" ]; then
    echo -e "${YELLOW}Updating connection-monitor.service...${NC}"
    
    cat > /etc/systemd/system/connection-monitor.service <<EOF
[Unit]
Description=Xray Connection Monitor
After=network.target xray.service

[Service]
Type=simple
User=${ACTUAL_USER}
WorkingDirectory=${BASE_DIR}/monitoring
ExecStart=/usr/bin/python3 ${BASE_DIR}/monitoring/connection_monitor.py
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF
    echo -e "  ✓ connection-monitor.service updated"
fi

# Update bandwidth-tracker service
if [ -f "/etc/systemd/system/bandwidth-tracker.service" ]; then
    echo -e "${YELLOW}Updating bandwidth-tracker.service...${NC}"
    
    cat > /etc/systemd/system/bandwidth-tracker.service <<EOF
[Unit]
Description=Xray Bandwidth Tracker
After=network.target xray.service

[Service]
Type=simple
User=${ACTUAL_USER}
WorkingDirectory=${BASE_DIR}/monitoring
ExecStart=/usr/bin/python3 ${BASE_DIR}/monitoring/bandwidth_tracker.py
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF
    echo -e "  ✓ bandwidth-tracker.service updated"
fi

# Reload systemd
systemctl daemon-reload
echo -e "${GREEN}✅ Systemd services updated${NC}"
echo ""

echo -e "${BLUE}📋 Step 6: Creating convenience symlinks...${NC}"
# Create symlinks in home directory for common commands
ln -sf "${BASE_DIR}/setup/install-xray.sh" "${USER_HOME}/install-xray.sh" 2>/dev/null || true
ln -sf "${BASE_DIR}/setup/quick-start.sh" "${USER_HOME}/quick-start.sh" 2>/dev/null || true
ln -sf "${BASE_DIR}/config/generate-client-config.sh" "${USER_HOME}/generate-config.sh" 2>/dev/null || true
ln -sf "${BASE_DIR}/monitoring/setup-monitoring.sh" "${USER_HOME}/setup-monitoring.sh" 2>/dev/null || true
echo -e "${GREEN}✅ Convenience symlinks created in home directory${NC}"
echo ""

echo -e "${BLUE}📋 Step 7: Creating quick access script...${NC}"
cat > "${USER_HOME}/xray" <<'EOFSCRIPT'
#!/bin/bash
# Quick access to xray-system commands

BASE_DIR="$HOME/xray-system"

show_help() {
    echo "Xray System Quick Commands"
    echo "============================"
    echo ""
    echo "Setup & Installation:"
    echo "  xray install         - Install Xray"
    echo "  xray setup           - Quick setup"
    echo "  xray config          - Generate client config"
    echo ""
    echo "Monitoring:"
    echo "  xray dash            - View dashboard"
    echo "  xray status          - Check all services"
    echo "  xray logs            - View logs"
    echo "  xray restart         - Restart all services"
    echo ""
    echo "Directories:"
    echo "  xray cd              - Go to base directory"
    echo "  xray tree            - Show directory structure"
    echo ""
}

case "$1" in
    install)
        sudo bash "${BASE_DIR}/setup/install-xray.sh"
        ;;
    setup)
        sudo bash "${BASE_DIR}/setup/quick-start.sh"
        ;;
    config)
        bash "${BASE_DIR}/config/generate-client-config.sh"
        ;;
    dash|dashboard)
        IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP")
        echo "Dashboard: http://${IP}:5000"
        echo "Login: Ngocduong2509 / Ngocduong2509"
        ;;
    status)
        echo "=== Xray Services Status ==="
        sudo systemctl status xray --no-pager -l
        echo ""
        sudo systemctl status monitoring-dashboard --no-pager -l
        echo ""
        sudo systemctl status traffic-monitor --no-pager -l
        ;;
    logs)
        sudo journalctl -u xray -u monitoring-dashboard -u traffic-monitor -f
        ;;
    restart)
        sudo systemctl restart xray
        sudo systemctl restart monitoring-dashboard
        sudo systemctl restart traffic-monitor
        sudo systemctl restart connection-monitor
        echo "All services restarted"
        ;;
    cd)
        cd "${BASE_DIR}" && exec $SHELL
        ;;
    tree)
        tree -L 2 "${BASE_DIR}" 2>/dev/null || ls -la "${BASE_DIR}"
        ;;
    *)
        show_help
        ;;
esac
EOFSCRIPT

chmod +x "${USER_HOME}/xray"
chown ${ACTUAL_USER}:${ACTUAL_USER} "${USER_HOME}/xray"
echo -e "${GREEN}✅ Quick access script created: ${USER_HOME}/xray${NC}"
echo ""

echo -e "${BLUE}📋 Step 8: Restarting services...${NC}"
if systemctl is-active --quiet monitoring-dashboard; then
    systemctl restart monitoring-dashboard
    echo -e "  ✓ monitoring-dashboard restarted"
fi
if systemctl is-active --quiet traffic-monitor; then
    systemctl restart traffic-monitor
    echo -e "  ✓ traffic-monitor restarted"
fi
if systemctl is-active --quiet connection-monitor; then
    systemctl restart connection-monitor
    echo -e "  ✓ connection-monitor restarted"
fi
if systemctl is-active --quiet bandwidth-tracker; then
    systemctl restart bandwidth-tracker
    echo -e "  ✓ bandwidth-tracker restarted"
fi
echo ""

echo -e "${CYAN}================================================${NC}"
echo -e "${GREEN}✅ REORGANIZATION COMPLETED SUCCESSFULLY!${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${YELLOW}📁 New Directory Structure:${NC}"
echo -e "   ${BASE_DIR}/"
echo -e "   ├── setup/         ${BLUE}(Installation & setup scripts)${NC}"
echo -e "   ├── config/        ${BLUE}(Configuration generators)${NC}"
echo -e "   ├── monitoring/    ${BLUE}(Dashboard & monitoring)${NC}"
echo -e "   │   ├── templates/"
echo -e "   │   └── static/"
echo -e "   └── docs/          ${BLUE}(Documentation)${NC}"
echo ""
echo -e "${YELLOW}📋 Backup Location:${NC}"
echo -e "   ${BACKUP_DIR}/"
echo ""
echo -e "${YELLOW}⚡ Quick Commands:${NC}"
echo -e "   ${GREEN}xray install${NC}    - Install Xray"
echo -e "   ${GREEN}xray status${NC}     - Check services"
echo -e "   ${GREEN}xray dash${NC}       - View dashboard"
echo -e "   ${GREEN}xray logs${NC}       - View logs"
echo -e "   ${GREEN}xray restart${NC}    - Restart services"
echo -e "   ${GREEN}xray help${NC}       - Show all commands"
echo ""
echo -e "${YELLOW}🔗 Dashboard Access:${NC}"
IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_VPS_IP")
echo -e "   ${CYAN}http://${IP}:5000${NC}"
echo -e "   Login: ${GREEN}Ngocduong2509${NC} / ${GREEN}Ngocduong2509${NC}"
echo ""


