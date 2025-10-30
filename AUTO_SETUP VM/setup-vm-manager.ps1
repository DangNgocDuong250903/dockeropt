# Setup VM SSH Manager trên Windows
# Script này sẽ cài đặt và cấu hình VM SSH Manager

Write-Host "🚀 VM SSH Manager - Setup Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "📋 Kiểm tra Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Python không được cài đặt!" -ForegroundColor Red
    Write-Host "   Vui lòng cài Python từ: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Check pip
Write-Host "📋 Kiểm tra pip..." -ForegroundColor Yellow
$pipVersion = pip --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ pip: $pipVersion" -ForegroundColor Green
} else {
    Write-Host "❌ pip không được cài đặt!" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "📦 Cài đặt dependencies..." -ForegroundColor Yellow
pip install -r requirements-vm-manager.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cài đặt dependencies thất bại!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies đã được cài đặt" -ForegroundColor Green

# Initialize config
Write-Host ""
Write-Host "⚙️  Khởi tạo config..." -ForegroundColor Yellow
python vm-ssh-manager.py init

# Create shortcut command
Write-Host ""
Write-Host "🔧 Tạo command shortcut..." -ForegroundColor Yellow

$scriptContent = @"
@echo off
python "$PSScriptRoot\vm-ssh-manager.py" %*
"@

$batchFile = Join-Path $PSScriptRoot "vm.bat"
Set-Content -Path $batchFile -Value $scriptContent

Write-Host "✅ Đã tạo command: vm.bat" -ForegroundColor Green

# Add to PATH suggestion
Write-Host ""
Write-Host "💡 Để sử dụng lệnh 'vm' ở mọi nơi:" -ForegroundColor Cyan
Write-Host "   1. Copy đường dẫn: $PSScriptRoot" -ForegroundColor White
Write-Host "   2. Thêm vào System PATH trong Environment Variables" -ForegroundColor White
Write-Host "   3. Hoặc dùng lệnh sau (cần Admin):" -ForegroundColor White
Write-Host ""
Write-Host "   [System.Environment]::SetEnvironmentVariable('Path', `$env:Path + ';$PSScriptRoot', 'User')" -ForegroundColor Yellow
Write-Host ""

# Import VMs from existing config
Write-Host "📥 Import VMs từ monitoring/server_manager.py?" -ForegroundColor Cyan
$importChoice = Read-Host "Nhập Y để import, Enter để bỏ qua"

if ($importChoice -eq "Y" -or $importChoice -eq "y") {
    Write-Host "🔄 Đang import..." -ForegroundColor Yellow
    python vm-ssh-manager.py import-from-monitoring
}

# Done
Write-Host ""
Write-Host "✅ HOÀN TẤT CÀI ĐẶT!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Cách sử dụng:" -ForegroundColor Cyan
Write-Host "   .\vm.bat menu        - Mở menu interactive" -ForegroundColor White
Write-Host "   .\vm.bat list        - Xem danh sách VMs" -ForegroundColor White
Write-Host "   .\vm.bat add         - Thêm VM mới" -ForegroundColor White
Write-Host "   .\vm.bat connect 1   - Kết nối đến VM số 1" -ForegroundColor White
Write-Host "   .\vm.bat test hk-1   - Test kết nối đến VM 'hk-1'" -ForegroundColor White
Write-Host ""
Write-Host "📖 Xem thêm: python vm-ssh-manager.py --help" -ForegroundColor Dim
Write-Host ""

# Ask to open menu
$openMenu = Read-Host "Mở menu interactive ngay? (Y/n)"
if ($openMenu -ne "n" -and $openMenu -ne "N") {
    python vm-ssh-manager.py menu
}

