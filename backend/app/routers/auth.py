from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Usuario
from ..schemas import UsuarioLogin, UsuarioCreate, Token, UsuarioResponse, ChangePasswordRequest
from pydantic import BaseModel
from ..auth import verify_password, get_password_hash, create_access_token, get_current_user
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(credentials: UsuarioLogin, db: Session = Depends(get_db)):
    """Login de usuario"""
    try:
        # Debug: imprimir credenciales recibidas (sin mostrar la contraseña completa)
        username_clean = credentials.username.strip() if credentials.username else ""
        password_clean = credentials.password.strip() if credentials.password else ""
        
        print(f"[LOGIN DEBUG] Usuario recibido (raw): '{credentials.username}'")
        print(f"[LOGIN DEBUG] Usuario recibido (clean): '{username_clean}'")
        print(f"[LOGIN DEBUG] Longitud de contraseña: {len(password_clean)}")
        print(f"[LOGIN DEBUG] Contraseña tiene espacios al inicio/fin: {credentials.password != password_clean if credentials.password else False}")
        
        # Usar credenciales limpias
        user = db.query(Usuario).filter(Usuario.username == username_clean).first()
        if not user:
            print(f"[LOGIN DEBUG] Usuario '{username_clean}' no encontrado en BD")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario o contraseña incorrectos"
            )
        
        print(f"[LOGIN DEBUG] Usuario encontrado: {user.username}, activo: {user.activo}")
        try:
            password_match = verify_password(password_clean, user.password_hash)
            print(f"[LOGIN DEBUG] Contraseña coincide: {password_match}")
        except Exception as e:
            print(f"[LOGIN ERROR] Error al verificar contraseña: {e}")
            # Si el hash está corrupto, intentar regenerarlo con la contraseña actual
            # (solo para debugging, en producción esto no debería pasar)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al verificar contraseña. El hash puede estar corrupto."
            )
        
        if not password_match:
            # Intentar también con la contraseña sin limpiar por si acaso
            if credentials.password != password_clean:
                password_match_2 = verify_password(credentials.password, user.password_hash)
                print(f"[LOGIN DEBUG] Contraseña sin limpiar coincide: {password_match_2}")
                if password_match_2:
                    password_match = True
            
            if not password_match:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario o contraseña incorrectos"
                )
        if not user.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario inactivo"
            )
        
        access_token = create_access_token(data={"sub": user.username, "rol": user.rol.value})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "rol": user.rol,
            "obra": user.obra
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        # Mensaje más amigable para errores de conexión
        if "could not translate host name" in error_msg or "Host desconocido" in error_msg:
            error_msg = "No se puede conectar a Supabase. Verifica que el proyecto esté activo y la URL sea correcta."
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al conectar con la base de datos: {error_msg}"
        )


@router.post("/register", response_model=UsuarioResponse)
def register(user_data: UsuarioCreate, db: Session = Depends(get_db)):
    """Registrar nuevo usuario (solo para setup inicial)"""
    # Verificar si ya existe
    if db.query(Usuario).filter(Usuario.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Usuario ya existe")
    if db.query(Usuario).filter(Usuario.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email ya existe")
    
    # Crear usuario
    hashed_password = get_password_hash(user_data.password)
    new_user = Usuario(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        rol=user_data.rol,
        obra=user_data.obra
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/me", response_model=UsuarioResponse)
def get_current_user_info(current_user: Usuario = Depends(get_current_user)):
    """Obtener información del usuario actual"""
    return current_user


@router.put("/change-password")
def change_password(
    password_data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Cambiar contraseña del usuario actual"""
    # Verificar contraseña actual
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña actual incorrecta"
        )
    
    # Validar nueva contraseña
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres"
        )
    
    # Actualizar contraseña
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente"}


class ResetPasswordRequest(BaseModel):
    new_password: str

@router.post("/reset-password/{username}")
def reset_password_admin(
    username: str,
    password_data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Endpoint temporal para resetear contraseña de un usuario
    ⚠️ SOLO PARA DESARROLLO/EMERGENCIA - Remover en producción
    """
    user = db.query(Usuario).filter(Usuario.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Validar nueva contraseña
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 6 caracteres"
        )
    
    # Actualizar contraseña
    user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": f"Contraseña de '{username}' actualizada exitosamente"}

