@echo off
REM Comando para ver el estado de la IA
REM Uso: estado_ia.bat

cd /d %~dp0
python backend/scripts/estado_ia.py
pause


