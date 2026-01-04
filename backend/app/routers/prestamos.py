from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta, timezone
from ..database import get_db
from ..models import Prestamo, Equipo, Trabajador, EstadoPrestamo, Usuario, RolUsuario
from ..schemas import PrestamoResponse, PrestamoCreate, PrestamoDevolver
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api/prestamos", tags=["prestamos"])


@router.get("/", response_model=List[PrestamoResponse])
def get_prestamos(
    obra: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener préstamos según rol"""
    query = db.query(Prestamo)
    
    # RRHH solo ve activos
    if current_user.rol == RolUsuario.RRHH:
        query = query.filter(Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO)
    
    # JEFE OBRA solo ve de su obra
    if current_user.rol == RolUsuario.JEFE_OBRA:
        if not current_user.obra:
            return []
        query = query.join(Trabajador).filter(
            and_(
                Trabajador.obra == current_user.obra,
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            )
        )
    
    # Filtros opcionales
    if obra:
        query = query.join(Trabajador).filter(Trabajador.obra == obra)
    if estado:
        query = query.filter(Prestamo.estado_prestamo == estado)
    
    prestamos = query.all()
    return prestamos


@router.get("/rut/{rut}", response_model=List[PrestamoResponse])
def get_prestamos_por_rut(
    rut: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener préstamos de un trabajador"""
    # RRHH y JEFE OBRA pueden consultar
    if current_user.rol not in [RolUsuario.INFORMATICA, RolUsuario.RRHH, RolUsuario.JEFE_OBRA]:
        raise HTTPException(status_code=403, detail="No tiene permisos")
    
    prestamos = db.query(Prestamo).filter(Prestamo.trabajador_rut == rut).all()
    return prestamos


@router.post("/", response_model=PrestamoResponse)
def create_prestamo(
    prestamo_data: PrestamoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA]))
):
    """Crear préstamo (solo Informática)"""
    try:
        print(f"[PRESTAMO] Iniciando creación de préstamo - Equipo: {prestamo_data.equipo_id}, Trabajador: {prestamo_data.trabajador_rut}")
        
        # Verificar equipo existe y está libre
        equipo = db.query(Equipo).filter(Equipo.id == prestamo_data.equipo_id).first()
        if not equipo:
            print(f"[PRESTAMO] Equipo {prestamo_data.equipo_id} no encontrado")
            raise HTTPException(status_code=404, detail="Equipo no encontrado")
        
        # Verificar que no tenga préstamo activo
        prestamo_activo = db.query(Prestamo).filter(
            and_(
                Prestamo.equipo_id == prestamo_data.equipo_id,
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            )
        ).first()
        if prestamo_activo:
            print(f"[PRESTAMO] Equipo {prestamo_data.equipo_id} ya está prestado")
            raise HTTPException(status_code=400, detail="Equipo ya está prestado")
        
        # Verificar trabajador existe y está activo
        trabajador = db.query(Trabajador).filter(Trabajador.rut == prestamo_data.trabajador_rut).first()
        if not trabajador:
            print(f"[PRESTAMO] Trabajador {prestamo_data.trabajador_rut} no encontrado")
            raise HTTPException(status_code=404, detail="Trabajador no encontrado")
        if not trabajador.activo:
            print(f"[PRESTAMO] Trabajador {prestamo_data.trabajador_rut} inactivo")
            raise HTTPException(status_code=400, detail="Trabajador inactivo")
        
        # Verificar obra coincide
        if trabajador.obra != prestamo_data.obra:
            print(f"[PRESTAMO] Obra no coincide: trabajador={trabajador.obra}, enviada={prestamo_data.obra}")
            raise HTTPException(status_code=400, detail="Obra del trabajador no coincide")
        
        # Crear préstamo (+30 días)
        print(f"[PRESTAMO] Creando préstamo...")
        fecha_vencimiento = datetime.utcnow() + timedelta(days=30)
        new_prestamo = Prestamo(
            equipo_id=prestamo_data.equipo_id,
            trabajador_rut=prestamo_data.trabajador_rut,
            fecha_vencimiento=fecha_vencimiento,
            cambiado_por=current_user.username,
            estado_entrega_bueno=prestamo_data.estado_entrega_bueno,
            estado_entrega_con_cargador=prestamo_data.estado_entrega_con_cargador,
            observaciones_entrega=prestamo_data.observaciones_entrega
        )
        db.add(new_prestamo)
        print(f"[PRESTAMO] Haciendo commit...")
        try:
            db.commit()
            print(f"[PRESTAMO] Commit exitoso, refrescando...")
            db.refresh(new_prestamo)
            print(f"[PRESTAMO] Préstamo creado exitosamente: ID {new_prestamo.id}")
            return new_prestamo
        except Exception as commit_error:
            print(f"[PRESTAMO] ERROR en commit: {str(commit_error)}")
            import traceback
            traceback.print_exc()
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error al guardar préstamo en la base de datos: {str(commit_error)}"
            )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_msg = str(e)
        print(f"[PRESTAMO] ERROR al crear préstamo: {error_msg}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear préstamo: {error_msg}"
        )


