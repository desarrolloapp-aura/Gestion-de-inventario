"""
Script para cambiar la columna tipo de enum a VARCHAR en PostgreSQL
Este script realiza la migración de forma segura.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

def fix_tipo_column():
    """Cambiar columna tipo de enum a VARCHAR"""
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Iniciar transacción
            trans = conn.begin()
            
            try:
                print("Paso 1: Creando columna temporal tipo_temp...")
                conn.execute(text("ALTER TABLE equipos ADD COLUMN IF NOT EXISTS tipo_temp VARCHAR"))
                
                print("Paso 2: Copiando datos de enum a VARCHAR...")
                conn.execute(text("UPDATE equipos SET tipo_temp = tipo::text"))
                
                print("Paso 3: Eliminando columna enum antigua...")
                conn.execute(text("ALTER TABLE equipos DROP COLUMN IF EXISTS tipo"))
                
                print("Paso 4: Renombrando columna temporal...")
                conn.execute(text("ALTER TABLE equipos RENAME COLUMN tipo_temp TO tipo"))
                
                print("Paso 5: Estableciendo NOT NULL...")
                conn.execute(text("ALTER TABLE equipos ALTER COLUMN tipo SET NOT NULL"))
                
                # Commit transacción
                trans.commit()
                print("\n[OK] Migracion completada exitosamente!")
                print("La columna 'tipo' ahora acepta cualquier string.")
                
            except Exception as e:
                try:
                    trans.rollback()
                except:
                    pass
                print(f"\n[ERROR] Error durante la migracion: {e}")
                print("La transaccion fue revertida. La base de datos no fue modificada.")
                raise
                
    except Exception as e:
        print(f"\n[ERROR] Error de conexion: {e}")
        sys.exit(1)
    finally:
        engine.dispose()

if __name__ == "__main__":
    print("=" * 60)
    print("Migración: Cambiar columna 'tipo' de ENUM a VARCHAR")
    print("=" * 60)
    print("\nEste script cambiará la columna 'tipo' de la tabla 'equipos'")
    print("de un tipo ENUM a VARCHAR, permitiendo cualquier valor string.\n")
    
    # Ejecutar automáticamente
    fix_tipo_column()

