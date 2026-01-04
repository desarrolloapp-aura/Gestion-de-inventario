"""
Script de Entrenamiento y Despliegue del Motor de IA
Ejecutar: python -m backend.scripts.entrenar_ia
"""

import sys
import os
from pathlib import Path

# Agregar el directorio raíz al path
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.motor_ia import MotorIA, PatronAprendido
from datetime import datetime
import time

def mostrar_progreso(actual, total, mensaje="Procesando"):
    """Muestra una barra de progreso"""
    porcentaje = (actual / total) * 100
    barra_largo = 40
    completado = int(barra_largo * actual / total)
    barra = "#" * completado + "-" * (barra_largo - completado)
    print(f"\r{mensaje}: [{barra}] {porcentaje:.1f}% ({actual}/{total})", end="", flush=True)
    if actual == total:
        print()  # Nueva línea al completar

def entrenar_ia():
    """Entrena y despliega el motor de IA con ejemplos"""
    
    print("=" * 60)
    print("DESPLIEGUE Y ENTRENAMIENTO DEL MOTOR DE IA")
    print("=" * 60)
    print()
    
    # Inicializar motor
    print("[*] Inicializando motor de IA...")
    motor = MotorIA()
    print(f"[OK] Motor inicializado con {len(motor.patrones_aprendidos)} patrones base")
    print()
    
    # Ejemplos de entrenamiento
    ejemplos_entrenamiento = [
        # Quien tiene equipo
        ("quien tiene el notebook con la serie MP1D2AEJ", "quien_tiene_equipo", "buscar_trabajador_por_serie"),
        ("que trabajador tiene el pc con serie ABC123", "quien_tiene_equipo", "buscar_trabajador_por_serie"),
        ("a quien se le asigno el equipo con serie XYZ789", "quien_tiene_equipo", "buscar_trabajador_por_serie"),
        ("quien tiene el laptop con la serie DEF456", "quien_tiene_equipo", "buscar_trabajador_por_serie"),
        ("que trabajador tiene el notebook MP1D2AEJ", "quien_tiene_equipo", "buscar_trabajador_por_serie"),
        ("a quien se le asigno el pc ABC123", "quien_tiene_equipo", "buscar_trabajador_por_serie"),
        
        # Equipos disponibles
        ("equipos disponibles", "equipos_disponibles", "listar_equipos_disponibles"),
        ("que equipos hay disponibles", "equipos_disponibles", "listar_equipos_disponibles"),
        ("equipos libres", "equipos_disponibles", "listar_equipos_disponibles"),
        ("hay equipos disponibles", "equipos_disponibles", "listar_equipos_disponibles"),
        ("mostrar equipos disponibles", "equipos_disponibles", "listar_equipos_disponibles"),
        ("listar equipos disponibles", "equipos_disponibles", "listar_equipos_disponibles"),
        ("que hay disponible", "equipos_disponibles", "listar_equipos_disponibles"),
        
        # Equipos prestados
        ("equipos prestados", "equipos_prestados", "listar_equipos_prestados"),
        ("equipos asignados", "equipos_prestados", "listar_equipos_prestados"),
        ("equipos ocupados", "equipos_prestados", "listar_equipos_prestados"),
        ("equipos en préstamo", "equipos_prestados", "listar_equipos_prestados"),
        ("que equipos estan prestados", "equipos_prestados", "listar_equipos_prestados"),
        ("que equipos están asignados", "equipos_prestados", "listar_equipos_prestados"),
        ("mostrar equipos prestados", "equipos_prestados", "listar_equipos_prestados"),
        
        # Total equipos
        ("total equipos", "total_equipos", "listar_todos_equipos"),
        ("equipos en total", "total_equipos", "listar_todos_equipos"),
        ("cuantos equipos hay", "total_equipos", "listar_todos_equipos"),
        ("cuántos equipos hay en total", "total_equipos", "listar_todos_equipos"),
        ("todos los equipos", "total_equipos", "listar_todos_equipos"),
        ("listar todos los equipos", "total_equipos", "listar_todos_equipos"),
    ]
    
    print("[*] Iniciando ciclo de entrenamiento...")
    print(f"[*] Ejemplos a procesar: {len(ejemplos_entrenamiento)}")
    print()
    
    # Ciclo de entrenamiento
    patrones_antes = len(motor.patrones_aprendidos)
    
    for i, (texto, intencion, accion) in enumerate(ejemplos_entrenamiento, 1):
        mostrar_progreso(i, len(ejemplos_entrenamiento), "Entrenando")
        motor.aprender_nuevo_patron(texto, intencion, accion)
        time.sleep(0.05)  # Simular procesamiento
    
    patrones_despues = len(motor.patrones_aprendidos)
    patrones_nuevos = patrones_despues - patrones_antes
    
    print()
    print("[OK] Entrenamiento completado!")
    print()
    
    # Guardar conocimiento
    print("[*] Guardando conocimiento aprendido...")
    motor.guardar_conocimiento()
    print("[OK] Conocimiento guardado exitosamente")
    print()
    
    # Mostrar estadísticas
    print("=" * 60)
    print("ESTADISTICAS DE APRENDIZAJE")
    print("=" * 60)
    
    stats = motor.obtener_estadisticas()
    
    print(f"[*] Total de patrones aprendidos: {stats['total_patrones']}")
    print(f"[+] Patrones nuevos en este ciclo: {patrones_nuevos}")
    print()
    
    print("Patrones por intencion:")
    for intencion, cantidad in stats['patrones_por_intencion'].items():
        print(f"   - {intencion}: {cantidad} patrones")
    print()
    
    print("Top 5 patrones mas usados:")
    for i, (texto, veces_usado, confianza) in enumerate(stats['patrones_mas_usados'][:5], 1):
        print(f"   {i}. '{texto[:50]}...' - Usado {veces_usado} veces (Confianza: {confianza:.2f})")
    print()
    
    # Calcular porcentaje de aprendizaje
    total_posibles = len(ejemplos_entrenamiento)
    patrones_unicos = len(set([p.texto for p in motor.patrones_aprendidos]))
    porcentaje_aprendizaje = min(100, (patrones_unicos / total_posibles) * 100)
    
    print("=" * 60)
    print(f"PORCENTAJE DE APRENDIZAJE: {porcentaje_aprendizaje:.1f}%")
    print("=" * 60)
    print()
    
    # Mostrar barra de aprendizaje
    barra_largo = 50
    completado = int(barra_largo * porcentaje_aprendizaje / 100)
    barra = "#" * completado + "-" * (barra_largo - completado)
    print(f"[{barra}] {porcentaje_aprendizaje:.1f}%")
    print()
    
    print("[OK] Motor de IA desplegado y listo para usar!")
    print()
    print("[*] El motor aprendera mas con cada interaccion del usuario.")
    print("[*] Ejecuta este script periodicamente para mejorar el aprendizaje.")
    print()

if __name__ == "__main__":
    try:
        entrenar_ia()
    except KeyboardInterrupt:
        print("\n\n[!] Entrenamiento interrumpido por el usuario")
    except Exception as e:
        print(f"\n\n[X] Error durante el entrenamiento: {e}")
        import traceback
        traceback.print_exc()

