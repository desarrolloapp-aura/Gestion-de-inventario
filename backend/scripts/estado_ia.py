"""
Script para ver el estado y porcentaje de aprendizaje de la IA
Ejecutar: python -m backend.scripts.estado_ia
"""

import sys
import os
from pathlib import Path

# Agregar el directorio raíz al path
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.motor_ia import MotorIA

def mostrar_estado():
    """Muestra el estado actual del motor de IA"""
    
    print("=" * 60)
    print("ESTADO DEL MOTOR DE IA")
    print("=" * 60)
    print()
    
    motor = MotorIA()
    stats = motor.obtener_estadisticas()
    
    # Calcular porcentaje de aprendizaje
    # Basado en diversidad de patrones y confianza promedio
    total_patrones = stats['total_patrones']
    patrones_exitosos = sum(1 for p in motor.patrones_aprendidos if p.exito)
    confianza_promedio = sum(p.confianza for p in motor.patrones_aprendidos) / total_patrones if total_patrones > 0 else 0
    
    # Porcentaje basado en patrones exitosos y confianza
    porcentaje_aprendizaje = (patrones_exitosos / total_patrones * 100) * confianza_promedio if total_patrones > 0 else 0
    porcentaje_aprendizaje = min(100, porcentaje_aprendizaje)
    
    print(f"[*] Total de patrones: {total_patrones}")
    print(f"[OK] Patrones exitosos: {patrones_exitosos}")
    print(f"[*] Confianza promedio: {confianza_promedio:.2f}")
    print()
    
    print("=" * 60)
    print(f"PORCENTAJE DE APRENDIZAJE: {porcentaje_aprendizaje:.1f}%")
    print("=" * 60)
    
    # Barra de progreso
    barra_largo = 50
    completado = int(barra_largo * porcentaje_aprendizaje / 100)
    barra = "#" * completado + "-" * (barra_largo - completado)
    print(f"[{barra}] {porcentaje_aprendizaje:.1f}%")
    print()
    
    print("Patrones por intencion:")
    for intencion, cantidad in stats['patrones_por_intencion'].items():
        porcentaje_intencion = (cantidad / total_patrones * 100) if total_patrones > 0 else 0
        print(f"   - {intencion}: {cantidad} patrones ({porcentaje_intencion:.1f}%)")
    print()
    
    print("Top 10 patrones mas usados:")
    for i, (texto, veces_usado, confianza) in enumerate(stats['patrones_mas_usados'][:10], 1):
        texto_corto = texto[:45] + "..." if len(texto) > 45 else texto
        print(f"   {i:2d}. '{texto_corto}'")
        print(f"       Usos: {veces_usado} | Confianza: {confianza:.2f}")
    print()
    
    print("Top 15 palabras clave mas importantes:")
    for i, (palabra, peso) in enumerate(stats['palabras_clave_top'][:15], 1):
        print(f"   {i:2d}. {palabra}: {peso:.2f}")
    print()

if __name__ == "__main__":
    try:
        mostrar_estado()
    except Exception as e:
        print(f"[X] Error: {e}")
        import traceback
        traceback.print_exc()

