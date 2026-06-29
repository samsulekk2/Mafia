# Deploy Mafia Online (Windows)
# Prerequisites: Node.js 22+, git remote on GitHub, Render + Vercel accounts

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $Root "..")

Write-Host ""
Write-Host "=== Mafia Online Deploy ===" -ForegroundColor Cyan

Write-Host ""
Write-Host "[1/4] Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host ""
Write-Host "[2/4] Git status..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    git init
    git branch -M main
    Write-Host "Initialized git repo. Add remote: git remote add origin YOUR_REPO_URL"
}

$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "Pushing to $remote ..."
    git add -A
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m "deploy: production build"
    }
    git push -u origin main
    Write-Host "Push complete. GitHub Actions will deploy if secrets are set."
} else {
    Write-Host "No git remote. Skipping push." -ForegroundColor DarkYellow
}

if ($env:VERCEL_TOKEN) {
    Write-Host ""
    Write-Host "[3/4] Deploying frontend to Vercel..." -ForegroundColor Yellow
    Push-Location client
    npx vercel deploy --prod --token $env:VERCEL_TOKEN
    Pop-Location
} else {
    Write-Host ""
    Write-Host "[3/4] Skip Vercel (set VERCEL_TOKEN to deploy from CLI)" -ForegroundColor DarkYellow
}

if ($env:RENDER_DEPLOY_HOOK) {
    Write-Host ""
    Write-Host "[4/4] Triggering Render deploy..." -ForegroundColor Yellow
    Invoke-WebRequest -Method POST -Uri $env:RENDER_DEPLOY_HOOK -UseBasicParsing | Out-Null
    Write-Host "Render deploy triggered."
} else {
    Write-Host ""
    Write-Host "[4/4] Skip Render (set RENDER_DEPLOY_HOOK to trigger API deploy)" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Done. See DEPLOYMENT.md for first-time platform setup." -ForegroundColor Green
Write-Host ""
