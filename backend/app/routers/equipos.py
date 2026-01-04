from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from ..database import get_db
from ..models import Equipo, Prestamo, EstadoPrestamo, Usuario, RolUsuario, Trabajador
from ..schemas import EquipoResponse, EquipoCreate, EquipoUpdate, EquipoConPrestamo
from ..auth import get_current_user, require_role
from datetime import datetime
import qrcode
from io import BytesIO

router = APIRouter(prefix="/api/equipos", tags=["equipos"])


@router.get("/", response_model=List[EquipoConPrestamo])
def get_equipos(
    obra: Optional[str] = Query(None, description="Filtrar por obra"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    serie: Optional[str] = Query(None, description="Buscar por serie"),
    nombre: Optional[str] = Query(None, description="Buscar por nombre (tipo/marca/modelo)"),
    busqueda: Optional[str] = Query(None, description="Buscar por serie o nombre (tipo/marca/modelo)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener equipos según rol del usuario"""
    query = db.query(Equipo)
    
    # JEFE OBRA solo ve equipos de su obra (a través de préstamos activos)
    if current_user.rol == RolUsuario.JEFE_OBRA:
        if not current_user.obra:
            return []
        # Solo equipos prestados a trabajadores de su obra
        query = query.join(Prestamo, Equipo.id == Prestamo.equipo_id).join(
            Trabajador, Prestamo.trabajador_rut == Trabajador.rut
        ).filter(
            and_(
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO,
                Trabajador.obra == current_user.obra
            )
        ).distinct()
    
    # Filtros opcionales
    if obra and current_user.rol != RolUsuario.JEFE_OBRA:
        # Buscar equipos prestados a trabajadores de esa obra
        query = query.join(Prestamo, Equipo.id == Prestamo.equipo_id).join(
            Trabajador, Prestamo.trabajador_rut == Trabajador.rut
        ).filter(
            and_(
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO,
                Trabajador.obra == obra
            )
        ).distinct()
    
    if tipo:
        query = query.filter(Equipo.tipo == tipo)
    if estado:
        query = query.filter(Equipo.estado_dispositivo == estado)
    if serie:
        query = query.filter(Equipo.serie.ilike(f"%{serie}%"))
    if nombre:
        # Buscar en tipo, marca o modelo
        query = query.filter(
            or_(
                Equipo.tipo.ilike(f"%{nombre}%"),
                Equipo.marca.ilike(f"%{nombre}%"),
                Equipo.modelo.ilike(f"%{nombre}%")
            )
        )
    if busqueda:
        # Buscar en serie, tipo, marca o modelo
        query = query.filter(
            or_(
                Equipo.serie.ilike(f"%{busqueda}%"),
                Equipo.tipo.ilike(f"%{busqueda}%"),
                Equipo.marca.ilike(f"%{busqueda}%"),
                Equipo.modelo.ilike(f"%{busqueda}%")
            )
        )
    
    equipos = query.all()
    
    # Agregar información de préstamo activo y último préstamo devuelto
    result = []
    for equipo in equipos:
        prestamo_activo = db.query(Prestamo).filter(
            and_(
                Prestamo.equipo_id == equipo.id,
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            )
        ).first()
        
        # Obtener el último préstamo devuelto (más reciente)
        ultimo_prestamo_devuelto = db.query(Prestamo).filter(
            and_(
                Prestamo.equipo_id == equipo.id,
                Prestamo.estado_prestamo == EstadoPrestamo.DEVUELTO
            )
        ).order_by(Prestamo.fecha_devolucion.desc()).first()
        
        equipo_dict = {
            **equipo.__dict__,
            "prestamo_activo": prestamo_activo,
            "ultimo_prestamo_devuelto": ultimo_prestamo_devuelto
        }
        result.append(EquipoConPrestamo(**equipo_dict))
    
    return result


@router.get("/libres", response_model=List[EquipoResponse])
def get_equipos_libres(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA]))
):
    """Obtener equipos libres (solo Informática)"""
    # Equipos sin préstamos activos
    equipos_con_prestamo = db.query(Prestamo.equipo_id).filter(
        Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
    ).subquery()
    
    equipos_libres = db.query(Equipo).filter(
        ~Equipo.id.in_(db.query(equipos_con_prestamo.c.equipo_id))
    ).filter(Equipo.estado_dispositivo != "BAJA").all()
    
    return equipos_libres


