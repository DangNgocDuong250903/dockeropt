# Creates venv, installs dependencies, and launches the Script Control Panel
param(
  [int]$Port = 5173,
  [string]$BindHost = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$panelDir = Join-Path $root "script_panel"
$venvPath = Join-Path $root ".venv"

if (-not (Test-Path $venvPath)) {
  Write-Host "Creating virtual environment..."
  python -m venv $venvPath
}

$python = Join-Path $venvPath "Scripts/python.exe"
if (-not (Test-Path $python)) {
  throw "Python not found in venv."
}

Write-Host "Upgrading pip and installing requirements..."
& $python -m pip install --upgrade pip | Out-Host
& $python -m pip install -r (Join-Path $panelDir "requirements.txt") | Out-Host

Write-Host ("Starting Script Control Panel on http://{0}:{1} ..." -f $BindHost, $Port)
$env:PORT = "$Port"
$env:HOST = "$BindHost"
& $python (Join-Path $panelDir "app.py")
