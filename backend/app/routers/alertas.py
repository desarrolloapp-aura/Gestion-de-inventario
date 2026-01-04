from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from ..database import get_db
from ..models import Prestamo, Trabajador, Equipo, EstadoPrestamo, Usuario, RolUsuario
from ..schemas import AlertaResponse
from ..auth import get_current_user

router = APIRouter(prefix="/api/alertas", tags=["alertas"])


@router.get("/", response_model=List[AlertaResponse])
def get_alertas(
    obra: str = Query(None, description="Filtrar por obra"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener alertas (vencidos, despidos)"""
    alertas = []
    hoy = datetime.utcnow()
    
    # Filtrar por obra si es JEFE OBRA
    obra_filter = current_user.obra if current_user.rol == RolUsuario.JEFE_OBRA else obra
    
    # 1. PRÉSTAMOS VENCIDOS
    query_vencidos = db.query(Prestamo).join(Trabajador).join(Equipo).filter(
        and_(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO,
            Prestamo.fecha_vencimiento < hoy
        )
    )
    
    if obra_filter:
        query_vencidos = query_vencidos.filter(Trabajador.obra == obra_filter)
    
    prestamos_vencidos = query_vencidos.all()
    for prestamo in prestamos_vencidos:
        dias_vencido = (hoy - prestamo.fecha_vencimiento).days
        alertas.append(AlertaResponse(
            tipo="VENCIDO",
            mensaje=f"{prestamo.equipo.serie} VENCIDO {prestamo.trabajador.obra}",
            equipo_serie=prestamo.equipo.serie,
            trabajador_nombre=prestamo.trabajador.nombre,
            obra=prestamo.trabajador.obra,
            fecha_vencimiento=prestamo.fecha_vencimiento,
            dias_restantes=-dias_vencido
        ))
    
    # 2. PRÉSTAMOS POR VENCER (<3 días)
    query_por_vencer = db.query(Prestamo).join(Trabajador).join(Equipo).filter(
        and_(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO,
            Prestamo.fecha_vencimiento >= hoy,
            Prestamo.fecha_vencimiento <= hoy.replace(day=hoy.day + 3) if hoy.day + 3 <= 31 else hoy
        )
    )
    
    if obra_filter:
        query_por_vencer = query_por_vencer.filter(Trabajador.obra == obra_filter)
    
    prestamos_por_vencer = query_por_vencer.all()
    for prestamo in prestamos_por_vencer:
        dias_restantes = (prestamo.fecha_vencimiento - hoy).days
        if dias_restantes < 3:
            alertas.append(AlertaResponse(
                tipo="POR_VENCER",
                mensaje=f"{prestamo.equipo.serie} vence en {dias_restantes} días - {prestamo.trabajador.obra}",
                equipo_serie=prestamo.equipo.serie,
                trabajador_nombre=prestamo.trabajador.nombre,
                obra=prestamo.trabajador.obra,
                fecha_vencimiento=prestamo.fecha_vencimiento,
                dias_restantes=dias_restantes
            ))
    
    # 3. TRABAJADORES DESPEDIDOS CON EQUIPOS
    query_despidos = db.query(Prestamo).join(Trabajador).join(Equipo).filter(
        and_(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO,
            Trabajador.activo == False
        )
    )
    
    if obra_filter:
        query_despidos = query_despidos.filter(Trabajador.obra == obra_filter)
    
    prestamos_despidos = query_despidos.all()
    for prestamo in prestamos_despidos:
        alertas.append(AlertaResponse(
            tipo="DESPIDO",
            mensaje=f"{prestamo.trabajador.nombre} DESPIDO debe {prestamo.equipo.serie}",
            equipo_serie=prestamo.equipo.serie,
            trabajador_nombre=prestamo.trabajador.nombre,
            obra=prestamo.trabajador.obra,
            fecha_vencimiento=prestamo.fecha_vencimiento
        ))
    
    # Ordenar por urgencia (vencidos primero, luego por días restantes)
    alertas.sort(key=lambda x: (
        0 if x.tipo == "VENCIDO" else (1 if x.tipo == "DESPIDO" else 2),
        x.dias_restantes if x.dias_restantes else 999
    ))
    
    return alertas





