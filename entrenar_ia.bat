@echo off
REM Comando simple para entrenar/desplegar la IA
REM Uso: entrenar_ia.bat

cd /d %~dp0
python setup_ia.py --yes
pause


