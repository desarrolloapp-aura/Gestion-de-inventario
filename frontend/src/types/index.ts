// TipoEquipo ahora es string dinámico, no un enum fijo
export type EstadoDispositivo = 'OPERATIVO' | 'MANTENCIÓN' | 'BAJA'
export type EstadoPrestamo = 'ASIGNADO' | 'DEVUELTO' | 'VENCIDO'
export type RolUsuario = 'INFORMATICA' | 'RRHH' | 'JEFE_OBRA'

export interface Equipo {
  id: number
  serie: string
  marca: string
  modelo: string
  tipo: string
  estado_dispositivo: EstadoDispositivo
  ram_gb?: number
  ssd_gb?: number
  so?: string
  observaciones?: string
}

export interface EquipoConPrestamo extends Equipo {
  prestamo_activo?: Prestamo
  ultimo_prestamo_devuelto?: Prestamo
}

export interface Trabajador {
  rut: string
  nombre: string
  obra: string
  telefono?: string
  email?: string
  activo: boolean
}

export interface Prestamo {
  id: number
  equipo_id: number
  trabajador_rut: string
  fecha_prestamo: string
  fecha_vencimiento: string
  estado_prestamo: EstadoPrestamo
  cambiado_por?: string
  fecha_devolucion?: string
  estado_entrega_bueno?: boolean
  estado_entrega_con_cargador?: boolean
  observaciones_entrega?: string
  estado_devolucion_bueno?: boolean
  estado_devolucion_con_cargador?: boolean
  observaciones_devolucion?: string
  cargador_devuelto_despues?: boolean
  equipo: Equipo
  trabajador: Trabajador
}

export interface AlertaTrabajador {
  prestamo_id: number
  equipo_serie: string
  equipo_tipo: string
  fecha_devolucion: string | null
  problemas: string[]
  observaciones?: string
  cargador_devuelto: boolean
}

export interface Alerta {
  tipo: 'VENCIDO' | 'POR_VENCER' | 'DESPIDO'
  mensaje: string
  equipo_serie?: string
  trabajador_nombre?: string
  obra?: string
  fecha_vencimiento?: string
  dias_restantes?: number
}

export interface User {
  id: number
  username: string
  email: string
  rol: RolUsuario
  obra?: string
}




