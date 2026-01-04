# Ver estado del servidor
Write-Host "`n🔍 Verificando servidor..." -ForegroundColor Cyan

$connection = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($connection) {
    Write-Host "✅ Servidor CORRIENDO en http://localhost:5173" -ForegroundColor Green
    Write-Host "`nAbre tu navegador en: http://localhost:5173`n" -ForegroundColor Yellow
} else {
    Write-Host "❌ Servidor NO está corriendo" -ForegroundColor Red
    Write-Host "`nPara iniciarlo, ejecuta:" -ForegroundColor Yellow
    Write-Host "  cd frontend" -ForegroundColor White
    Write-Host "  `$env:Path += ';C:\Program Files\nodejs'" -ForegroundColor White
    Write-Host "  npm run dev`n" -ForegroundColor White
}

# Mostrar procesos de Node
Write-Host "Procesos Node.js activos:" -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -like '*node*'} | Format-Table ProcessName, Id, CPU -AutoSize

