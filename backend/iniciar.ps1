# Script para iniciar el backend
Write-Host "🚀 Iniciando Backend..." -ForegroundColor Cyan

# Activar venv
if (Test-Path "venv\Scripts\activate.ps1") {
    .\venv\Scripts\activate.ps1
} else {
    Write-Host "Creando venv..." -ForegroundColor Yellow
    python -m venv venv
    .\venv\Scripts\activate.ps1
    pip install -r requirements.txt
}

# Verificar .env
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env no existe" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Iniciando servidor en http://localhost:8000" -ForegroundColor Green
Write-Host "📱 También accesible desde la red local (celulares)" -ForegroundColor Cyan
uvicorn app.main:app --reload --host 0.0.0.0