@router.get("/{equipo_id}", response_model=EquipoConPrestamo)
def get_equipo(
    equipo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener equipo por ID"""
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    # Verificar permisos JEFE OBRA
    if current_user.rol == RolUsuario.JEFE_OBRA:
        prestamo = db.query(Prestamo).filter(
            and_(
                Prestamo.equipo_id == equipo_id,
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            )
        ).first()
        if not prestamo or prestamo.trabajador.obra != current_user.obra:
            raise HTTPException(status_code=403, detail="No tiene acceso a este equipo")
    
    prestamo_activo = db.query(Prestamo).filter(
        and_(
            Prestamo.equipo_id == equipo_id,
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
        )
    ).first()
    
    return EquipoConPrestamo(
        **equipo.__dict__,
        prestamo_activo=prestamo_activo
    )


@router.post("/", response_model=EquipoResponse)
def create_equipo(
    equipo: EquipoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA]))
):
    """Crear nuevo equipo (solo Informática)"""
    try:
        # Validar campos requeridos
        if not equipo.serie or not equipo.serie.strip():
            raise HTTPException(status_code=400, detail="La serie es requerida")
        if not equipo.marca or not equipo.marca.strip():
            raise HTTPException(status_code=400, detail="La marca es requerida")
        if not equipo.modelo or not equipo.modelo.strip():
            raise HTTPException(status_code=400, detail="El modelo es requerido")
        if not equipo.tipo or not equipo.tipo.strip():
            raise HTTPException(status_code=400, detail="El tipo es requerido")
        
        # Verificar serie única
        if db.query(Equipo).filter(Equipo.serie == equipo.serie.strip().upper()).first():
            raise HTTPException(status_code=400, detail="Serie ya existe")
        
        # Preparar datos limpios (normalizar strings)
        serie_clean = equipo.serie.strip().upper()
        marca_clean = equipo.marca.strip()
        modelo_clean = equipo.modelo.strip()
        tipo_clean = equipo.tipo.strip().upper()
        so_clean = equipo.so.strip() if equipo.so else None
        observaciones_clean = equipo.observaciones.strip() if equipo.observaciones else None
        
        new_equipo = Equipo(
            serie=serie_clean,
            marca=marca_clean,
            modelo=modelo_clean,
            tipo=tipo_clean,
            estado_dispositivo=equipo.estado_dispositivo,
            ram_gb=equipo.ram_gb,
            ssd_gb=equipo.ssd_gb,
            so=so_clean,
            observaciones=observaciones_clean
        )
        db.add(new_equipo)
        db.commit()
        db.refresh(new_equipo)
        return new_equipo
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        import traceback
        error_msg = str(e)
        print(f"ERROR al crear equipo: {error_msg}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear equipo: {error_msg}"
        )


@router.put("/{equipo_id}", response_model=EquipoResponse)
def update_equipo(
    equipo_id: int,
    equipo_update: EquipoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA]))
):
    """Actualizar equipo (solo Informática)"""
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    update_data = equipo_update.dict(exclude_unset=True)
    cambios = ", ".join([f"{k}: {v}" for k, v in update_data.items()])
    
    for field, value in update_data.items():
        setattr(equipo, field, value)
    
    db.commit()
    db.refresh(equipo)
    return equipo


@router.delete("/{equipo_id}")
def delete_equipo(
    equipo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role([RolUsuario.INFORMATICA]))
):
    """Eliminar equipo (solo Informática)"""
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    db.delete(equipo)
    db.commit()
    return {"message": "Equipo eliminado"}


@router.get("/{equipo_id}/qr")
def generar_qr_equipo(
    equipo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Generar código QR descargable para un equipo"""
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    # URL que se codificará en el QR (para escanear y procesar)
    # Detectar IP local automáticamente para que funcione desde celulares en la misma red
    import os
    import socket
    
    def get_local_ip():
        """Obtener la IP local de la red"""
        try:
            # Conectar a un servidor externo para obtener la IP local
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "localhost"
    
    # Intentar obtener IP local, o usar la configurada en env
    # IMPORTANTE: El QR solo necesita el ID del equipo, la URL del frontend es solo para referencia
    # El móvil extraerá el ID y lo procesará directamente
    frontend_url_env = os.getenv("FRONTEND_URL", "")
    if frontend_url_env and "localhost" not in frontend_url_env:
        frontend_url = frontend_url_env
    else:
        # En desarrollo, usar IP local para que funcione desde celulares
        local_ip = get_local_ip()
        # Asegurar que use la IP correcta (192.168.1.113)
        if local_ip and local_ip != "localhost" and local_ip.startswith("192.168"):
            frontend_url = f"http://{local_ip}:5173"
        else:
            # Fallback a IP conocida si la detección falla
            frontend_url = "http://192.168.1.113:5173"
    
    qr_url = f"{frontend_url}/qr/equipo/{equipo_id}"
    
    # Crear QR
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)
    
    # Crear imagen
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convertir a bytes
    img_io = BytesIO()
    img.save(img_io, format='PNG')
    img_io.seek(0)
    
    return StreamingResponse(
        img_io,
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename="QR_{equipo.serie}.png"'
        }
    )


@router.get("/qr/{equipo_id}/info")
def obtener_info_equipo_qr(
    equipo_id: int,
    db: Session = Depends(get_db)
):
    """Obtener información del equipo para cuando se escanea el QR (sin autenticación para facilitar escaneo)"""
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    prestamo_activo = db.query(Prestamo).filter(
        Prestamo.equipo_id == equipo_id,
        Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
    ).first()
    
    return {
        "equipo_id": equipo.id,
        "serie": equipo.serie,
        "tipo": equipo.tipo,
        "marca": equipo.marca,
        "modelo": equipo.modelo,
        "estado": equipo.estado_dispositivo.value if hasattr(equipo.estado_dispositivo, 'value') else str(equipo.estado_dispositivo),
        "prestado": prestamo_activo is not None,
        "prestamo_id": prestamo_activo.id if prestamo_activo else None,
        "trabajador": prestamo_activo.trabajador.nombre if prestamo_activo else None
    }

