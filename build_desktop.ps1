# =======================================================
# Automated Build Script for Chef Game & Watch Desktop App
# 1. Builds React frontend with Vite
# 2. Copies build output into desktop/frontend
# 3. Compiles standalone Windows ChefGame.exe with Go/Wails
# =======================================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 [1/3] Building React Frontend with Vite..." -ForegroundColor Cyan
npm run build

Write-Host "📂 [2/3] Copying web build assets to desktop/frontend..." -ForegroundColor Cyan
$desktopFrontend = "c:\Users\Ehsan\dev\chef\desktop\frontend"

if (Test-Path $desktopFrontend) {
    Remove-Item -Recurse -Force $desktopFrontend
}
New-Item -ItemType Directory -Force -Path $desktopFrontend | Out-Null
Copy-Item -Recurse -Force "c:\Users\Ehsan\dev\chef\dist\*" "$desktopFrontend\"

Write-Host "🔨 [3/3] Compiling standalone Desktop EXE with Go/Wails..." -ForegroundColor Cyan
Set-Location "c:\Users\Ehsan\dev\chef\desktop"
go build -buildvcs=false -ldflags "-s -w" -o ChefGame.exe .

Set-Location "c:\Users\Ehsan\dev\chef"

if (Test-Path "desktop\ChefGame.exe") {
    $exe = Get-Item "desktop\ChefGame.exe"
    $sizeMB = [math]::Round($exe.Length / 1MB, 2)
    Write-Host "✅ SUCCESS! Built desktop app:" -ForegroundColor Green
    Write-Host "   Location : $($exe.FullName)" -ForegroundColor Yellow
    Write-Host "   Size     : $sizeMB MB" -ForegroundColor Yellow
} else {
    Write-Error "❌ Build failed: ChefGame.exe was not created."
}
