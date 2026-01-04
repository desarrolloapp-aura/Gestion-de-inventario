# Script para iniciar Backend y Frontend
# Ejecutar: .\INICIAR_TODO.ps1

Write-Host "`n🛡️ AURA MINERÍA - Iniciando Servidores`n" -ForegroundColor Cyan

# Iniciar Backend
Write-Host "🚀 Iniciando Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\usuario\Desktop\Aura\backend'; Write-Host '=== BACKEND AURA MINERIA ===' -ForegroundColor Cyan; .\venv\Scripts\activate.ps1; Write-Host 'Servidor: http://localhost:8000' -ForegroundColor Green; Write-Host 'Docs: http://localhost:8000/docs' -ForegroundColor Cyan; Write-Host 'Tambien accesible desde la red local' -ForegroundColor Yellow; uvicorn app.main:app --reload --host 0.0.0.0"

Start-Sleep -Seconds 2

# Iniciar Frontend
Write-Host "🎨 Iniciando Frontend..." -ForegroundColor Yellow
$env:Path += ";C:\Program Files\nodejs"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\usuario\Desktop\Aura\frontend'; Write-Host '=== FRONTEND AURA MINERIA ===' -ForegroundColor Cyan; `$env:Path += ';C:\Program Files\nodejs'; Write-Host 'Servidor: http://localhost:5173' -ForegroundColor Green; npm run dev"

Write-Host "`n✅ Servidores iniciados en ventanas separadas`n" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

