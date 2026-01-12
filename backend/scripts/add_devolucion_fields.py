"""
Script para agregar campos de devolucion a la tabla prestamos
Ejecutar: python scripts/add_devolucion_fields.py
"""
import sys
import os

# Agregar el directorio raiz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from sqlalchemy import text

def add_devolucion_fields():
    """Agregar campos de devolucion a la tabla prestamos"""
    try:
        with engine.connect() as conn:
            # Verificar si las columnas ya existen
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'prestamos' 
                AND column_name IN (
                    'fecha_devolucion',
                    'cargador_devuelto_despues'
                )
            """)
            result = conn.execute(check_query)
            existing_columns = [row[0] for row in result]
            
            # Agregar columnas que no existen
            if 'fecha_devolucion' not in existing_columns:
                print("Agregando fecha_devolucion...")
                conn.execute(text("ALTER TABLE prestamos ADD COLUMN fecha_devolucion TIMESTAMP"))
                conn.commit()
            
            if 'cargador_devuelto_despues' not in existing_columns:
                print("Agregando cargador_devuelto_despues...")
                conn.execute(text("ALTER TABLE prestamos ADD COLUMN cargador_devuelto_despues BOOLEAN DEFAULT FALSE"))
                conn.commit()
            
            print("OK: Todas las columnas han sido agregadas correctamente")
            
    except Exception as e:
        print(f"ERROR: Error al agregar columnas: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Agregando campos de devolucion a la tabla prestamos...")
    if add_devolucion_fields():
        print("OK: Migracion completada exitosamente")
    else:
        print("ERROR: Error en la migracion")
        sys.exit(1)



