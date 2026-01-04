from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from ..database import get_db
from ..models import Equipo, Prestamo, Trabajador, EstadoPrestamo, Usuario, RolUsuario
from ..auth import get_current_user
import traceback

router = APIRouter(prefix="/api/estadisticas", tags=["estadisticas"])


@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener estadísticas del dashboard"""
    try:
        # Total de equipos
        total_equipos = db.query(func.count(Equipo.id)).filter(
            Equipo.estado_dispositivo != "BAJA"
        ).scalar() or 0
        print(f"DEBUG: total_equipos = {total_equipos}")
        
        # Equipos por estado
        equipos_operativos = db.query(func.count(Equipo.id)).filter(
            Equipo.estado_dispositivo == "OPERATIVO"
        ).scalar() or 0
        
        equipos_mantenimiento = db.query(func.count(Equipo.id)).filter(
            Equipo.estado_dispositivo == "MANTENCIÓN"
        ).scalar() or 0
        
        # Préstamos activos
        prestamos_activos = db.query(func.count(Prestamo.id)).filter(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
        ).scalar() or 0
        print(f"DEBUG: prestamos_activos = {prestamos_activos}")
        
        # Trabajadores activos
        trabajadores_activos = db.query(func.count(Trabajador.rut)).filter(
            Trabajador.activo == True
        ).scalar() or 0
        print(f"DEBUG: trabajadores_activos = {trabajadores_activos}")
        
        # Préstamos devueltos en los últimos 30 días
        fecha_limite = datetime.utcnow() - timedelta(days=30)
        prestamos_recientes = db.query(func.count(Prestamo.id)).filter(
            and_(
                Prestamo.estado_prestamo == EstadoPrestamo.DEVUELTO,
                Prestamo.fecha_devolucion.isnot(None),
                Prestamo.fecha_devolucion >= fecha_limite
            )
        ).scalar() or 0
        
        # Préstamos por día del mes actual
        ahora = datetime.utcnow()
        fecha_inicio_mes = datetime(ahora.year, ahora.month, 1)
        # Primer día del siguiente mes
        if ahora.month == 12:
            fecha_fin_mes = datetime(ahora.year + 1, 1, 1)
        else:
            fecha_fin_mes = datetime(ahora.year, ahora.month + 1, 1)
        
        # Obtener préstamos por día
        prestamos_por_dia = []
        for dia in range(1, ahora.day + 1):  # Solo hasta el día actual
            fecha_inicio_dia = datetime(ahora.year, ahora.month, dia)
            fecha_fin_dia = datetime(ahora.year, ahora.month, dia + 1) if dia < 31 else fecha_fin_mes
            
            count = db.query(func.count(Prestamo.id)).filter(
                and_(
                    Prestamo.fecha_prestamo >= fecha_inicio_dia,
                    Prestamo.fecha_prestamo < fecha_fin_dia
                )
            ).scalar() or 0
            
            prestamos_por_dia.append({
                "dia": dia,
                "cantidad": count
            })
        
        # Total del mes para compatibilidad
        count_mes_actual = sum(p["cantidad"] for p in prestamos_por_dia)
        
        prestamos_por_mes = [{
            "mes": fecha_inicio_mes.strftime("%Y-%m"),
            "cantidad": count_mes_actual,
            "por_dia": prestamos_por_dia
        }]
        
        # Equipos más prestados (top 5)
        try:
            equipos_mas_prestados = db.query(
                Equipo.serie,
                Equipo.tipo,
                func.count(Prestamo.id).label('cantidad')
            ).join(
                Prestamo, Equipo.id == Prestamo.equipo_id
            ).group_by(
                Equipo.id, Equipo.serie, Equipo.tipo
            ).order_by(
                func.count(Prestamo.id).desc()
            ).limit(5).all()
            
            equipos_top = [
                {"serie": e.serie, "tipo": e.tipo or "", "cantidad": e.cantidad}
                for e in equipos_mas_prestados
            ]
        except Exception as e:
            print(f"Error al obtener equipos más prestados: {e}")
            equipos_top = []
        
        # Alertas pendientes (vencidos, despidos y problemas pendientes de trabajadores)
        hoy = datetime.utcnow()
        prestamos_vencidos_count = db.query(func.count(Prestamo.id)).join(Trabajador).filter(
            and_(
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO,
                Prestamo.fecha_vencimiento < hoy
            )
        ).scalar() or 0
        
        trabajadores_despedidos_count = db.query(func.count(Prestamo.id)).join(Trabajador).filter(
            and_(
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO,
                Trabajador.activo == False
            )
        ).scalar() or 0
        
        # Problemas pendientes de trabajadores (equipos devueltos sin cargador o en mal estado)
        from sqlalchemy import or_
        problemas_pendientes_count = db.query(func.count(Prestamo.id)).filter(
            and_(
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
        ).scalar() or 0
        
        alertas_pendientes = prestamos_vencidos_count + trabajadores_despedidos_count + problemas_pendientes_count
        print(f"DEBUG: alertas_pendientes = {alertas_pendientes} (vencidos: {prestamos_vencidos_count}, despidos: {trabajadores_despedidos_count}, problemas: {problemas_pendientes_count})")
        
        # Datos para gráfico de torta: Dispositivos más usados durante el mes actual
        dispositivos_mas_usados = []
        try:
            # Obtener préstamos del mes actual agrupados por tipo de equipo
            prestamos_mes_por_tipo = db.query(
                Equipo.tipo,
                func.count(Prestamo.id).label('cantidad')
            ).join(
                Prestamo, Equipo.id == Prestamo.equipo_id
            ).filter(
                and_(
                    Prestamo.fecha_prestamo >= fecha_inicio_mes,
                    Prestamo.fecha_prestamo < fecha_fin_mes
                )
            ).group_by(
                Equipo.tipo
            ).order_by(
                func.count(Prestamo.id).desc()
            ).limit(6).all()  # Top 6 tipos más usados
            
            # Colores para el gráfico de torta
            colores = ["#FF6B35", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA15E"]
            
            dispositivos_mas_usados = [
                {
                    "nombre": tipo[0] or "Sin tipo",
                    "cantidad": tipo[1],
                    "color": colores[i % len(colores)]
                }
                for i, tipo in enumerate(prestamos_mes_por_tipo)
            ]
        except Exception as e:
            print(f"Error al obtener dispositivos más usados: {e}")
            dispositivos_mas_usados = []
        
        print(f"DEBUG: Retornando estadísticas: total_equipos={total_equipos}, prestamos_activos={prestamos_activos}, trabajadores_activos={trabajadores_activos}, alertas_pendientes={alertas_pendientes}")
        
        return {
            "resumen": {
                "total_equipos": total_equipos,
                "equipos_operativos": equipos_operativos,
                "equipos_mantenimiento": equipos_mantenimiento,
                "prestamos_activos": prestamos_activos,
                "trabajadores_activos": trabajadores_activos,
                "prestamos_recientes": prestamos_recientes,
                "alertas_pendientes": alertas_pendientes
            },
            "prestamos_por_mes": prestamos_por_mes,
            "equipos_mas_prestados": equipos_top,
            "dispositivos_mas_usados": dispositivos_mas_usados
        }
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"ERROR en get_dashboard_stats: {error_msg}")
        traceback.print_exc()
        # Lanzar el error para que el frontend pueda verlo
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener estadísticas: {error_msg}"
        )
