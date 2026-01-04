"""
Script para agregar los nuevos campos a la tabla prestamos
Ejecutar: python scripts/add_prestamo_fields.py
"""
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from sqlalchemy import text

def add_prestamo_fields():
    """Agregar campos de estado a la tabla prestamos"""
    try:
        with engine.connect() as conn:
            # Verificar si las columnas ya existen
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'prestamos' 
                AND column_name IN (
                    'estado_entrega_bueno',
                    'estado_entrega_con_cargador',
                    'observaciones_entrega',
                    'estado_devolucion_bueno',
                    'estado_devolucion_con_cargador',
                    'observaciones_devolucion'
                )
            """)
            result = conn.execute(check_query)
            existing_columns = [row[0] for row in result]
            
            # Agregar columnas que no existen
            if 'estado_entrega_bueno' not in existing_columns:
                print("Agregando estado_entrega_bueno...")
                conn.execute(text("ALTER TABLE prestamos ADD COLUMN estado_entrega_bueno BOOLEAN DEFAULT TRUE"))
                conn.commit()
            
            if 'estado_entrega_con_cargador' not in existing_columns:
                print("Agregando estado_entrega_con_cargador...")
                conn.execute(text("ALTER TABLE prestamos ADD COLUMN estado_entrega_con_cargador BOOLEAN DEFAULT TRUE"))
                conn.commit()
            
            if 'observaciones_entrega' not in existing_columns:
                print("Agregando observaciones_entrega...")
                conn.execute(text("ALTER TABLE prestamos ADD COLUMN observaciones_entrega TEXT"))
                conn.commit()
            
            if 'estado_devolucion_bueno' not in existing_columns:
                print("Agregando estado_devolucion_bueno...")
                conn.execute(text("ALTER TABLE prestamos ADD COLUMN estado_devolucion_bueno BOOLEAN"))
                conn.commit()
            
            if 'estado_devolucion_con_cargador' not in existing_columns:
                print("Agregando estado_devolucion_con_cargador...")
                conn.execute(text("ALTER TABLE prestamos ADD COLUMN estado_devolucion_con_cargador BOOLEAN"))
                conn.commit()
            
            if 'observaciones_devolucion' not in existing_columns:
                print("Agregando observaciones_devolucion...")
                conn.execute(text("ALTER TABLE prestamos ADD COLUMN observaciones_devolucion TEXT"))
                conn.commit()
            
            print("OK: Todas las columnas han sido agregadas correctamente")
            
    except Exception as e:
        print(f"ERROR: Error al agregar columnas: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Agregando campos a la tabla prestamos...")
    if add_prestamo_fields():
        print("OK: Migracion completada exitosamente")
    else:
        print("ERROR: Error en la migracion")
        sys.exit(1)

