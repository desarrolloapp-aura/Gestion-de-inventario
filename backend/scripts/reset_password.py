"""
Script para resetear la contraseña de un usuario
Uso: python scripts/reset_password.py <username> <new_password>
"""
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Usuario
from app.auth import get_password_hash

def reset_password(username: str, new_password: str):
    """Resetea la contraseña de un usuario"""
    db = SessionLocal()
    try:
        user = db.query(Usuario).filter(Usuario.username == username).first()
        if not user:
            print(f"❌ Usuario '{username}' no encontrado")
            return False
        
        # Generar nuevo hash
        new_hash = get_password_hash(new_password)
        user.password_hash = new_hash
        db.commit()
        
        print(f"✅ Contraseña de '{username}' actualizada exitosamente")
        return True
    except Exception as e:
        db.rollback()
        print(f"❌ Error al actualizar contraseña: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python scripts/reset_password.py <username> <new_password>")
        print("Ejemplo: python scripts/reset_password.py admin admin123")
        sys.exit(1)
    
    username = sys.argv[1]
    new_password = sys.argv[2]
    
    reset_password(username, new_password)



