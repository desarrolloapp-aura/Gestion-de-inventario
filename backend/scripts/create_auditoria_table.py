"""Script para crear la tabla de auditoría"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base
from app.models import AuditoriaLog

def create_auditoria_table():
    try:
        print("Creando tabla de auditoria...")
        AuditoriaLog.__table__.create(bind=engine, checkfirst=True)
        print("Tabla de auditoria creada exitosamente")
    except Exception as e:
        print(f"Error al crear tabla de auditoria: {e}")

if __name__ == "__main__":
    create_auditoria_table()

