#!/bin/bash
# Setup VM SSH Manager trên Linux/Mac

echo "🚀 VM SSH Manager - Setup Script"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Python
echo -e "${YELLOW}📋 Kiểm tra Python...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python: $PYTHON_VERSION${NC}"
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    echo -e "${GREEN}✅ Python: $PYTHON_VERSION${NC}"
    PYTHON_CMD="python"
else
    echo -e "${RED}❌ Python không được cài đặt!${NC}"
    echo -e "${YELLOW}   Vui lòng cài Python 3.8+${NC}"
    exit 1
fi

# Check pip
echo -e "${YELLOW}📋 Kiểm tra pip...${NC}"
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
elif command -v pip &> /dev/null; then
    PIP_CMD="pip"
else
    echo -e "${RED}❌ pip không được cài đặt!${NC}"
    exit 1
fi

PIP_VERSION=$($PIP_CMD --version)
echo -e "${GREEN}✅ pip: $PIP_VERSION${NC}"

# Install dependencies
echo ""
echo -e "${YELLOW}📦 Cài đặt dependencies...${NC}"
$PIP_CMD install -r requirements-vm-manager.txt

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Cài đặt dependencies thất bại!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies đã được cài đặt${NC}"

# Make script executable
chmod +x vm-ssh-manager.py

# Initialize config
echo ""
echo -e "${YELLOW}⚙️  Khởi tạo config...${NC}"
$PYTHON_CMD vm-ssh-manager.py init

# Create alias
echo ""
echo -e "${YELLOW}🔧 Tạo alias 'vm'...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALIAS_LINE="alias vm='$PYTHON_CMD $SCRIPT_DIR/vm-ssh-manager.py'"

# Detect shell
if [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
else
    SHELL_RC="$HOME/.profile"
fi

# Add alias if not exists
if ! grep -q "alias vm=" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# VM SSH Manager" >> "$SHELL_RC"
    echo "$ALIAS_LINE" >> "$SHELL_RC"
    echo -e "${GREEN}✅ Đã thêm alias 'vm' vào $SHELL_RC${NC}"
    echo -e "${YELLOW}   Chạy: source $SHELL_RC hoặc mở terminal mới${NC}"
else
    echo -e "${GREEN}✅ Alias 'vm' đã tồn tại${NC}"
fi

# Done
echo ""
echo -e "${GREEN}✅ HOÀN TẤT CÀI ĐẶT!${NC}"
echo ""
echo -e "${CYAN}🎯 Cách sử dụng:${NC}"
echo -e "   ${NC}vm menu        ${NC}- Mở menu interactive"
echo -e "   ${NC}vm list        ${NC}- Xem danh sách VMs"
echo -e "   ${NC}vm add         ${NC}- Thêm VM mới"
echo -e "   ${NC}vm connect 1   ${NC}- Kết nối đến VM số 1"
echo -e "   ${NC}vm test hk-1   ${NC}- Test kết nối đến VM 'hk-1'"
echo ""
echo -e "📖 Xem thêm: vm --help"
echo ""

# Ask to open menu
read -p "Mở menu interactive ngay? (Y/n): " open_menu
if [ "$open_menu" != "n" ] && [ "$open_menu" != "N" ]; then
    $PYTHON_CMD vm-ssh-manager.py menu
fi

