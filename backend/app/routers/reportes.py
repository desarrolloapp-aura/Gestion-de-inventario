from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from ..database import get_db
from ..models import Equipo, Usuario, RolUsuario
from ..schemas import ReporteFallaCreate
from ..auth import get_current_user
import base64
from typing import Optional

router = APIRouter(prefix="/api/reportes", tags=["reportes"])


@router.post("/falla")
def reportar_falla(
    equipo_id: int,
    problema: str,
    foto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Reportar falla de equipo (JEFE OBRA o Informática)"""
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    # Verificar permisos JEFE OBRA
    if current_user.rol == RolUsuario.JEFE_OBRA:
        # Verificar que el equipo esté prestado a su obra
        from ..models import Prestamo, Trabajador, EstadoPrestamo
        prestamo = db.query(Prestamo).join(Trabajador).filter(
            and_(
                Prestamo.equipo_id == equipo_id,
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO,
                Trabajador.obra == current_user.obra
            )
        ).first()
        if not prestamo:
            raise HTTPException(status_code=403, detail="No tiene acceso a este equipo")
    
    # Actualizar equipo con falla
    if not equipo.observaciones:
        equipo.observaciones = ""
    equipo.observaciones += f"\n[FALLA REPORTADA {datetime.utcnow().isoformat()}] {problema}"
    if foto:
        # Si hay foto, incluir referencia en observaciones
        foto_data = foto.file.read()
        foto_base64 = base64.b64encode(foto_data).decode('utf-8')
        equipo.observaciones += f"\n[FOTO: {foto.filename}]"
    equipo.estado_dispositivo = "MANTENCIÓN"
    
    db.commit()
    db.refresh(equipo)
    
    return {
        "message": "Falla reportada",
        "equipo_id": equipo_id,
        "problema": problema
    }

