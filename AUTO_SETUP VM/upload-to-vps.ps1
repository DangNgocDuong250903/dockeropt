# Script upload files lên VPS (chạy trên Windows PowerShell)
# Sử dụng: .\upload-to-vps.ps1

$VPS_IP = "34.150.106.79"
$VPS_USER = "duongng.dn"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_rsa"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   UPLOAD TO VPS (STRUCTURED)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Upload reorganize script first
Write-Host "📦 Uploading reorganization script..." -ForegroundColor Yellow
scp -i $SSH_KEY reorganize-vm-structure.sh "${VPS_USER}@${VPS_IP}:~/"

# Upload theo thư mục mới
Write-Host "📁 Uploading setup scripts..." -ForegroundColor Yellow
scp -i $SSH_KEY setup/*.sh "${VPS_USER}@${VPS_IP}:~/xray-system/setup/"

Write-Host "📁 Uploading config scripts..." -ForegroundColor Yellow
scp -i $SSH_KEY config/*.sh "${VPS_USER}@${VPS_IP}:~/xray-system/config/"

Write-Host "📁 Uploading monitoring files..." -ForegroundColor Yellow
scp -i $SSH_KEY monitoring/*.py monitoring/*.sh "${VPS_USER}@${VPS_IP}:~/xray-system/monitoring/"

Write-Host "📁 Uploading templates & static..." -ForegroundColor Yellow
scp -r -i $SSH_KEY monitoring/templates "${VPS_USER}@${VPS_IP}:~/xray-system/monitoring/"
scp -r -i $SSH_KEY monitoring/static "${VPS_USER}@${VPS_IP}:~/xray-system/monitoring/"

Write-Host "📁 Uploading documentation..." -ForegroundColor Yellow
scp -i $SSH_KEY README.md README-MULTI-VM.md PROJECT-STRUCTURE.md "${VPS_USER}@${VPS_IP}:~/xray-system/docs/"
scp -i $SSH_KEY docs/*.md docs/*.txt "${VPS_USER}@${VPS_IP}:~/xray-system/docs/" 2>$null

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Upload completed!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps on VPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SSH vào VPS:" -ForegroundColor White
Write-Host "   ssh -i $SSH_KEY ${VPS_USER}@${VPS_IP}" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Reorganize structure (if first time):" -ForegroundColor White
Write-Host "   sudo bash ~/reorganize-vm-structure.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Cài Xray (lần đầu):" -ForegroundColor White
Write-Host "   sudo bash ~/xray-system/setup/install-xray.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Setup Monitoring Dashboard:" -ForegroundColor White
Write-Host "   sudo bash ~/xray-system/monitoring/setup-monitoring.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Quick commands:" -ForegroundColor White
Write-Host "   xray status    - Check services" -ForegroundColor Gray
Write-Host "   xray dash      - View dashboard info" -ForegroundColor Gray
Write-Host "   xray logs      - View logs" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Truy cập Dashboard:" -ForegroundColor White
Write-Host "   http://${VPS_IP}:5000" -ForegroundColor Gray
Write-Host "   Login: Ngocduong2509 / Ngocduong2509" -ForegroundColor Gray
Write-Host ""

