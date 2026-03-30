#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────────────────────
# Grudge Engine Web — VPS Deploy Script
# Usage: ./deploy.ps1
# ─────────────────────────────────────────────────────────────────────────────

$VPS_IP    = "74.208.155.229"
$VPS_USER  = "root"
$SSH_KEY   = "$env:USERPROFILE\.ssh\grudge_vps_deploy"
$REMOTE    = "/opt/grudge-engine-web"
$SSH       = "ssh -i `"$SSH_KEY`" -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP}"

Write-Host "🚀 Deploying Grudge Engine Web to VPS..." -ForegroundColor Cyan

# ── 1. Sync project files (exclude heavy/unneeded files) ─────────────────────
Write-Host "`n📦 Syncing files..." -ForegroundColor Yellow

# Build tar excluding node_modules, dist, zips, git, logs
$excludes = @("node_modules", "dist", ".git", "logs", "storage", "*.zip")
$excludeArgs = ($excludes | ForEach-Object { "--exclude=$_" }) -join " "

# Use tar pipe over SSH (works on Windows with OpenSSH)
$tarCmd = "tar czf - $excludeArgs -C `"D:\Grudge-Engine-Web`" ."
$remoteCmd = "mkdir -p $REMOTE && tar xzf - -C $REMOTE"

Write-Host "  → Compressing and uploading..." -ForegroundColor Gray
Invoke-Expression "$tarCmd | ssh -i `"$SSH_KEY`" -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} `"$remoteCmd`""

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ File sync failed!" -ForegroundColor Red
    exit 1
}

# ── 2. Copy .env to VPS ───────────────────────────────────────────────────────
Write-Host "`n🔑 Uploading .env..." -ForegroundColor Yellow
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no ".env" "${VPS_USER}@${VPS_IP}:${REMOTE}/.env"

# ── 3. Build and restart Docker container on VPS ─────────────────────────────
Write-Host "`n🐳 Building and starting Docker container..." -ForegroundColor Yellow
& ssh
& ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "docker compose -f $REMOTE/docker-compose.yml down --remove-orphans 2>/dev/null; true"
& ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "cd $REMOTE && docker compose build"
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Docker build failed!" -ForegroundColor Red; exit 1 }

& ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "cd $REMOTE && docker compose up -d"
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Docker start failed!" -ForegroundColor Red; exit 1 }

& ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "docker ps --filter name=grudge-engine-web --format 'Name: {{.Names}}  Status: {{.Status}}'"

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "   Direct access: http://${VPS_IP}:5001" -ForegroundColor Cyan
Write-Host "   Domain (via Coolify proxy): https://engine.grudge-studio.com" -ForegroundColor Cyan
Write-Host "   (Add DNS A record: engine.grudge-studio.com → ${VPS_IP})" -ForegroundColor Gray
