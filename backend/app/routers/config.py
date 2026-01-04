"""
Router para gestión de configuración dinámica (obras y tipos de equipos)
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import distinct, func, and_
from ..database import get_db
from ..models import Trabajador, Equipo, Prestamo, EstadoPrestamo, Usuario, RolUsuario, Obra
from ..auth import require_role, get_current_user
from ..schemas import ObraCreate, ObraResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/config", tags=["config"])


# Schemas
class ObraEnUsoResponse(BaseModel):
    nombre: str
    en_uso: bool  # Si hay trabajadores o equipos asociados

class TipoEquipoResponse(BaseModel):
    nombre: str
    en_uso: bool  # Si hay equipos de este tipo


@router.get("/obras", response_model=List[str])
def get_obras(db: Session = Depends(get_db)):
    """Obtener lista de todas las obras"""
    obras = db.query(Obra).all()
    return sorted([obra.nombre for obra in obras])


@router.post("/obras", response_model=ObraResponse)
def create_obra(
    obra: ObraCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA]))
):
    """Crear nueva obra (solo Informática)"""
    # Verificar que no exista
    obra_existente = db.query(Obra).filter(Obra.nombre == obra.nombre).first()
    if obra_existente:
        raise HTTPException(status_code=400, detail="La obra ya existe")
    
    new_obra = Obra(nombre=obra.nombre)
    db.add(new_obra)
    db.commit()
    db.refresh(new_obra)
    return new_obra


@router.delete("/obras/{nombre}")
def delete_obra(
    nombre: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA]))
):
    """Eliminar obra (solo Informática, solo si no está en uso)"""
    obra = db.query(Obra).filter(Obra.nombre == nombre).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    
    # Verificar si está en uso
    trabajadores_count = db.query(func.count(Trabajador.rut)).filter(
        Trabajador.obra == nombre
    ).scalar()
    
    usuarios_count = db.query(func.count(Usuario.id)).filter(
        and_(Usuario.obra == nombre, Usuario.rol == RolUsuario.JEFE_OBRA)
    ).scalar()
    
    if trabajadores_count > 0 or usuarios_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar la obra porque está en uso ({trabajadores_count} trabajadores, {usuarios_count} usuarios)"
        )
    
    db.delete(obra)
    db.commit()
    return {"message": "Obra eliminada"}


@router.get("/tipos-equipos", response_model=List[str])
def get_tipos_equipos(db: Session = Depends(get_db)):
    """Obtener lista de todos los tipos de equipos únicos"""
    tipos = db.query(distinct(Equipo.tipo)).filter(
        Equipo.tipo.isnot(None)
    ).all()
    
    return sorted([tipo[0] for tipo in tipos if tipo[0]])


@router.get("/obras/en-uso")
def get_obras_en_uso(db: Session = Depends(get_db)):
    """Obtener obras con información de si están en uso"""
    obras = get_obras(db)
    resultado = []
    
    for obra in obras:
        # Verificar si hay trabajadores activos con esta obra
        trabajadores_count = db.query(func.count(Trabajador.rut)).filter(
            and_(Trabajador.obra == obra, Trabajador.activo == True)
        ).scalar()
        
        # Verificar si hay préstamos activos de esta obra
        prestamos_count = db.query(func.count(Prestamo.id)).join(
            Trabajador
        ).filter(
            and_(
                Trabajador.obra == obra,
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            )
        ).scalar()
        
        en_uso = trabajadores_count > 0 or prestamos_count > 0
        resultado.append(ObraEnUsoResponse(nombre=obra, en_uso=en_uso))
    
    return resultado


@router.get("/tipos-equipos/en-uso")
def get_tipos_equipos_en_uso(db: Session = Depends(get_db)):
    """Obtener tipos de equipos con información de si están en uso"""
    tipos = get_tipos_equipos(db)
    resultado = []
    
    for tipo in tipos:
        # Contar equipos de este tipo
        equipos_count = db.query(func.count(Equipo.id)).filter(
            Equipo.tipo == tipo
        ).scalar()
        
        resultado.append(TipoEquipoResponse(nombre=tipo, en_uso=equipos_count > 0))
    
    return resultado

