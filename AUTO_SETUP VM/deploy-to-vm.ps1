# Script deploy và tổ chức cấu trúc trên VM
# Sử dụng: .\deploy-to-vm.ps1

param(
    [switch]$SkipReorganize,
    [switch]$OnlyReorganize
)

$VPS_IP = "34.150.106.79"
$VPS_USER = "duongng.dn"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_rsa"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   DEPLOY & ORGANIZE VM STRUCTURE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if (!$OnlyReorganize) {
    Write-Host "📤 Step 1: Creating directories on VM..." -ForegroundColor Yellow
    ssh -i $SSH_KEY "${VPS_USER}@${VPS_IP}" "mkdir -p ~/xray-system/{setup,config,monitoring/{templates,static},docs}"
    Write-Host "✅ Directories created" -ForegroundColor Green
    Write-Host ""

    Write-Host "📤 Step 2: Uploading files to VM..." -ForegroundColor Yellow
    
    Write-Host "  📦 Uploading reorganize script..." -ForegroundColor Cyan
    scp -i $SSH_KEY reorganize-vm-structure.sh "${VPS_USER}@${VPS_IP}:~/"
    
    Write-Host "  📁 Uploading setup scripts..." -ForegroundColor Cyan
    scp -i $SSH_KEY setup/*.sh "${VPS_USER}@${VPS_IP}:~/xray-system/setup/" 2>$null
    
    Write-Host "  📁 Uploading config scripts..." -ForegroundColor Cyan
    scp -i $SSH_KEY config/*.sh "${VPS_USER}@${VPS_IP}:~/xray-system/config/" 2>$null
    
    Write-Host "  📁 Uploading monitoring files..." -ForegroundColor Cyan
    scp -i $SSH_KEY monitoring/*.py "${VPS_USER}@${VPS_IP}:~/xray-system/monitoring/" 2>$null
    scp -i $SSH_KEY monitoring/*.sh "${VPS_USER}@${VPS_IP}:~/xray-system/monitoring/" 2>$null
    
    Write-Host "  📁 Uploading templates..." -ForegroundColor Cyan
    scp -r -i $SSH_KEY monitoring/templates/* "${VPS_USER}@${VPS_IP}:~/xray-system/monitoring/templates/" 2>$null
    
    Write-Host "  📁 Uploading static files..." -ForegroundColor Cyan
    scp -r -i $SSH_KEY monitoring/static/* "${VPS_USER}@${VPS_IP}:~/xray-system/monitoring/static/" 2>$null
    
    Write-Host "  📁 Uploading documentation..." -ForegroundColor Cyan
    scp -i $SSH_KEY README.md README-MULTI-VM.md PROJECT-STRUCTURE.md "${VPS_USER}@${VPS_IP}:~/xray-system/docs/" 2>$null
    scp -i $SSH_KEY docs/*.md "${VPS_USER}@${VPS_IP}:~/xray-system/docs/" 2>$null
    scp -i $SSH_KEY docs/*.txt "${VPS_USER}@${VPS_IP}:~/xray-system/docs/" 2>$null
    
    Write-Host "✅ Upload completed" -ForegroundColor Green
    Write-Host ""
}

if (!$SkipReorganize) {
    Write-Host "🔧 Step 3: Setting permissions..." -ForegroundColor Yellow
    ssh -i $SSH_KEY "${VPS_USER}@${VPS_IP}" @"
chmod +x ~/reorganize-vm-structure.sh 2>/dev/null
chmod +x ~/xray-system/setup/*.sh 2>/dev/null
chmod +x ~/xray-system/config/*.sh 2>/dev/null
chmod +x ~/xray-system/monitoring/*.sh 2>/dev/null
chmod +x ~/xray-system/monitoring/*.py 2>/dev/null
"@
    Write-Host "✅ Permissions set" -ForegroundColor Green
    Write-Host ""

    Write-Host "🔄 Step 4: Reorganizing structure on VM..." -ForegroundColor Yellow
    ssh -i $SSH_KEY "${VPS_USER}@${VPS_IP}" "sudo bash ~/reorganize-vm-structure.sh"
    Write-Host ""
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Checking services status..." -ForegroundColor Yellow
ssh -i $SSH_KEY "${VPS_USER}@${VPS_IP}" @"
echo '=== Services Status ==='
sudo systemctl is-active xray && echo '✓ Xray: Running' || echo '✗ Xray: Stopped'
sudo systemctl is-active monitoring-dashboard && echo '✓ Dashboard: Running' || echo '✗ Dashboard: Stopped'
sudo systemctl is-active traffic-monitor && echo '✓ Traffic Monitor: Running' || echo '✗ Traffic Monitor: Stopped'
"@
Write-Host ""

Write-Host "🎯 Quick Commands on VM:" -ForegroundColor Yellow
Write-Host "  xray status     - Check all services" -ForegroundColor Gray
Write-Host "  xray dash       - Dashboard info" -ForegroundColor Gray
Write-Host "  xray logs       - View logs" -ForegroundColor Gray
Write-Host "  xray restart    - Restart all services" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 Dashboard Access:" -ForegroundColor Yellow
Write-Host "  http://${VPS_IP}:5000" -ForegroundColor Cyan
Write-Host "  Login: Ngocduong2509 / Ngocduong2509" -ForegroundColor Gray
Write-Host ""