@router.put("/{prestamo_id}/devolver", response_model=PrestamoResponse)
def devolver_prestamo(
    prestamo_id: int,
    devolucion_data: PrestamoDevolver,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA]))
):
    """Devolver préstamo (solo Informática)"""
    prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    if prestamo.estado_prestamo == EstadoPrestamo.DEVUELTO:
        raise HTTPException(status_code=400, detail="Préstamo ya fue devuelto")
    
    # Guardar la hora actual en UTC
    # La guardamos en UTC y el frontend la mostrará en hora local de Chile
    prestamo.estado_prestamo = EstadoPrestamo.DEVUELTO
    prestamo.fecha_devolucion = datetime.utcnow()
    prestamo.cambiado_por = current_user.username
    prestamo.estado_devolucion_bueno = devolucion_data.estado_devolucion_bueno
    prestamo.estado_devolucion_con_cargador = devolucion_data.estado_devolucion_con_cargador
    prestamo.observaciones_devolucion = devolucion_data.observaciones_devolucion
    db.commit()
    db.refresh(prestamo)
    return prestamo


@router.get("/{prestamo_id}", response_model=PrestamoResponse)
def get_prestamo(
    prestamo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener préstamo por ID"""
    prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    # Verificar permisos JEFE OBRA
    if current_user.rol == RolUsuario.JEFE_OBRA:
        if prestamo.trabajador.obra != current_user.obra:
            raise HTTPException(status_code=403, detail="No tiene acceso a este préstamo")
    
    return prestamo


@router.put("/{prestamo_id}/marcar-cargador-devuelto", response_model=PrestamoResponse)
def marcar_cargador_devuelto(
    prestamo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA]))
):
    """Marcar cargador como devuelto después"""
    prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    if prestamo.estado_prestamo != EstadoPrestamo.DEVUELTO:
        raise HTTPException(status_code=400, detail="Solo se puede marcar cargador devuelto en préstamos devueltos")
    
    prestamo.cargador_devuelto_despues = True
    prestamo.cambiado_por = current_user.username
    db.commit()
    db.refresh(prestamo)
    return prestamo


@router.get("/trabajador/{rut}/alertas")
def get_alertas_trabajador(
    rut: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener alertas pendientes de un trabajador (equipos mal devueltos)"""
    # Verificar permisos
    if current_user.rol not in [RolUsuario.INFORMATICA, RolUsuario.RRHH, RolUsuario.JEFE_OBRA]:
        raise HTTPException(status_code=403, detail="No tiene permisos")
    
    # Buscar préstamos devueltos con problemas pendientes
    prestamos_problema = db.query(Prestamo).filter(
        and_(
            Prestamo.trabajador_rut == rut,
            Prestamo.estado_prestamo == EstadoPrestamo.DEVUELTO,
            # Problemas: sin cargador y no fue devuelto después, o equipo no bueno
            or_(
                and_(
                    Prestamo.estado_devolucion_con_cargador == False,
                    Prestamo.cargador_devuelto_despues == False
                ),
                Prestamo.estado_devolucion_bueno == False
            )
        )
    ).order_by(Prestamo.fecha_devolucion.desc()).all()
    
    alertas = []
    for prestamo in prestamos_problema:
        problemas = []
        if prestamo.estado_devolucion_con_cargador == False and not prestamo.cargador_devuelto_despues:
            problemas.append("Sin cargador")
        if prestamo.estado_devolucion_bueno == False:
            problemas.append("Equipo en mal estado")
        
        if problemas:
            alertas.append({
                "prestamo_id": prestamo.id,
                "equipo_serie": prestamo.equipo.serie,
                "equipo_tipo": prestamo.equipo.tipo,
                "fecha_devolucion": prestamo.fecha_devolucion.isoformat() if prestamo.fecha_devolucion else None,
                "problemas": problemas,
                "observaciones": prestamo.observaciones_devolucion,
                "cargador_devuelto": prestamo.cargador_devuelto_despues
            })
    
    return alertas


@router.delete("/{prestamo_id}", status_code=204)
def delete_prestamo(
    prestamo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA]))
):
    """Eliminar préstamo del historial (solo Informática)"""
    prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    # Solo permitir eliminar préstamos devueltos (del historial)
    if prestamo.estado_prestamo != EstadoPrestamo.DEVUELTO:
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar préstamos devueltos del historial")
    
    db.delete(prestamo)
    db.commit()
    return None





