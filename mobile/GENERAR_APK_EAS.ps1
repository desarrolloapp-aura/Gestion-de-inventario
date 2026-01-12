# Script para generar APK usando EAS Build
# Ejecutar: .\GENERAR_APK_EAS.ps1

Write-Host ""
Write-Host "Generando APK con EAS Build" -ForegroundColor Cyan
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
    Write-Host "Error: Node.js no esta instalado" -ForegroundColor Red
    exit 1
}

Write-Host "Node.js encontrado: $nodeVersion" -ForegroundColor Green

# Verificar si está logueado en EAS
Write-Host ""
Write-Host "Verificando sesion de EAS..." -ForegroundColor Yellow
$easCheck = npx eas-cli whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "No estas logueado en EAS. Iniciando sesion..." -ForegroundColor Yellow
    Write-Host "Por favor, ingresa tus credenciales de Expo:" -ForegroundColor Cyan
    npx eas-cli login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error al iniciar sesion" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Sesion activa en EAS" -ForegroundColor Green
}

# Configurar EAS si no existe eas.json
if (-not (Test-Path "eas.json")) {
    Write-Host ""
    Write-Host "Configurando EAS Build..." -ForegroundColor Yellow
    npx eas-cli build:configure
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error al configurar EAS" -ForegroundColor Red
        exit 1
    }
}

# Generar APK
Write-Host ""
Write-Host "Iniciando build de APK..." -ForegroundColor Yellow
Write-Host "Esto puede tardar 10-15 minutos. El build se realiza en la nube." -ForegroundColor Cyan
Write-Host ""

npx eas-cli build --platform android --profile preview

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "APK generada exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "La APK estara disponible para descargar desde el enlace que se mostro arriba." -ForegroundColor Cyan
    Write-Host "Tambien puedes verla en: https://expo.dev/accounts/[tu-usuario]/projects/aura-mobile/builds" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Error al generar la APK" -ForegroundColor Red
    Write-Host "Revisa los errores arriba" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}


