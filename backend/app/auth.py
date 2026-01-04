from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .config import settings
from .database import get_db
from .models import Usuario, RolUsuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseña usando bcrypt directamente"""
    try:
        # Validar entradas
        if not plain_password or not isinstance(plain_password, str):
            print(f"[VERIFY PASSWORD] Contraseña inválida: {type(plain_password)}")
            return False
        if not hashed_password or not isinstance(hashed_password, str):
            print(f"[VERIFY PASSWORD] Hash inválido: {type(hashed_password)}")
            return False
        
        # Convertir a bytes
        password_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        
        print(f"[VERIFY PASSWORD] Longitud password_bytes: {len(password_bytes)}")
        print(f"[VERIFY PASSWORD] Longitud hash_bytes: {len(hash_bytes)}")
        print(f"[VERIFY PASSWORD] Hash preview: {hashed_password[:30]}...")
        
        # Bcrypt tiene un límite de 72 bytes, truncar si es necesario
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
            print(f"[VERIFY PASSWORD] Password truncado a 72 bytes")
        
        # Verificar contraseña usando bcrypt directamente
        result = bcrypt.checkpw(password_bytes, hash_bytes)
        print(f"[VERIFY PASSWORD] Resultado de checkpw: {result}")
        return result
    except ValueError as e:
        # Error específico de bcrypt sobre longitud
        if "cannot be longer than 72 bytes" in str(e):
            try:
                password_bytes = plain_password.encode('utf-8')[:72]
                hash_bytes = hashed_password.encode('utf-8')
                return bcrypt.checkpw(password_bytes, hash_bytes)
            except Exception as e2:
                print(f"[AUTH ERROR] Error al verificar contraseña (después de truncar): {e2}")
                return False
        print(f"[AUTH ERROR] Error al verificar contraseña: {e}")
        return False
    except Exception as e:
        # Si hay un error al verificar (hash corrupto, etc.), retornar False
        print(f"[AUTH ERROR] Error al verificar contraseña: {e}")
        import traceback
        traceback.print_exc()
        return False


def get_password_hash(password: str) -> str:
    """Hash de contraseña usando bcrypt directamente"""
    try:
        # Validar entrada
        if not password or not isinstance(password, str):
            raise ValueError("Password must be a non-empty string")
        
        # Convertir a bytes
        password_bytes = password.encode('utf-8')
        
        # Bcrypt tiene un límite de 72 bytes, truncar si es necesario
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        
        # Generar salt y hash usando bcrypt directamente
        salt = bcrypt.gensalt()
        hash_bytes = bcrypt.hashpw(password_bytes, salt)
        
        # Convertir de bytes a string
        return hash_bytes.decode('utf-8')
    except ValueError as e:
        if "cannot be longer than 72 bytes" in str(e):
            try:
                password_bytes = password.encode('utf-8')[:72]
                salt = bcrypt.gensalt()
                hash_bytes = bcrypt.hashpw(password_bytes, salt)
                return hash_bytes.decode('utf-8')
            except Exception as e2:
                print(f"[AUTH ERROR] Error al generar hash (después de truncar): {e2}")
                raise
        print(f"[AUTH ERROR] Error al generar hash: {e}")
        raise
    except Exception as e:
        print(f"[AUTH ERROR] Error al generar hash: {e}")
        import traceback
        traceback.print_exc()
        raise


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crea token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    """Obtiene usuario actual desde token JWT"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(Usuario).filter(Usuario.username == username).first()
    if user is None or not user.activo:
        raise credentials_exception
    return user


def require_role(allowed_roles: list[RolUsuario]):
    """Dependency para verificar rol de usuario"""
    def role_checker(current_user: Usuario = Depends(get_current_user)):
        if current_user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta acción"
            )
        return current_user
    return role_checker





