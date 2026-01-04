# Script para generar APK de la app movil
# Ejecutar: .\GENERAR_APK.ps1

Write-Host ""
Write-Host "Generando APK para Aura Ingenieria" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Debes ejecutar este script desde el directorio mobile/" -ForegroundColor Red
    exit 1
}

# Verificar Node.js
$env:Path += ";C:\Program Files\nodejs"
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Node.js no esta instalado o no esta en el PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Node.js encontrado: $nodeVersion" -ForegroundColor Green

# Verificar dependencias
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error al instalar dependencias" -ForegroundColor Red
        exit 1
    }
}

# Prebuild para asegurar que los archivos nativos esten actualizados
Write-Host ""
Write-Host "Ejecutando prebuild..." -ForegroundColor Yellow
npx expo prebuild --platform android --clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en prebuild" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Generando APK (esto puede tardar varios minutos)..." -ForegroundColor Yellow
Write-Host "Por favor, espera..." -ForegroundColor Cyan
Write-Host ""

# Generar APK usando Expo
npx expo run:android --variant release

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "APK generada exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ubicacion del APK:" -ForegroundColor Cyan
    Write-Host "android\app\build\outputs\apk\release\app-release.apk" -ForegroundColor White
    Write-Host ""
    Write-Host "Puedes instalar esta APK en tu dispositivo Android" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Error al generar la APK" -ForegroundColor Red
    Write-Host "Revisa los errores arriba" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
