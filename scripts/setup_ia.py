"""
Script de instalación/despliegue del Motor de IA
Uso: python setup_ia.py
Similar a pip install pero para el motor de IA
"""

import sys
import os
from pathlib import Path

# Agregar el directorio raíz al path
ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "backend"))

from scripts.entrenar_ia import entrenar_ia

def main():
    """Función principal de despliegue"""
    print("\n" + "=" * 70)
    print("INSTALADOR DEL MOTOR DE IA - Sistema de Aprendizaje Continuo")
    print("=" * 70)
    print()
    print("Este script desplegara y entrenara el motor de IA con ejemplos.")
    print("El motor aprendera patrones y mejorara con cada ciclo de entrenamiento.")
    print()
    
    # Si hay argumento --yes, no pedir confirmación
    if len(sys.argv) > 1 and sys.argv[1] == "--yes":
        print("[*] Modo automatico activado, iniciando despliegue...")
        print()
        entrenar_ia()
    else:
        try:
            respuesta = input("Deseas continuar con el despliegue? (s/n): ").lower()
            if respuesta not in ['s', 'si', 'sí', 'y', 'yes']:
                print("[X] Despliegue cancelado.")
                return
            print()
            entrenar_ia()
        except (EOFError, KeyboardInterrupt):
            # Si no hay input disponible, ejecutar directamente
            print("[*] Iniciando despliegue automatico...")
            print()
            entrenar_ia()
    
    print()
    print("=" * 70)
    print("[OK] DESPLIEGUE COMPLETADO")
    print("=" * 70)
    print()
    print("El motor de IA está listo para usar.")
    print("Puedes verificar el estado con: python backend/scripts/estado_ia.py")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[!] Despliegue interrumpido por el usuario")
    except Exception as e:
        print(f"\n\n[X] Error durante el despliegue: {e}")
        import traceback
        traceback.print_exc()

