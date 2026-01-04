from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Trabajador, Usuario, RolUsuario
from ..schemas import TrabajadorResponse, TrabajadorCreate, TrabajadorUpdate
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api/trabajadores", tags=["trabajadores"])


@router.get("/", response_model=List[TrabajadorResponse])
def get_trabajadores(
    obra: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener trabajadores"""
    query = db.query(Trabajador)
    
    # JEFE OBRA solo ve de su obra
    if current_user.rol == RolUsuario.JEFE_OBRA:
        if not current_user.obra:
            return []
        query = query.filter(Trabajador.obra == current_user.obra)
    
    if obra:
        query = query.filter(Trabajador.obra == obra)
    if activo is not None:
        query = query.filter(Trabajador.activo == activo)
    
    trabajadores = query.all()
    return trabajadores


@router.get("/{rut}", response_model=TrabajadorResponse)
def get_trabajador(
    rut: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener trabajador por RUT"""
    trabajador = db.query(Trabajador).filter(Trabajador.rut == rut).first()
    if not trabajador:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    
    # Verificar permisos JEFE OBRA
    if current_user.rol == RolUsuario.JEFE_OBRA:
        if trabajador.obra != current_user.obra:
            raise HTTPException(status_code=403, detail="No tiene acceso a este trabajador")
    
    return trabajador


@router.post("/", response_model=TrabajadorResponse)
def create_trabajador(
    trabajador: TrabajadorCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA, RolUsuario.RRHH]))
):
    """Crear trabajador (Informática o RRHH)"""
    if db.query(Trabajador).filter(Trabajador.rut == trabajador.rut).first():
        raise HTTPException(status_code=400, detail="RUT ya existe")
    
    new_trabajador = Trabajador(**trabajador.dict())
    db.add(new_trabajador)
    db.commit()
    db.refresh(new_trabajador)
    return new_trabajador


@router.put("/{rut}", response_model=TrabajadorResponse)
def update_trabajador(
    rut: str,
    trabajador_update: TrabajadorUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA, RolUsuario.RRHH]))
):
    """Actualizar trabajador (Informática o RRHH)"""
    trabajador = db.query(Trabajador).filter(Trabajador.rut == rut).first()
    if not trabajador:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    
    update_data = trabajador_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trabajador, field, value)
    
    db.commit()
    db.refresh(trabajador)
    return trabajador


@router.put("/{rut}/despido")
def marcar_despido(
    rut: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.RRHH]))
):
    """Marcar trabajador como despedido (solo RRHH) - genera alerta"""
    trabajador = db.query(Trabajador).filter(Trabajador.rut == rut).first()
    if not trabajador:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    
    trabajador.activo = False
    db.commit()
    return {"message": "Trabajador marcado como despedido", "trabajador": trabajador}





