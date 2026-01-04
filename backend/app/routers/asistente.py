from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Dict, Tuple, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import Equipo, Prestamo, Trabajador, EstadoPrestamo, Usuario
from ..auth import get_current_user
from ..config import settings
from ..motor_ia import motor_ia
import re
import os
import json
import pickle
from collections import defaultdict, Counter
from difflib import SequenceMatcher
from datetime import datetime
import hashlib

router = APIRouter(prefix="/api/asistente", tags=["asistente"])


class MensajeHistorial(BaseModel):
    tipo: str  # "usuario" o "asistente"
    texto: str

class MensajeRequest(BaseModel):
    mensaje: str
    historial: List[MensajeHistorial] = []
    retroalimentacion: Optional[bool] = None  # True si la respuesta fue útil, False si no  # Historial de conversación


@router.post("/chat")
def chat_asistente(
    request: MensajeRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Procesa mensajes del asistente virtual con motor de IA propio y memoria de conversación"""
    
    mensaje = request.mensaje.strip()
    if not mensaje:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")
    
    # Procesar retroalimentación si se proporciona
    if request.retroalimentacion is not None:
        motor_ia.retroalimentacion(mensaje, request.retroalimentacion)
        motor_ia.guardar_conocimiento()
    
    try:
        # Usar el motor de IA propio
        respuesta = procesar_con_motor_ia(mensaje, db, current_user, request.historial or [])
        
        return {
            "respuesta": respuesta,
            "sugerencias": obtener_sugerencias(mensaje.lower())
        }
    except Exception as e:
        # Fallback a procesamiento básico si falla
        import traceback
        print(f"Error en motor IA: {e}")
        traceback.print_exc()
        try:
            respuesta = procesar_mensaje_con_historial(mensaje.lower(), db, current_user, request.historial or [])
            return {
                "respuesta": respuesta,
                "sugerencias": obtener_sugerencias(mensaje.lower())
            }
        except Exception as e2:
            import traceback
            print(f"Error en procesamiento básico: {e2}")
            traceback.print_exc()
            # Último fallback
            return {
                "respuesta": "Lo siento, hubo un error al procesar tu consulta. Por favor intenta de nuevo.",
                "sugerencias": obtener_sugerencias(mensaje.lower())
            }


def procesar_con_ia(mensaje: str, db: Session, user: Usuario, historial: List[MensajeHistorial] = None) -> str:
    """Procesa el mensaje usando un motor de IA real con Gemini y memoria de conversación"""
    
    if historial is None:
        historial = []
    
    # Obtener contexto del sistema
    contexto = obtener_contexto_sistema(db)
    
    # Obtener valores clave para el prompt (ya están en el contexto, pero los extraemos para claridad)
    total_equipos = db.query(func.count(Equipo.id)).filter(
        Equipo.estado_dispositivo != "BAJA"
    ).scalar() or 0
    
    equipos_disponibles_count = len(db.query(Equipo).filter(
        Equipo.estado_dispositivo == "OPERATIVO",
        ~Equipo.id.in_(
            db.query(Prestamo.equipo_id).filter(
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            )
        )
    ).all())
    
    equipos_asignados_count = db.query(func.count(Prestamo.id)).filter(
        Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
    ).scalar() or 0
    
    # Intentar usar Gemini si está configurado (TEMPORALMENTE DESHABILITADO - modelos no disponibles)
    gemini_api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    
    # Deshabilitar Gemini temporalmente hasta que se resuelva el problema de modelos
    usar_gemini = False
    
    if gemini_api_key and usar_gemini:
        try:
            import google.generativeai as genai
            
            # Configurar Gemini
            genai.configure(api_key=gemini_api_key)
            
            # Crear el modelo (usando gemini-1.5-flash que es compatible y rápido)
            try:
                model = genai.GenerativeModel('gemini-1.5-flash')
            except Exception as e:
                print(f"Error con gemini-1.5-flash, intentando gemini-pro: {e}")
                try:
                    model = genai.GenerativeModel('gemini-pro')
                except Exception as e2:
                    print(f"Error con gemini-pro también: {e2}")
                    raise
            
            # Construir el prompt del sistema con contexto estructurado
            system_prompt = f"""Eres un asistente virtual de gestión de equipos. Responde SOLO con la información que se te proporciona.

INFORMACIÓN DEL SISTEMA:
{contexto}

REGLAS DE INTERPRETACIÓN (MUY IMPORTANTE):

Si el usuario pregunta sobre "PRESTADOS", "ASIGNADOS", "EN PRÉSTAMO", "prestados", "asignados":
→ Busca la sección "=== DETALLES DE EQUIPOS PRESTADOS/ASIGNADOS ==="
→ Responde con el número {equipos_asignados_count} y lista TODOS los equipos de esa sección
→ NO uses la sección de "DISPONIBLES"

Si el usuario pregunta sobre "DISPONIBLES", "LIBRES", "disponibles", "libres":
→ Busca la sección "=== DETALLES DE EQUIPOS DISPONIBLES ==="
→ Responde con el número {equipos_disponibles_count} y lista los equipos de esa sección
→ NO uses la sección de "PRESTADOS"

Si el usuario pregunta sobre "TOTAL", "en total", "todos los equipos":
→ Busca la sección "=== LISTA COMPLETA DE TODOS LOS EQUIPOS DEL SISTEMA ==="
→ Responde con el número {total_equipos} y lista TODOS los equipos de esa sección

EJEMPLOS DE INTERPRETACIÓN:
- "equipos prestados?" → Mostrar sección "DETALLES DE EQUIPOS PRESTADOS/ASIGNADOS"
- "total de equipos prestados?" → Mostrar sección "DETALLES DE EQUIPOS PRESTADOS/ASIGNADOS"
- "equipos disponibles?" → Mostrar sección "DETALLES DE EQUIPOS DISPONIBLES"
- "equipos en total?" → Mostrar sección "LISTA COMPLETA DE TODOS LOS EQUIPOS DEL SISTEMA"

IMPORTANTE: 
- "PRESTADOS" ≠ "DISPONIBLES" - son cosas DIFERENTES
- Si pregunta "prestados", NUNCA muestres "disponibles"
- Si pregunta "disponibles", NUNCA muestres "prestados"
- Lee la pregunta del usuario y busca la sección CORRECTA en el contexto

HISTORIAL:"""
            
            # Construir historial de conversación
            historial_texto = ""
            if historial and len(historial) > 0:
                for msg in historial[-10:]:  # Últimos 10 mensajes
                    try:
                        tipo = "Usuario" if msg.tipo == "usuario" else "Asistente"
                        historial_texto += f"\n{tipo}: {msg.texto}"
                    except Exception as e:
                        print(f"Error procesando mensaje del historial: {e}")
                        continue
            
            # Construir el prompt completo
            prompt_completo = system_prompt + historial_texto + f"\n\nUsuario: {mensaje}\nAsistente:"
            
            # DEBUG: Imprimir el prompt para verificar
            print(f"[DEBUG ASISTENTE] Mensaje del usuario: {mensaje}")
            print(f"[DEBUG ASISTENTE] Prompt length: {len(prompt_completo)}")
            if "prestados" in mensaje.lower() or "asignados" in mensaje.lower():
                print(f"[DEBUG ASISTENTE] Usuario pregunta por PRESTADOS/ASIGNADOS")
                print(f"[DEBUG ASISTENTE] Contexto contiene 'PRESTADOS': {'PRESTADOS' in contexto}")
            
            # Generar respuesta con configuración optimizada
            response = model.generate_content(
                prompt_completo,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=1500,  # Más tokens para respuestas completas
                    temperature=0.1,  # Muy baja temperatura para seguir instrucciones exactas
                    top_p=0.8,
                    top_k=20,
                )
            )
            
            respuesta_final = response.text.strip()
            print(f"[DEBUG ASISTENTE] Respuesta de Gemini: {respuesta_final[:200]}...")
            return respuesta_final
        except ImportError:
            # Si no está instalado google-generativeai, usar procesamiento básico mejorado
            print("google-generativeai no está instalado, usando procesamiento básico")
            return procesar_mensaje_con_historial(mensaje.lower(), db, user, historial)
        except Exception as e:
            print(f"Error con Gemini: {e}")
            import traceback
            traceback.print_exc()
            # Fallback a procesamiento básico mejorado
            return procesar_mensaje_con_historial(mensaje.lower(), db, user, historial)
    else:
        # Sin API key, usar procesamiento básico mejorado con más inteligencia
        return procesar_mensaje_con_historial(mensaje.lower(), db, user, historial)


def obtener_contexto_sistema(db: Session) -> str:
    """Obtiene el contexto actual del sistema para la IA"""
    try:
        total_equipos = db.query(func.count(Equipo.id)).filter(
            Equipo.estado_dispositivo != "BAJA"
        ).scalar() or 0
        
        # Obtener TODOS los equipos disponibles con detalles
        equipos_disponibles_lista = db.query(Equipo).filter(
            Equipo.estado_dispositivo == "OPERATIVO",
            ~Equipo.id.in_(
                db.query(Prestamo.equipo_id).filter(
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                )
            )
        ).all()
        
        equipos_disponibles_count = len(equipos_disponibles_lista)
        
        # Obtener equipos asignados (en préstamo)
        equipos_asignados_count = db.query(func.count(Prestamo.id)).filter(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
        ).scalar() or 0
        
        prestamos_activos = equipos_asignados_count
        
        trabajadores_activos = db.query(func.count(Trabajador.rut)).filter(
            Trabajador.activo == True
        ).scalar() or 0
        
        # Obtener trabajadores con equipos asignados
        trabajadores_con_equipos = db.query(Trabajador).filter(
            Trabajador.activo == True,
            Trabajador.rut.in_(
                db.query(Prestamo.trabajador_rut).filter(
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                ).distinct()
            )
        ).all()
        
        # Obtener trabajadores sin equipos asignados
        trabajadores_sin_equipos = db.query(Trabajador).filter(
            Trabajador.activo == True,
            ~Trabajador.rut.in_(
                db.query(Prestamo.trabajador_rut).filter(
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                ).distinct()
            )
        ).all()
        
        # Construir lista de trabajadores con equipos
        trabajadores_con_equipos_lista = []
        for t in trabajadores_con_equipos:
            prestamos = db.query(Prestamo).filter(
                Prestamo.trabajador_rut == t.rut,
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            ).all()
            equipos_asignados = [p.equipo.serie for p in prestamos]
            trabajadores_con_equipos_lista.append({
                'nombre': t.nombre,
                'rut': t.rut,
                'obra': t.obra,
                'equipos': equipos_asignados,
                'cantidad': len(equipos_asignados)
            })
        
        # Construir lista de trabajadores sin equipos
        trabajadores_sin_equipos_lista = [
            {'nombre': t.nombre, 'rut': t.rut, 'obra': t.obra}
            for t in trabajadores_sin_equipos
        ]
        
        # Agrupar equipos por tipo
        equipos_por_tipo = {}
        for eq in equipos_disponibles_lista:
            tipo = eq.tipo or "Sin tipo"
            if tipo not in equipos_por_tipo:
                equipos_por_tipo[tipo] = []
            equipos_por_tipo[tipo].append(eq)
        
        # Construir lista detallada de equipos disponibles
        equipos_detalle = []
        for tipo, equipos in equipos_por_tipo.items():
            equipos_detalle.append(f"\n{tipo} ({len(equipos)} disponibles):")
            for eq in equipos:
                marca_modelo = f"{eq.marca} {eq.modelo}".strip() if eq.marca or eq.modelo else "Sin especificar"
                equipos_detalle.append(f"  - Serie: {eq.serie} | {marca_modelo}")
        
        equipos_str = "\n".join(equipos_detalle) if equipos_detalle else "No hay equipos disponibles en este momento"
        
        # Obtener TODOS los equipos del sistema (para cuando se pregunta por el total)
        todos_los_equipos = db.query(Equipo).filter(
            Equipo.estado_dispositivo != "BAJA"
        ).all()
        
        # Agrupar todos los equipos por tipo
        todos_equipos_por_tipo = {}
        for eq in todos_los_equipos:
            tipo = eq.tipo or "Sin tipo"
            if tipo not in todos_equipos_por_tipo:
                todos_equipos_por_tipo[tipo] = []
            todos_equipos_por_tipo[tipo].append(eq)
        
        # Construir lista detallada de TODOS los equipos
        todos_equipos_detalle = []
        for tipo, equipos in todos_equipos_por_tipo.items():
            todos_equipos_detalle.append(f"\n{tipo} ({len(equipos)} en total):")
            for eq in equipos:
                # Verificar si está asignado
                esta_asignado = db.query(Prestamo).filter(
                    Prestamo.equipo_id == eq.id,
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                ).first() is not None
                
                estado_texto = "ASIGNADO" if esta_asignado else "DISPONIBLE"
                marca_modelo = f"{eq.marca} {eq.modelo}".strip() if eq.marca or eq.modelo else "Sin especificar"
                todos_equipos_detalle.append(f"  - Serie: {eq.serie} | {marca_modelo} | Estado: {estado_texto}")
        
        todos_equipos_str = "\n".join(todos_equipos_detalle) if todos_equipos_detalle else "No hay equipos en el sistema"
        
        # Obtener TODOS los equipos PRESTADOS/ASIGNADOS con detalles
        prestamos_activos_lista = db.query(Prestamo).filter(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
        ).all()
        
        # Agrupar equipos prestados por tipo
        equipos_prestados_por_tipo = {}
        for prestamo in prestamos_activos_lista:
            eq = prestamo.equipo
            tipo = eq.tipo or "Sin tipo"
            if tipo not in equipos_prestados_por_tipo:
                equipos_prestados_por_tipo[tipo] = []
            equipos_prestados_por_tipo[tipo].append({
                'equipo': eq,
                'prestamo': prestamo,
                'trabajador': prestamo.trabajador
            })
        
        # Construir lista detallada de equipos PRESTADOS
        equipos_prestados_detalle = []
        for tipo, items in equipos_prestados_por_tipo.items():
            equipos_prestados_detalle.append(f"\n{tipo} ({len(items)} prestados):")
            for item in items:
                eq = item['equipo']
                trabajador = item['trabajador']
                marca_modelo = f"{eq.marca} {eq.modelo}".strip() if eq.marca or eq.modelo else "Sin especificar"
                equipos_prestados_detalle.append(f"  - Serie: {eq.serie} | {marca_modelo} | Prestado a: {trabajador.nombre} (Obra: {trabajador.obra})")
        
        equipos_prestados_str = "\n".join(equipos_prestados_detalle) if equipos_prestados_detalle else "No hay equipos prestados en este momento"
        
        # DEBUG: Imprimir información para verificar
        print(f"[DEBUG ASISTENTE] Equipos prestados encontrados: {equipos_asignados_count}")
        print(f"[DEBUG ASISTENTE] Lista de equipos prestados: {equipos_prestados_str[:200]}...")
        
        # Construir texto de trabajadores con equipos
        trabajadores_con_equipos_texto = ""
        if trabajadores_con_equipos_lista:
            trabajadores_con_equipos_texto = "\nTRABAJADORES CON EQUIPOS ASIGNADOS:\n"
            for t in trabajadores_con_equipos_lista:
                equipos_str = ", ".join(t['equipos'])
                trabajadores_con_equipos_texto += f"- {t['nombre']} (RUT: {t['rut']}) - Obra: {t['obra']} - {t['cantidad']} equipo(s): {equipos_str}\n"
        else:
            trabajadores_con_equipos_texto = "\nTRABAJADORES CON EQUIPOS ASIGNADOS: Ninguno\n"
        
        # Construir texto de trabajadores sin equipos
        trabajadores_sin_equipos_texto = ""
        if trabajadores_sin_equipos_lista:
            trabajadores_sin_equipos_texto = "\nTRABAJADORES SIN EQUIPOS ASIGNADOS:\n"
            for t in trabajadores_sin_equipos_lista:
                trabajadores_sin_equipos_texto += f"- {t['nombre']} (RUT: {t['rut']}) - Obra: {t['obra']}\n"
        else:
            trabajadores_sin_equipos_texto = "\nTRABAJADORES SIN EQUIPOS ASIGNADOS: Ninguno\n"
        
        contexto = f"""=== ESTADÍSTICAS DEL SISTEMA ===

EQUIPOS:
- Total de equipos en el sistema: {total_equipos} (incluye disponibles y asignados)
- Equipos disponibles (libres para préstamo): {equipos_disponibles_count}
- Equipos asignados (en préstamo actualmente): {equipos_asignados_count}

PRÉSTAMOS:
- Préstamos activos: {prestamos_activos}

TRABAJADORES:
- Total de trabajadores activos: {trabajadores_activos}
- Trabajadores con equipos asignados: {len(trabajadores_con_equipos_lista)}
- Trabajadores sin equipos asignados: {len(trabajadores_sin_equipos_lista)}

=== LISTA COMPLETA DE TODOS LOS EQUIPOS DEL SISTEMA ({total_equipos} equipos) ===
{todos_equipos_str}

=== DETALLES DE EQUIPOS DISPONIBLES ({equipos_disponibles_count} equipos) ===
{equipos_str}

=== DETALLES DE EQUIPOS PRESTADOS/ASIGNADOS ({equipos_asignados_count} equipos) ===
{equipos_prestados_str}

=== TRABAJADORES CON EQUIPOS ASIGNADOS ===
{trabajadores_con_equipos_texto}

=== TRABAJADORES SIN EQUIPOS ASIGNADOS ===
{trabajadores_sin_equipos_texto}

NOTAS IMPORTANTES:
- Cuando el usuario pregunta "¿Cuántos equipos hay en total?" o "equipos en total":
  → DEBES responder con el número {total_equipos} y listar TODOS los equipos de la sección "LISTA COMPLETA DE TODOS LOS EQUIPOS DEL SISTEMA"

- Cuando el usuario pregunta "¿Qué equipos están disponibles?" o "equipos disponibles" o "equipos libres":
  → DEBES responder con el número {equipos_disponibles_count} y listar solo los equipos de la sección "DETALLES DE EQUIPOS DISPONIBLES"

- Cuando el usuario pregunta "¿Cuántos equipos están prestados?" o "equipos prestados" o "equipos asignados" o "equipos en préstamo" o "total de equipos prestados":
  → DEBES responder con el número {equipos_asignados_count} y listar TODOS los equipos de la sección "DETALLES DE EQUIPOS PRESTADOS/ASIGNADOS"
  → "PRESTADOS", "ASIGNADOS", "EN PRÉSTAMO" significan lo mismo: equipos que están siendo usados por trabajadores

- "Total de equipos" = {total_equipos} (todos los equipos del sistema)
- "Equipos disponibles" = {equipos_disponibles_count} (solo los que están libres)
- "Equipos prestados/asignados" = {equipos_asignados_count} (los que están en préstamo)
"""
        return contexto
    except Exception as e:
        print(f"Error obteniendo contexto: {e}")
        return "Sistema de gestión de equipos tecnológicos."


def procesar_mensaje_con_historial(mensaje: str, db: Session, user: Usuario, historial: List[MensajeHistorial] = None) -> str:
    """Procesa mensaje con historial de conversación"""
    
    if historial is None:
        historial = []
    
    # Extraer equipos mencionados en el historial
    equipos_mencionados = []
    if historial:
        for msg in historial:
            # Buscar series de equipos en mensajes anteriores
            series_encontradas = re.findall(r'[A-Z0-9-]{3,}', msg.texto.upper())
            for serie in series_encontradas:
                equipo = db.query(Equipo).filter(Equipo.serie.ilike(f"%{serie}%")).first()
                if equipo and equipo not in equipos_mencionados:
                    equipos_mencionados.append(equipo)
    
    # PRIORIDAD: Si pregunta "quien tiene" o "trabajador tiene", NO buscar "serie"
    # Esto debe tener prioridad sobre la detección de "serie"
    mensaje_lower = mensaje.lower()
    es_pregunta_quien_tiene = any(palabra in mensaje_lower for palabra in [
        "quien tiene", "quién tiene", "que trabajador tiene", "qué trabajador tiene",
        "a quien se le asigno", "a quién se le asignó", "a quien se le asigno",
        "quien tiene el", "quién tiene el", "trabajador tiene el", "trabajador tiene la"
    ])
    
    # Si NO es pregunta sobre "quien tiene", entonces puede ser sobre "serie"
    if not es_pregunta_quien_tiene:
        if any(palabra in mensaje.lower() for palabra in ["su serie", "cuál es su serie", "cual es su serie", "la serie", "el serie", "cuales es su serie", "cual es la serie"]):
            if equipos_mencionados:
                equipo = equipos_mencionados[-1]  # El último mencionado
                return f"La serie del equipo {equipo.tipo} {equipo.marca} {equipo.modelo} es: **{equipo.serie}**"
            else:
                # Buscar en el mensaje actual o en el historial reciente
                # Si hay un equipo mencionado en el historial, usarlo
                equipos_disponibles = db.query(Equipo).filter(
                    Equipo.estado_dispositivo == "OPERATIVO",
                    ~Equipo.id.in_(
                        db.query(Prestamo.equipo_id).filter(
                            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                        )
                    )
                ).all()
                if len(equipos_disponibles) == 1:
                    # Si solo hay un equipo disponible, probablemente se refiere a ese
                    return f"La serie del equipo {equipos_disponibles[0].tipo} {equipos_disponibles[0].marca} {equipos_disponibles[0].modelo} es: **{equipos_disponibles[0].serie}**"
    
    return procesar_mensaje_mejorado(mensaje, db, user)


def procesar_mensaje_mejorado(mensaje: str, db: Session, user: Usuario) -> str:
    """Procesamiento mejorado sin IA externa - con más inteligencia y contexto"""
    mensaje_lower = mensaje.lower().strip()
    
    print(f"DEBUG procesar_mensaje_mejorado: mensaje='{mensaje}', mensaje_lower='{mensaje_lower}'")
    
    # Detección de preguntas sobre quién tiene un equipo específico (MEJORADA)
    # Patrones: "quien tiene", "que trabajador tiene", "a quien se le asigno", etc.
    patrones_quien_tiene = [
        r'quien\s+tiene',
        r'quién\s+tiene',
        r'que\s+trabajador\s+tiene',
        r'qué\s+trabajador\s+tiene',
        r'a\s+quien\s+se\s+le\s+asign',
        r'a\s+quién\s+se\s+le\s+asign',
        r'quien\s+tiene\s+el',
        r'quién\s+tiene\s+el',
        r'quien\s+tiene\s+la',
        r'quién\s+tiene\s+la',
        r'trabajador\s+tiene\s+el',
        r'trabajador\s+tiene\s+la'
    ]
    
    pregunta_quien_tiene = False
    for patron in patrones_quien_tiene:
        if re.search(patron, mensaje_lower):
            pregunta_quien_tiene = True
            break
    
    if pregunta_quien_tiene:
        print(f"DEBUG: Detectada pregunta sobre quién tiene un equipo")
        # Buscar serie en el mensaje - múltiples patrones
        series_encontradas = []
        
        # Patrón 1: "serie X" o "con serie X"
        serie_match1 = re.search(r'(?:serie|con\s+serie)\s+([A-Z0-9-]+)', mensaje.upper())
        if serie_match1:
            series_encontradas.append(serie_match1.group(1))
        
        # Patrón 2: Cualquier secuencia de letras/números de 4+ caracteres (probablemente una serie)
        series_match2 = re.findall(r'[A-Z0-9]{4,}', mensaje.upper())
        for s in series_match2:
            # Filtrar palabras comunes que no son series
            if s not in ['NOTEBOOK', 'LAPTOP', 'IPHONE', 'TABLET', 'SERIE', 'TRABAJADOR', 'EQUIPO']:
                series_encontradas.append(s)
        
        print(f"DEBUG: Series encontradas: {series_encontradas}")
        
        if series_encontradas:
            for serie in series_encontradas:
                # Limpiar la serie
                serie_limpia = serie.replace('-', '').replace(' ', '').strip()
                if len(serie_limpia) < 4:
                    continue
                    
                print(f"DEBUG: Buscando equipo con serie: {serie_limpia}")
                
                # Buscar por serie (con y sin guiones)
                equipo = db.query(Equipo).filter(Equipo.serie.ilike(f"%{serie_limpia}%")).first()
                if not equipo:
                    # Buscar sin guiones
                    equipo = db.query(Equipo).filter(
                        func.replace(Equipo.serie, '-', '').ilike(f"%{serie_limpia}%")
                    ).first()
                
                if equipo:
                    print(f"DEBUG: Equipo encontrado: {equipo.serie}")
                    prestamo_activo = db.query(Prestamo).filter(
                        Prestamo.equipo_id == equipo.id,
                        Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                    ).first()
                    
                    if prestamo_activo:
                        return f"El equipo {equipo.tipo} con serie **{equipo.serie}** ({equipo.marca} {equipo.modelo}) está prestado a:\n\n• **{prestamo_activo.trabajador.nombre}**\n• RUT: {prestamo_activo.trabajador.rut}\n• Obra: {prestamo_activo.trabajador.obra}"
                    else:
                        return f"El equipo {equipo.tipo} con serie **{equipo.serie}** ({equipo.marca} {equipo.modelo}) está **disponible** y no está asignado a ningún trabajador."
        
        # Si no encontró serie pero menciona un tipo, buscar todos los de ese tipo prestados
        tipos_equipos = ["notebook", "laptop", "iphone", "tablet", "pc", "computador"]
        tipo_encontrado = None
        for tipo in tipos_equipos:
            if tipo in mensaje_lower:
                tipo_encontrado = tipo.upper()
                break
        
        if tipo_encontrado:
            equipos_tipo = db.query(Equipo).filter(
                Equipo.tipo.ilike(f"%{tipo_encontrado}%")
            ).all()
            
            prestados = []
            for eq in equipos_tipo:
                prestamo = db.query(Prestamo).filter(
                    Prestamo.equipo_id == eq.id,
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                ).first()
                if prestamo:
                    prestados.append({'equipo': eq, 'prestamo': prestamo})
            
            if prestados:
                respuesta = f"Equipos {tipo_encontrado} prestados:\n\n"
                for item in prestados:
                    eq = item['equipo']
                    p = item['prestamo']
                    respuesta += f"• Serie: **{eq.serie}** - Prestado a: {p.trabajador.nombre} (Obra: {p.trabajador.obra})\n"
                return respuesta.strip()
            else:
                return f"No hay equipos {tipo_encontrado} prestados en este momento."
    
    # Detección de equipos PRESTADOS primero (antes de disponibles)
    if any(palabra in mensaje_lower for palabra in [
        "equipos prestados", "equipos asignados", "equipos en préstamo", "equipos ocupados",
        "prestados", "asignados", "en préstamo", "ocupados", "total de equipos prestados",
        "cuántos equipos prestados", "cuantos equipos prestados", "equipos que estan ocupados",
        "equipos que están ocupados", "equipos que estan prestados", "equipos que están prestados"
    ]):
        print(f"DEBUG: Detectada pregunta sobre equipos PRESTADOS")
        prestamos_activos = db.query(Prestamo).filter(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
        ).all()
        
        if not prestamos_activos:
            return "No hay equipos prestados en este momento."
        
        # Agrupar por tipo
        tipos = {}
        for p in prestamos_activos:
            eq = p.equipo
            tipo = eq.tipo or "Sin tipo"
            if tipo not in tipos:
                tipos[tipo] = []
            tipos[tipo].append({'equipo': eq, 'trabajador': p.trabajador})
        
        respuesta = f"Hay {len(prestamos_activos)} equipos prestados:\n\n"
        for tipo, items in tipos.items():
            respuesta += f"📦 {tipo} ({len(items)} prestados):\n"
            for item in items:
                eq = item['equipo']
                trabajador = item['trabajador']
                marca_modelo = f"{eq.marca} {eq.modelo}".strip() if eq.marca or eq.modelo else "Sin especificar"
                respuesta += f"   • Serie: {eq.serie} - {marca_modelo} | Prestado a: {trabajador.nombre} (Obra: {trabajador.obra})\n"
            respuesta += "\n"
        
        return respuesta.strip()
    
    # Detección mejorada de equipos disponibles - más flexible
    palabras_equipos = [
        "equipos disponibles", "equipos libres", "qué equipos hay disponibles", 
        "que equipos hay disponibles", "disponibles", "libres", "hay equipos disponibles",
        "qué hay disponible", "que hay disponible", "listar equipos disponibles", "mostrar equipos disponibles",
        "equipos que hay disponibles", "equipos disponibles ahora"
    ]
    
    if any(palabra in mensaje_lower for palabra in palabras_equipos):
        print(f"DEBUG: Detectada pregunta sobre equipos disponibles")
        equipos_disponibles = db.query(Equipo).filter(
            Equipo.estado_dispositivo == "OPERATIVO",
            ~Equipo.id.in_(
                db.query(Prestamo.equipo_id).filter(
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                )
            )
        ).all()
        
        if not equipos_disponibles:
            return "No hay equipos disponibles en este momento. Todos los equipos operativos están actualmente en préstamo."
        
        # Agrupar por tipo
        tipos = {}
        for eq in equipos_disponibles:
            tipo = eq.tipo or "Sin tipo"
            if tipo not in tipos:
                tipos[tipo] = []
            tipos[tipo].append(eq)
        
        # Construir respuesta detallada
        respuesta = f"Hay {len(equipos_disponibles)} equipos disponibles:\n\n"
        for tipo, equipos_lista in tipos.items():
            respuesta += f"📦 {tipo} ({len(equipos_lista)} disponibles):\n"
            for eq in equipos_lista:
                marca_modelo = f"{eq.marca} {eq.modelo}".strip() if eq.marca or eq.modelo else "Sin especificar"
                respuesta += f"   • Serie: {eq.serie} - {marca_modelo}\n"
            respuesta += "\n"
        
        return respuesta.strip()
    
    # Detección de trabajadores CON equipos asignados
    if any(palabra in mensaje_lower for palabra in [
        "trabajadores con equipos asignados", "trabajadores con equipos", 
        "trabajadores que tienen equipos", "quienes tienen equipos", "quienes tienen equipos asignados",
        "trabajadores asignados", "trabajadores con dispositivos", "trabajadores con dispositivos asignados"
    ]):
        print(f"DEBUG: Detectada pregunta sobre trabajadores CON equipos asignados")
        trabajadores_con_equipos = db.query(Trabajador).filter(
            Trabajador.activo == True,
            Trabajador.rut.in_(
                db.query(Prestamo.trabajador_rut).filter(
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                ).distinct()
            )
        ).all()
        
        if not trabajadores_con_equipos:
            return "No hay trabajadores con equipos asignados en este momento."
        
        respuesta = f"Hay {len(trabajadores_con_equipos)} trabajadores con equipos asignados:\n\n"
        for t in trabajadores_con_equipos:
            prestamos = db.query(Prestamo).filter(
                Prestamo.trabajador_rut == t.rut,
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            ).all()
            equipos_series = [p.equipo.serie for p in prestamos]
            equipos_str = ", ".join(equipos_series)
            respuesta += f"• {t.nombre} (RUT: {t.rut}) - Obra: {t.obra}\n"
            respuesta += f"  Equipos asignados ({len(equipos_series)}): {equipos_str}\n\n"
        
        return respuesta.strip()
    
    # Detección de trabajadores SIN equipos asignados
    if any(palabra in mensaje_lower for palabra in [
        "trabajadores sin equipos asignados", "trabajadores sin equipos",
        "trabajadores que no tienen equipos", "quienes no tienen equipos", "quienes no tienen equipos asignados",
        "trabajadores sin dispositivos", "trabajadores sin dispositivos asignados", "trabajadores libres"
    ]):
        print(f"DEBUG: Detectada pregunta sobre trabajadores SIN equipos asignados")
        trabajadores_sin_equipos = db.query(Trabajador).filter(
            Trabajador.activo == True,
            ~Trabajador.rut.in_(
                db.query(Prestamo.trabajador_rut).filter(
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                ).distinct()
            )
        ).all()
        
        if not trabajadores_sin_equipos:
            return "Todos los trabajadores activos tienen equipos asignados."
        
        respuesta = f"Hay {len(trabajadores_sin_equipos)} trabajadores sin equipos asignados:\n\n"
        for t in trabajadores_sin_equipos:
            respuesta += f"• {t.nombre} (RUT: {t.rut}) - Obra: {t.obra}\n"
        
        return respuesta.strip()
    
    # Detección de trabajadores activos (general)
    if any(palabra in mensaje_lower for palabra in [
        "trabajadores activos", "ver trabajadores", "listar trabajadores",
        "trabajadores", "mostrar trabajadores", "cuántos trabajadores", "cuantos trabajadores"
    ]):
        print(f"DEBUG: Detectada pregunta sobre trabajadores activos")
        trabajadores_activos = db.query(Trabajador).filter(
            Trabajador.activo == True
        ).all()
        
        print(f"DEBUG: Encontrados {len(trabajadores_activos)} trabajadores activos")
        
        if not trabajadores_activos:
            return "No hay trabajadores activos en este momento."
        
        respuesta = f"Hay {len(trabajadores_activos)} trabajadores activos:\n\n"
        for t in trabajadores_activos[:20]:  # Limitar a 20 para no saturar
            prestamos_count = db.query(Prestamo).filter(
                Prestamo.trabajador_rut == t.rut,
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            ).count()
            respuesta += f"• {t.nombre} (RUT: {t.rut}) - Obra: {t.obra}"
            if prestamos_count > 0:
                respuesta += f" - {prestamos_count} equipo(s) asignado(s)"
            respuesta += "\n"
        
        if len(trabajadores_activos) > 20:
            respuesta += f"\n... y {len(trabajadores_activos) - 20} trabajadores más."
        
        print(f"DEBUG: Respuesta trabajadores generada")
        return respuesta.strip()
    
    # Detección de préstamos activos (solo cantidad, no lista)
    if any(palabra in mensaje_lower for palabra in [
        "cuántos préstamos activos", "cuantos prestamos activos", "cuántos préstamos", "cuantos prestamos",
        "préstamos activos hay", "prestamos activos hay"
    ]):
        print(f"DEBUG: Detectada pregunta sobre préstamos activos")
        prestamos_activos = db.query(Prestamo).filter(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
        ).all()
        
        if not prestamos_activos:
            return "No hay préstamos activos en este momento."
        
        respuesta = f"Hay {len(prestamos_activos)} préstamos activos:\n\n"
        for p in prestamos_activos[:10]:  # Limitar a 10
            respuesta += f"• {p.equipo.serie} ({p.equipo.tipo}) - Prestado a: {p.trabajador.nombre} (Obra: {p.trabajador.obra})\n"
        
        if len(prestamos_activos) > 10:
            respuesta += f"\n... y {len(prestamos_activos) - 10} préstamos más."
        
        return respuesta.strip()
    
    # Detección de TOTAL de equipos (mostrar lista completa)
    if any(palabra in mensaje_lower for palabra in [
        "total equipos", "equipos en total", "todos los equipos", "cuántos equipos hay", "cuantos equipos hay",
        "total de equipos", "equipos total", "listar todos los equipos"
    ]):
        print(f"DEBUG: Detectada pregunta sobre TOTAL de equipos")
        todos_los_equipos = db.query(Equipo).filter(
            Equipo.estado_dispositivo != "BAJA"
        ).all()
        
        if not todos_los_equipos:
            return "No hay equipos en el sistema."
        
        # Agrupar por tipo
        tipos = {}
        for eq in todos_los_equipos:
            tipo = eq.tipo or "Sin tipo"
            if tipo not in tipos:
                tipos[tipo] = []
            tipos[tipo].append(eq)
        
        # Verificar estado de cada equipo
        respuesta = f"Hay {len(todos_los_equipos)} equipos en total:\n\n"
        for tipo, equipos_lista in tipos.items():
            respuesta += f"📦 {tipo} ({len(equipos_lista)} en total):\n"
            for eq in equipos_lista:
                # Verificar si está asignado
                esta_asignado = db.query(Prestamo).filter(
                    Prestamo.equipo_id == eq.id,
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                ).first() is not None
                
                estado_texto = "ASIGNADO" if esta_asignado else "DISPONIBLE"
                marca_modelo = f"{eq.marca} {eq.modelo}".strip() if eq.marca or eq.modelo else "Sin especificar"
                respuesta += f"   • Serie: {eq.serie} - {marca_modelo} | Estado: {estado_texto}\n"
            respuesta += "\n"
        
        return respuesta.strip()
    
    # Detección de estadísticas (solo si no es sobre total de equipos)
    if any(palabra in mensaje_lower for palabra in [
        "estadísticas", "estadisticas", "resumen del sistema", "resumen general"
    ]):
        print(f"DEBUG: Detectada pregunta sobre estadísticas")
        total_equipos = db.query(func.count(Equipo.id)).filter(
            Equipo.estado_dispositivo != "BAJA"
        ).scalar() or 0
        
        prestamos_activos = db.query(func.count(Prestamo.id)).filter(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
        ).scalar() or 0
        
        trabajadores_activos = db.query(func.count(Trabajador.rut)).filter(
            Trabajador.activo == True
        ).scalar() or 0
        
        return f"📊 Resumen del sistema:\n• {total_equipos} equipos totales\n• {prestamos_activos} préstamos activos\n• {trabajadores_activos} trabajadores activos"
    
    # Intentar procesamiento básico primero
    respuesta_basica = procesar_mensaje(mensaje, db, user)
    
    # Si la respuesta básica no es la genérica, retornarla
    if "No entendí tu consulta" not in respuesta_basica:
        return respuesta_basica
    
    # Análisis conversacional más inteligente para preguntas no predefinidas
    # Detectar si pregunta sobre disponibilidad de forma más flexible
    if any(p in mensaje_lower for p in ["disponible", "libre", "puedo usar", "hay algún", "tengo disponible"]):
        equipos = db.query(Equipo).filter(
            Equipo.estado_dispositivo == "OPERATIVO",
            ~Equipo.id.in_(
                db.query(Prestamo.equipo_id).filter(
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                )
            )
        ).limit(5).all()
        if equipos:
            respuesta = f"Sí, hay {len(equipos)} equipos disponibles. Por ejemplo:\n"
            for eq in equipos[:3]:
                marca_modelo = f"{eq.marca} {eq.modelo}".strip() if eq.marca or eq.modelo else ""
                respuesta += f"• {eq.tipo} {marca_modelo} (Serie: {eq.serie})\n"
            respuesta += "\n¿Quieres ver la lista completa o buscar algo específico?"
            return respuesta
    
    # Detectar si pregunta sobre estado o funcionamiento
    if any(p in mensaje_lower for p in ["estado", "cómo está", "funciona", "está bien"]):
        return "Puedo ayudarte a verificar el estado de equipos, préstamos o trabajadores. ¿Sobre qué quieres información específica? Por ejemplo, puedes preguntar sobre un equipo por su serie o sobre un trabajador."
    
    # Respuesta conversacional genérica más amigable
    return f"Entiendo tu pregunta. Puedo ayudarte con información sobre:\n\n• Equipos disponibles (puedo listarte todos)\n• Préstamos activos\n• Trabajadores y sus equipos asignados\n• Estadísticas del sistema\n• Buscar equipos por serie\n\n¿Sobre qué te gustaría saber más? Puedes preguntarme de forma natural, por ejemplo: '¿Qué equipos hay disponibles?' o '¿Cuántos préstamos activos hay?'"


def procesar_mensaje(mensaje: str, db: Session, user: Usuario) -> str:
    """Procesa el mensaje y genera una respuesta"""
    
    # Consultas sobre equipos disponibles
    if any(palabra in mensaje for palabra in ["equipos disponibles", "equipos libres", "qué equipos hay", "equipos disponibles"]):
        equipos_disponibles = db.query(Equipo).filter(
            Equipo.estado_dispositivo == "OPERATIVO",
            ~Equipo.id.in_(
                db.query(Prestamo.equipo_id).filter(
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                )
            )
        ).all()
        
        if not equipos_disponibles:
            return "No hay equipos disponibles en este momento."
        
        tipos = {}
        for eq in equipos_disponibles:
            tipos[eq.tipo] = tipos.get(eq.tipo, 0) + 1
        
        respuesta = f"Hay {len(equipos_disponibles)} equipos disponibles:\n"
        for tipo, cantidad in tipos.items():
            respuesta += f"• {cantidad} {tipo}\n"
        
        return respuesta
    
    # Consultas sobre préstamos activos
    if any(palabra in mensaje for palabra in ["préstamos activos", "equipos prestados", "quién tiene", "prestamos activos"]):
        prestamos_activos = db.query(Prestamo).filter(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
        ).count()
        
        return f"Actualmente hay {prestamos_activos} préstamos activos."
    
    # Buscar trabajador
    if "trabajador" in mensaje or "quién es" in mensaje or "quien es" in mensaje:
        # Extraer nombre o RUT del mensaje
        nombre_match = re.search(r'(?:trabajador|quien es|quién es)\s+([a-záéíóúñ]+)', mensaje)
        if nombre_match:
            nombre = nombre_match.group(1)
            trabajador = db.query(Trabajador).filter(
                Trabajador.nombre.ilike(f"%{nombre}%")
            ).first()
            
            if trabajador:
                prestamos = db.query(Prestamo).filter(
                    Prestamo.trabajador_rut == trabajador.rut,
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                ).count()
                
                return f"{trabajador.nombre} (RUT: {trabajador.rut}) - Obra: {trabajador.obra}. Tiene {prestamos} equipos asignados."
            else:
                return f"No encontré un trabajador con ese nombre."
    
    # Buscar equipo por serie
    if "equipo" in mensaje and ("serie" in mensaje or any(c.isalnum() for c in mensaje)):
        serie_match = re.search(r'[A-Z0-9-]+', mensaje.upper())
        if serie_match:
            serie = serie_match.group(0)
            equipo = db.query(Equipo).filter(Equipo.serie.ilike(f"%{serie}%")).first()
            
            if equipo:
                prestamo_activo = db.query(Prestamo).filter(
                    Prestamo.equipo_id == equipo.id,
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                ).first()
                
                estado = f"Prestado a {prestamo_activo.trabajador.nombre}" if prestamo_activo else "Disponible"
                return f"Equipo {equipo.serie}: {equipo.tipo} {equipo.marca} {equipo.modelo} - Estado: {estado}"
            else:
                return f"No encontré un equipo con esa serie."
    
    # Estadísticas generales
    if any(palabra in mensaje for palabra in ["estadísticas", "estadisticas", "resumen", "cuántos", "cuantos"]):
        total_equipos = db.query(func.count(Equipo.id)).filter(
            Equipo.estado_dispositivo != "BAJA"
        ).scalar() or 0
        
        prestamos_activos = db.query(func.count(Prestamo.id)).filter(
            Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
        ).scalar() or 0
        
        trabajadores_activos = db.query(func.count(Trabajador.rut)).filter(
            Trabajador.activo == True
        ).scalar() or 0
        
        return f"📊 Resumen del sistema:\n• {total_equipos} equipos totales\n• {prestamos_activos} préstamos activos\n• {trabajadores_activos} trabajadores activos"
    
    # Saludo
    if any(palabra in mensaje for palabra in ["hola", "buenos días", "buenas tardes", "ayuda", "help"]):
        return "¡Hola! Soy tu asistente virtual. Puedo ayudarte con:\n• Consultar equipos disponibles\n• Buscar trabajadores\n• Ver préstamos activos\n• Estadísticas del sistema\n• Buscar equipos por serie\n\n¿En qué puedo ayudarte?"
    
    # Respuesta por defecto
    return "No entendí tu consulta. Puedo ayudarte con:\n• Equipos disponibles\n• Préstamos activos\n• Buscar trabajadores\n• Estadísticas\n• Buscar equipos por serie\n\nIntenta reformular tu pregunta."


def obtener_sugerencias(mensaje: str) -> List[str]:
    """Retorna sugerencias basadas en el mensaje"""
    sugerencias = []
    
    if "equipo" in mensaje:
        sugerencias.append("¿Qué equipos están disponibles?")
        sugerencias.append("¿Cuántos equipos hay en total?")
    
    if "trabajador" in mensaje:
        sugerencias.append("Buscar trabajador por nombre")
        sugerencias.append("Ver trabajadores activos")
    
    if not sugerencias:
        sugerencias = [
            "¿Qué equipos están disponibles?",
            "¿Cuántos préstamos activos hay?",
            "Ver estadísticas del sistema"
        ]
    
    return sugerencias[:3]


# ============================================================================
# FUNCIONES DEL MOTOR DE IA PROPIO
# ============================================================================

def procesar_con_motor_ia(mensaje: str, db: Session, user: Usuario, historial: List[MensajeHistorial] = None) -> str:
    """Procesa el mensaje usando el motor de IA propio"""
    
    print(f"[MOTOR IA] Procesando mensaje: {mensaje}")
    
    # Buscar patrón más similar usando el motor de IA
    patron_encontrado, similitud = motor_ia.encontrar_patron_mas_similar(mensaje)
    
    if patron_encontrado and similitud > 0.6:  # Umbral de similitud
        print(f"[MOTOR IA] Patrón encontrado: '{patron_encontrado.texto}' (similitud: {similitud:.2f}, intención: {patron_encontrado.intencion}, confianza: {patron_encontrado.confianza:.2f})")
        
        # Incrementar uso del patrón
        patron_encontrado.incrementar_uso()
        
        # Ejecutar la acción correspondiente
        respuesta = ejecutar_accion(patron_encontrado.accion, mensaje, db, user, patron_encontrado.contexto)
        
        # Guardar conocimiento periódicamente (cada 5 usos)
        if patron_encontrado.veces_usado % 5 == 0:
            motor_ia.guardar_conocimiento()
        
        return respuesta
    else:
        # Si no encuentra patrón similar, intentar procesamiento mejorado
        print(f"[MOTOR IA] No se encontró patrón similar (mejor similitud: {similitud:.2f}), usando procesamiento mejorado")
        respuesta = procesar_mensaje_mejorado(mensaje, db, user)
        
        # Intentar aprender del mensaje si la respuesta fue exitosa
        if respuesta and "No entendí" not in respuesta and "puedo ayudarte" not in respuesta.lower():
            # Intentar inferir la intención de la respuesta
            intencion = inferir_intencion(mensaje, respuesta)
            if intencion:
                motor_ia.aprender_nuevo_patron(mensaje, intencion, "procesamiento_mejorado")
                motor_ia.guardar_conocimiento()
        
        return respuesta

def inferir_intencion(mensaje: str, respuesta: str) -> Optional[str]:
    """Intenta inferir la intención del mensaje basándose en la respuesta"""
    mensaje_lower = mensaje.lower()
    respuesta_lower = respuesta.lower()
    
    if "prestado a" in respuesta_lower or ("trabajador" in respuesta_lower and "serie" in mensaje_lower):
        return "quien_tiene_equipo"
    elif "disponibles" in respuesta_lower or "libres" in respuesta_lower:
        return "equipos_disponibles"
    elif "prestados" in respuesta_lower or "asignados" in respuesta_lower:
        return "equipos_prestados"
    elif "total" in respuesta_lower or "en total" in respuesta_lower:
        return "total_equipos"
    
    return None

def ejecutar_accion(accion: str, mensaje: str, db: Session, user: Usuario, contexto: Dict) -> str:
    """Ejecuta la acción correspondiente a la intención detectada"""
    
    if accion == "buscar_trabajador_por_serie":
        return buscar_trabajador_por_serie(mensaje, db)
    elif accion == "listar_equipos_disponibles":
        return listar_equipos_disponibles(db)
    elif accion == "listar_equipos_prestados":
        return listar_equipos_prestados(db)
    elif accion == "listar_todos_equipos":
        return listar_todos_equipos(db)
    else:
        # Fallback a procesamiento mejorado
        return procesar_mensaje_mejorado(mensaje, db, user)

def buscar_trabajador_por_serie(mensaje: str, db: Session) -> str:
    """Busca qué trabajador tiene un equipo por su serie"""
    # Extraer serie del mensaje
    series_encontradas = []
    serie_match1 = re.search(r'(?:serie|con\s+serie)\s+([A-Z0-9-]+)', mensaje.upper())
    if serie_match1:
        series_encontradas.append(serie_match1.group(1))
    
    series_match2 = re.findall(r'[A-Z0-9]{4,}', mensaje.upper())
    for s in series_match2:
        if s not in ['NOTEBOOK', 'LAPTOP', 'IPHONE', 'TABLET', 'SERIE', 'TRABAJADOR', 'EQUIPO']:
            series_encontradas.append(s)
    
    if series_encontradas:
        for serie in series_encontradas:
            serie_limpia = serie.replace('-', '').replace(' ', '').strip()
            if len(serie_limpia) < 4:
                continue
            
            equipo = db.query(Equipo).filter(Equipo.serie.ilike(f"%{serie_limpia}%")).first()
            if not equipo:
                equipo = db.query(Equipo).filter(
                    func.replace(Equipo.serie, '-', '').ilike(f"%{serie_limpia}%")
                ).first()
            
            if equipo:
                prestamo_activo = db.query(Prestamo).filter(
                    Prestamo.equipo_id == equipo.id,
                    Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
                ).first()
                
                if prestamo_activo:
                    return f"El equipo {equipo.tipo} con serie **{equipo.serie}** ({equipo.marca} {equipo.modelo}) está prestado a:\n\n• **{prestamo_activo.trabajador.nombre}**\n• RUT: {prestamo_activo.trabajador.rut}\n• Obra: {prestamo_activo.trabajador.obra}"
                else:
                    return f"El equipo {equipo.tipo} con serie **{equipo.serie}** ({equipo.marca} {equipo.modelo}) está **disponible** y no está asignado a ningún trabajador."
    
    return "No pude encontrar la serie del equipo en tu mensaje. ¿Podrías especificarla?"

def listar_equipos_disponibles(db: Session) -> str:
    """Lista los equipos disponibles"""
    equipos_disponibles = db.query(Equipo).filter(
        Equipo.estado_dispositivo == "OPERATIVO",
        ~Equipo.id.in_(
            db.query(Prestamo.equipo_id).filter(
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            )
        )
    ).all()
    
    if not equipos_disponibles:
        return "No hay equipos disponibles en este momento."
    
    tipos = {}
    for eq in equipos_disponibles:
        tipo = eq.tipo or "Sin tipo"
        if tipo not in tipos:
            tipos[tipo] = []
        tipos[tipo].append(eq)
    
    respuesta = f"Hay {len(equipos_disponibles)} equipos disponibles:\n\n"
    for tipo, equipos_lista in tipos.items():
        respuesta += f"📦 {tipo} ({len(equipos_lista)} disponibles):\n"
        for eq in equipos_lista:
            marca_modelo = f"{eq.marca} {eq.modelo}".strip() if eq.marca or eq.modelo else "Sin especificar"
            respuesta += f"   • Serie: {eq.serie} - {marca_modelo}\n"
        respuesta += "\n"
    
    return respuesta.strip()

def listar_equipos_prestados(db: Session) -> str:
    """Lista los equipos prestados"""
    prestamos_activos = db.query(Prestamo).filter(
        Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
    ).all()
    
    if not prestamos_activos:
        return "No hay equipos prestados en este momento."
    
    tipos = {}
    for p in prestamos_activos:
        eq = p.equipo
        tipo = eq.tipo or "Sin tipo"
        if tipo not in tipos:
            tipos[tipo] = []
        tipos[tipo].append({'equipo': eq, 'trabajador': p.trabajador})
    
    respuesta = f"Hay {len(prestamos_activos)} equipos prestados:\n\n"
    for tipo, items in tipos.items():
        respuesta += f"📦 {tipo} ({len(items)} prestados):\n"
        for item in items:
            eq = item['equipo']
            trabajador = item['trabajador']
            marca_modelo = f"{eq.marca} {eq.modelo}".strip() if eq.marca or eq.modelo else "Sin especificar"
            respuesta += f"   • Serie: {eq.serie} - {marca_modelo} | Prestado a: {trabajador.nombre} (Obra: {trabajador.obra})\n"
        respuesta += "\n"
    
    return respuesta.strip()

def listar_todos_equipos(db: Session) -> str:
    """Lista todos los equipos del sistema"""
    todos_los_equipos = db.query(Equipo).filter(
        Equipo.estado_dispositivo != "BAJA"
    ).all()
    
    if not todos_los_equipos:
        return "No hay equipos en el sistema."
    
    tipos = {}
    for eq in todos_los_equipos:
        tipo = eq.tipo or "Sin tipo"
        if tipo not in tipos:
            tipos[tipo] = []
        tipos[tipo].append(eq)
    
    respuesta = f"Hay {len(todos_los_equipos)} equipos en total:\n\n"
    for tipo, equipos_lista in tipos.items():
        respuesta += f"📦 {tipo} ({len(equipos_lista)} en total):\n"
        for eq in equipos_lista:
            esta_asignado = db.query(Prestamo).filter(
                Prestamo.equipo_id == eq.id,
                Prestamo.estado_prestamo == EstadoPrestamo.ASIGNADO
            ).first() is not None
            
            estado_texto = "ASIGNADO" if esta_asignado else "DISPONIBLE"
            marca_modelo = f"{eq.marca} {eq.modelo}".strip() if eq.marca or eq.modelo else "Sin especificar"
            respuesta += f"   • Serie: {eq.serie} - {marca_modelo} | Estado: {estado_texto}\n"
        respuesta += "\n"
    
    return respuesta.strip()

@router.get("/estadisticas-ia")
def obtener_estadisticas_ia(current_user: Usuario = Depends(get_current_user)):
    """Obtiene estadísticas del motor de IA"""
    return motor_ia.obtener_estadisticas()

