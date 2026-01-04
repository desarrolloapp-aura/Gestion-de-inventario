from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from .database import Base


class EstadoDispositivo(str, enum.Enum):
    OPERATIVO = "OPERATIVO"
    MANTENCIÓN = "MANTENCIÓN"
    BAJA = "BAJA"


class EstadoPrestamo(str, enum.Enum):
    ASIGNADO = "ASIGNADO"
    DEVUELTO = "DEVUELTO"
    VENCIDO = "VENCIDO"


class RolUsuario(str, enum.Enum):
    INFORMATICA = "INFORMATICA"
    RRHH = "RRHH"
    JEFE_OBRA = "JEFE_OBRA"


class Equipo(Base):
    __tablename__ = "equipos"
    
    id = Column(Integer, primary_key=True, index=True)
    serie = Column(String, unique=True, index=True, nullable=False)
    marca = Column(String, nullable=False)
    modelo = Column(String, nullable=False)
    tipo = Column(String, nullable=False)
    estado_dispositivo = Column(SQLEnum(EstadoDispositivo), default=EstadoDispositivo.OPERATIVO)
    ram_gb = Column(Integer, nullable=True)
    ssd_gb = Column(Integer, nullable=True)
    so = Column(String, nullable=True)
    observaciones = Column(Text, nullable=True)
    
    prestamos = relationship("Prestamo", back_populates="equipo", cascade="all, delete-orphan")


class Trabajador(Base):
    __tablename__ = "trabajadores"
    
    rut = Column(String, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    obra = Column(String, nullable=False)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)
    activo = Column(Boolean, default=True)
    
    prestamos = relationship("Prestamo", back_populates="trabajador")




class Prestamo(Base):
    __tablename__ = "prestamos"
    
    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    trabajador_rut = Column(String, ForeignKey("trabajadores.rut"), nullable=False)
    fecha_prestamo = Column(DateTime, default=func.now(), nullable=False)
    fecha_vencimiento = Column(DateTime, nullable=False)
    estado_prestamo = Column(SQLEnum(EstadoPrestamo), default=EstadoPrestamo.ASIGNADO)
    cambiado_por = Column(Text, nullable=True)
    
    # Campos de estado al entregar
    estado_entrega_bueno = Column(Boolean, default=True)
    estado_entrega_con_cargador = Column(Boolean, default=True)
    observaciones_entrega = Column(Text, nullable=True)
    
    # Campos de estado al devolver
    fecha_devolucion = Column(DateTime, nullable=True)
    estado_devolucion_bueno = Column(Boolean, nullable=True)
    estado_devolucion_con_cargador = Column(Boolean, nullable=True)
    observaciones_devolucion = Column(Text, nullable=True)
    cargador_devuelto_despues = Column(Boolean, default=False)
    
    equipo = relationship("Equipo", back_populates="prestamos")
    trabajador = relationship("Trabajador", back_populates="prestamos")


class Obra(Base):
    __tablename__ = "obras"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)


class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    rol = Column(SQLEnum(RolUsuario), nullable=False)
    obra = Column(String)  # Solo para JEFE_OBRA
    activo = Column(Boolean, default=True)


class AuditoriaLog(Base):
    __tablename__ = "auditoria_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario = Column(String, nullable=False)
    accion = Column(String, nullable=False)  # CREAR, ACTUALIZAR, ELIMINAR, PRESTAR, DEVOLVER
    entidad = Column(String, nullable=False)  # EQUIPO, TRABAJADOR, PRESTAMO, etc.
    entidad_id = Column(String, nullable=True)  # ID de la entidad afectada
    detalles = Column(Text, nullable=True)  # JSON con detalles adicionales
    fecha = Column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
