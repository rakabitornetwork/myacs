# Deploy MyACS ke VPS (PowerShell)
# Usage: .\scripts\deploy.ps1 -SshHost user@192.168.22.253 -RemotePath /var/www/myacs

param(
    [Parameter(Mandatory = $true)]
    [string]$SshHost,

    [string]$RemotePath = '/var/www/myacs',
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

Push-Location $Root

if (-not $SkipBuild) {
    Write-Host '>> npm ci && npm run build' -ForegroundColor Cyan
    npm ci
    npm run build
}

Write-Host ">> rsync ke ${SshHost}:${RemotePath}" -ForegroundColor Cyan
$excludes = @(
    '--exclude', 'node_modules',
    '--exclude', '.git',
    '--exclude', '.env',
    '--exclude', 'uploads',
    '--exclude', 'logs'
)

rsync -avz --delete @excludes ./ "${SshHost}:${RemotePath}/"

Write-Host '>> post-deploy di VPS' -ForegroundColor Cyan
ssh $SshHost "cd $RemotePath && bash deploy/post-deploy.sh"

Pop-Location
Write-Host 'Deploy selesai.' -ForegroundColor Green
