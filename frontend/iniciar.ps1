# Script para iniciar el servidor de desarrollo del frontend
# Ejecutar: .\iniciar.ps1

# Actualizar PATH para incluir Node.js
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$env:Path += ";C:\Program Files\nodejs"

# Verificar que npm esté disponible
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm no está disponible. Por favor reinicia la terminal." -ForegroundColor Red
    exit 1
}

Write-Host "Node.js encontrado: v$(node --version)" -ForegroundColor Green
Write-Host "npm encontrado: v$npmVersion" -ForegroundColor Green

# Verificar que las dependencias estén instaladas
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
}

# Iniciar servidor
Write-Host "`n🚀 Iniciando servidor de desarrollo..." -ForegroundColor Cyan
Write-Host "Abre tu navegador en: http://localhost:5173`n" -ForegroundColor Green

npm run dev





