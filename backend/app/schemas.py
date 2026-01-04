from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from .models import EstadoDispositivo, EstadoPrestamo, RolUsuario


# ============ EQUIPOS ============
class EquipoBase(BaseModel):
    serie: str
    marca: str
    modelo: str
    tipo: str  # Tipo dinámico (NOTEBOOK, AIO, PC, etc.)
    estado_dispositivo: EstadoDispositivo = EstadoDispositivo.OPERATIVO
    ram_gb: Optional[int] = None
    ssd_gb: Optional[int] = None
    so: Optional[str] = None
    observaciones: Optional[str] = None


class EquipoCreate(EquipoBase):
    pass


class EquipoUpdate(BaseModel):
    marca: Optional[str] = None
    modelo: Optional[str] = None
    tipo: Optional[str] = None
    estado_dispositivo: Optional[EstadoDispositivo] = None
    ram_gb: Optional[int] = None
    ssd_gb: Optional[int] = None
    so: Optional[str] = None
    observaciones: Optional[str] = None


class EquipoResponse(EquipoBase):
    id: int
    
    class Config:
        from_attributes = True


class EquipoConPrestamo(EquipoResponse):
    prestamo_activo: Optional['PrestamoResponse'] = None
    ultimo_prestamo_devuelto: Optional['PrestamoResponse'] = None


# ============ TRABAJADORES ============
class TrabajadorBase(BaseModel):
    rut: str
    nombre: str
    obra: str
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    activo: bool = True


class TrabajadorCreate(TrabajadorBase):
    pass


class TrabajadorUpdate(BaseModel):
    nombre: Optional[str] = None
    obra: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    activo: Optional[bool] = None


class TrabajadorResponse(TrabajadorBase):
    class Config:
        from_attributes = True


# ============ PRÉSTAMOS ============
class PrestamoBase(BaseModel):
    equipo_id: int
    trabajador_rut: str
    fecha_vencimiento: datetime


class PrestamoCreate(BaseModel):
    equipo_id: int
    trabajador_rut: str
    obra: str  # Para validación
    estado_entrega_bueno: bool = True
    estado_entrega_con_cargador: bool = True
    observaciones_entrega: Optional[str] = None


class PrestamoResponse(BaseModel):
    id: int
    equipo_id: int
    trabajador_rut: str
    fecha_prestamo: datetime
    fecha_vencimiento: datetime
    estado_prestamo: EstadoPrestamo
    cambiado_por: Optional[str] = None
    fecha_devolucion: Optional[datetime] = None
    estado_entrega_bueno: Optional[bool] = None
    estado_entrega_con_cargador: Optional[bool] = None
    observaciones_entrega: Optional[str] = None
    estado_devolucion_bueno: Optional[bool] = None
    estado_devolucion_con_cargador: Optional[bool] = None
    observaciones_devolucion: Optional[str] = None
    cargador_devuelto_despues: Optional[bool] = None
    equipo: EquipoResponse
    trabajador: TrabajadorResponse
    
    class Config:
        from_attributes = True


# ============ USUARIOS / AUTH ============
class UsuarioLogin(BaseModel):
    username: str
    password: str


class UsuarioCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    rol: RolUsuario
    obra: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    rol: RolUsuario
    obra: Optional[str] = None


class UsuarioResponse(BaseModel):
    id: int
    username: str
    email: str
    rol: RolUsuario
    obra: Optional[str] = None
    
    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ============ ALERTAS ============
class AlertaResponse(BaseModel):
    tipo: str  # "VENCIDO", "DESPIDO", "FALLA"
    mensaje: str
    equipo_serie: Optional[str] = None
    trabajador_nombre: Optional[str] = None
    obra: Optional[str] = None
    fecha_vencimiento: Optional[datetime] = None
    dias_restantes: Optional[int] = None


# ============ DEVOLUCIÓN ============
class PrestamoDevolver(BaseModel):
    estado_devolucion_bueno: bool
    estado_devolucion_con_cargador: bool
    observaciones_devolucion: Optional[str] = None


# ============ REPORTE FALLA ============
class ReporteFallaCreate(BaseModel):
    equipo_id: int
    problema: str
    foto_url: Optional[str] = None


# ============ OBRAS ============
class ObraCreate(BaseModel):
    nombre: str


class ObraResponse(BaseModel):
    id: int
    nombre: str
    
    class Config:
        from_attributes = True


# Fix forward references
EquipoConPrestamo.model_rebuild()




