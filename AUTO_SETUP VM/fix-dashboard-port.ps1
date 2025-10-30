# Fix Monitoring Dashboard Port 8080 Issue
# Kill all processes using port 8080 and restart service properly

$SERVER_IP = "34.150.106.79"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_rsa"
$SSH_USER = "duongng.dn"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   FIX MONITORING DASHBOARD PORT 8080" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔍 Checking processes on port 8080..." -ForegroundColor Yellow

# Execute fix commands on remote server
$commands = @"
echo "📋 Finding processes using port 8080..."
sudo lsof -ti:8080 | xargs -r echo "Found PIDs:"

echo ""
echo "🛑 Stopping monitoring-dashboard service..."
sudo systemctl stop monitoring-dashboard

echo ""
echo "💀 Killing all processes on port 8080..."
sudo lsof -ti:8080 | xargs -r sudo kill -9
sudo fuser -k 8080/tcp 2>/dev/null || true
sudo pkill -f 'python3.*monitoring-dashboard' || true
sudo pkill -f 'flask.*8080' || true

echo ""
echo "⏳ Waiting for port to be released..."
sleep 3

echo ""
echo "🔍 Checking if port 8080 is free..."
if sudo lsof -ti:8080 > /dev/null 2>&1; then
    echo "❌ Port 8080 still in use!"
    sudo lsof -i:8080
else
    echo "✅ Port 8080 is free"
fi

echo ""
echo "🚀 Starting monitoring-dashboard service..."
sudo systemctl start monitoring-dashboard

echo ""
echo "⏳ Waiting for service to start..."
sleep 5

echo ""
echo "📊 Service Status:"
sudo systemctl status monitoring-dashboard --no-pager | head -25

echo ""
echo "🔍 Processes on port 8080:"
sudo lsof -i:8080 || echo "No process found on port 8080"

echo ""
echo "🌐 Testing connection..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200\|302"; then
    echo "✅ Dashboard is accessible!"
else
    echo "⚠️  Dashboard might not be responding yet"
fi
"@

Write-Host "🔧 Executing fix on server..." -ForegroundColor Yellow
ssh -i $SSH_KEY "$SSH_USER@$SERVER_IP" $commands

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "   FIX COMPLETED!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Dashboard URL: http://$SERVER_IP:8080" -ForegroundColor Cyan
Write-Host "👤 Username: Ngocduong2509" -ForegroundColor Cyan
Write-Host "🔑 Password: Ngocduong2509" -ForegroundColor Cyan
Write-Host ""

