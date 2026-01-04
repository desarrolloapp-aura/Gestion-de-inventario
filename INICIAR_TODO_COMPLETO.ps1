# Script para iniciar Backend, Frontend y App Móvil
# Ejecutar: .\INICIAR_TODO_COMPLETO.ps1

Write-Host "`n🛡️ AURA MINERÍA - Iniciando Servidores y App Móvil`n" -ForegroundColor Cyan

# Iniciar Backend
Write-Host "🚀 Iniciando Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\usuario\Desktop\Aura\backend'; Write-Host '=== BACKEND AURA MINERIA ===' -ForegroundColor Cyan; if (Test-Path 'venv\Scripts\activate.ps1') { .\venv\Scripts\activate.ps1 } else { Write-Host 'Creando venv...' -ForegroundColor Yellow; python -m venv venv; .\venv\Scripts\activate.ps1; pip install -r requirements.txt }; Write-Host 'Servidor: http://localhost:8000' -ForegroundColor Green; Write-Host 'Docs: http://localhost:8000/docs' -ForegroundColor Cyan; Write-Host 'Tambien accesible desde la red local' -ForegroundColor Yellow; uvicorn app.main:app --reload --host 0.0.0.0"

Start-Sleep -Seconds 2

# Iniciar Frontend
Write-Host "🎨 Iniciando Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\usuario\Desktop\Aura\frontend'; Write-Host '=== FRONTEND AURA MINERIA ===' -ForegroundColor Cyan; `$env:Path += ';C:\Program Files\nodejs'; if (-not (Test-Path 'node_modules')) { Write-Host 'Instalando dependencias...' -ForegroundColor Yellow; npm install --legacy-peer-deps }; Write-Host 'Servidor: http://localhost:5173' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 2

# Iniciar App Móvil
Write-Host "📱 Iniciando App Móvil (Expo)..." -ForegroundColor Yellow
$mobileCommand = "cd 'C:\Users\usuario\Desktop\Aura\mobile'; Write-Host '=== APP MOVIL AURA MINERIA ===' -ForegroundColor Cyan; `$env:Path += ';C:\Program Files\nodejs'; if (-not (Test-Path 'node_modules')) { Write-Host 'Instalando dependencias...' -ForegroundColor Yellow; npm install }; Write-Host 'Iniciando Expo...' -ForegroundColor Green; Write-Host 'Escanea el QR con Expo Go' -ForegroundColor Yellow; npx expo start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $mobileCommand

Start-Sleep -Seconds 2

Write-Host "`n✅ Todos los servicios iniciados en ventanas separadas`n" -ForegroundColor Green
Write-Host "📋 Servicios disponibles:" -ForegroundColor Cyan
Write-Host "  - Backend: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  - App Móvil: Escanea el QR en Expo Go`n" -ForegroundColor White

