"""
Motor de IA Propio - Sistema de Aprendizaje Continuo
Aprende de ejemplos y mejora con el tiempo mediante ciclos de retroalimentación
"""

import re
import os
import pickle
from pathlib import Path
from collections import defaultdict
from difflib import SequenceMatcher
from datetime import datetime
from typing import List, Dict, Tuple, Optional

# Ruta para guardar el conocimiento aprendido
BASE_DIR = Path(__file__).parent.parent
CONOCIMIENTO_FILE = str(BASE_DIR / "conocimiento_ia.pkl")


class PatronAprendido:
    """Representa un patrón aprendido por la IA"""
    
    def __init__(self, texto: str, intencion: str, accion: str, contexto: Dict = None):
        self.texto = texto.lower().strip()
        self.intencion = intencion  # "quien_tiene_equipo", "equipos_disponibles", etc.
        self.accion = accion  # Función a ejecutar
        self.contexto = contexto or {}
        self.veces_usado = 1
        self.ultimo_uso = datetime.now().isoformat()
        self.exito = True  # Si la respuesta fue correcta
        self.confianza = 1.0  # Nivel de confianza (0-1)
    
    def incrementar_uso(self):
        """Incrementa el contador de uso y actualiza la confianza"""
        self.veces_usado += 1
        self.ultimo_uso = datetime.now().isoformat()
        # Aumentar confianza con el uso exitoso
        self.confianza = min(1.0, self.confianza + 0.01)
    
    def marcar_exito(self, exito: bool):
        """Marca si el patrón fue exitoso o no"""
        self.exito = exito
        if exito:
            self.confianza = min(1.0, self.confianza + 0.05)
        else:
            self.confianza = max(0.1, self.confianza - 0.1)


class MotorIA:
    """Motor de IA propio que aprende de ejemplos y mejora con el tiempo"""
    
    def __init__(self):
        self.patrones_aprendidos: List[PatronAprendido] = []
        self.intenciones: Dict[str, List[str]] = defaultdict(list)
        self.palabras_clave: Dict[str, float] = defaultdict(float)  # Peso de palabras
        self.cargar_conocimiento()
        self.inicializar_patrones_base()
    
    def inicializar_patrones_base(self):
        """Inicializa con patrones básicos si no hay conocimiento guardado"""
        if len(self.patrones_aprendidos) == 0:
            patrones_base = [
                ("quien tiene el notebook con la serie", "quien_tiene_equipo", "buscar_trabajador_por_serie"),
                ("que trabajador tiene el equipo con serie", "quien_tiene_equipo", "buscar_trabajador_por_serie"),
                ("a quien se le asigno el equipo con serie", "quien_tiene_equipo", "buscar_trabajador_por_serie"),
                ("quien tiene el pc con serie", "quien_tiene_equipo", "buscar_trabajador_por_serie"),
                ("equipos disponibles", "equipos_disponibles", "listar_equipos_disponibles"),
                ("que equipos hay disponibles", "equipos_disponibles", "listar_equipos_disponibles"),
                ("equipos libres", "equipos_disponibles", "listar_equipos_disponibles"),
                ("equipos prestados", "equipos_prestados", "listar_equipos_prestados"),
                ("equipos asignados", "equipos_prestados", "listar_equipos_prestados"),
                ("equipos ocupados", "equipos_prestados", "listar_equipos_prestados"),
                ("total equipos", "total_equipos", "listar_todos_equipos"),
                ("cuantos equipos hay en total", "total_equipos", "listar_todos_equipos"),
            ]
            
            for texto, intencion, accion in patrones_base:
                patron = PatronAprendido(texto, intencion, accion)
                self.patrones_aprendidos.append(patron)
                self.intenciones[intencion].append(texto)
    
    def tokenizar(self, texto: str) -> List[str]:
        """Tokeniza el texto en palabras significativas"""
        texto = texto.lower()
        # Remover signos de puntuación
        texto = re.sub(r'[^\w\s]', ' ', texto)
        # Dividir en palabras
        palabras = texto.split()
        # Filtrar palabras muy cortas o comunes
        palabras_ignorar = {'el', 'la', 'los', 'las', 'de', 'del', 'con', 'por', 'para', 'que', 'qué', 'un', 'una', 'es', 'está', 'estan'}
        return [p for p in palabras if len(p) > 2 and p not in palabras_ignorar]
    
    def calcular_similitud_avanzada(self, texto1: str, texto2: str) -> float:
        """Calcula similitud usando múltiples técnicas"""
        # Similitud de secuencia
        sim_secuencia = SequenceMatcher(None, texto1.lower(), texto2.lower()).ratio()
        
        # Similitud de tokens (palabras en común)
        tokens1 = set(self.tokenizar(texto1))
        tokens2 = set(self.tokenizar(texto2))
        
        if not tokens1 or not tokens2:
            return sim_secuencia
        
        # Jaccard similarity
        interseccion = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)
        sim_jaccard = interseccion / union if union > 0 else 0
        
        # Similitud ponderada por palabras clave importantes
        palabras_importantes = {'quien', 'trabajador', 'equipo', 'serie', 'disponible', 'prestado', 'asignado', 'total', 'notebook', 'pc', 'laptop'}
        tokens_importantes1 = tokens1 & palabras_importantes
        tokens_importantes2 = tokens2 & palabras_importantes
        
        sim_importantes = len(tokens_importantes1 & tokens_importantes2) / max(len(tokens_importantes1 | tokens_importantes2), 1) if (tokens_importantes1 | tokens_importantes2) else 0
        
        # Combinar similitudes (ponderado)
        similitud_final = (sim_secuencia * 0.3) + (sim_jaccard * 0.4) + (sim_importantes * 0.3)
        
        return similitud_final
    
    def encontrar_patron_mas_similar(self, mensaje: str) -> Tuple[Optional[PatronAprendido], float]:
        """Encuentra el patrón más similar usando el motor de IA"""
        mensaje_lower = mensaje.lower().strip()
        mejor_patron = None
        mejor_similitud = 0.0
        
        for patron in self.patrones_aprendidos:
            # Solo considerar patrones exitosos y con buena confianza
            if not patron.exito or patron.confianza < 0.3:
                continue
            
            similitud = self.calcular_similitud_avanzada(mensaje_lower, patron.texto)
            
            # Aumentar similitud basado en confianza y uso
            factor_confianza = patron.confianza
            factor_uso = min(1.0 + (patron.veces_usado - 1) * 0.02, 1.15)
            similitud_ajustada = similitud * factor_confianza * factor_uso
            
            if similitud_ajustada > mejor_similitud:
                mejor_similitud = similitud_ajustada
                mejor_patron = patron
        
        return mejor_patron, mejor_similitud if mejor_patron else 0.0
    
    def aprender_nuevo_patron(self, mensaje: str, intencion: str, accion: str, contexto: Dict = None):
        """Aprende un nuevo patrón del mensaje"""
        mensaje_lower = mensaje.lower().strip()
        
        # Verificar si ya existe un patrón muy similar
        patron_existente, similitud = self.encontrar_patron_mas_similar(mensaje_lower)
        
        if patron_existente and similitud > 0.85:
            # Si es muy similar, solo incrementar el uso del existente
            patron_existente.incrementar_uso()
            return patron_existente
        else:
            # Crear nuevo patrón
            nuevo_patron = PatronAprendido(mensaje_lower, intencion, accion, contexto)
            self.patrones_aprendidos.append(nuevo_patron)
            self.intenciones[intencion].append(mensaje_lower)
            
            # Actualizar pesos de palabras clave
            tokens = self.tokenizar(mensaje_lower)
            for token in tokens:
                self.palabras_clave[token] += 0.1
            
            print(f"[MOTOR IA] Nuevo patrón aprendido: '{mensaje_lower}' -> {intencion}")
            return nuevo_patron
    
    def retroalimentacion(self, mensaje: str, exito: bool):
        """Ciclo de retroalimentación - mejora el aprendizaje basado en resultados"""
        patron, _ = self.encontrar_patron_mas_similar(mensaje)
        
        if patron:
            patron.marcar_exito(exito)
            
            if exito:
                # Si fue exitoso, aumentar confianza y uso
                patron.incrementar_uso()
                print(f"[MOTOR IA] Retroalimentación positiva para patrón: '{patron.texto}'")
            else:
                # Si falló, reducir confianza
                print(f"[MOTOR IA] Retroalimentación negativa para patrón: '{patron.texto}'")
    
    def guardar_conocimiento(self):
        """Guarda el conocimiento aprendido en disco"""
        try:
            conocimiento = {
                'patrones': [
                    {
                        'texto': p.texto,
                        'intencion': p.intencion,
                        'accion': p.accion,
                        'contexto': p.contexto,
                        'veces_usado': p.veces_usado,
                        'ultimo_uso': p.ultimo_uso,
                        'exito': p.exito,
                        'confianza': p.confianza
                    }
                    for p in self.patrones_aprendidos
                ],
                'palabras_clave': dict(self.palabras_clave),
                'fecha_actualizacion': datetime.now().isoformat()
            }
            
            os.makedirs(os.path.dirname(CONOCIMIENTO_FILE), exist_ok=True)
            with open(CONOCIMIENTO_FILE, 'wb') as f:
                pickle.dump(conocimiento, f)
            
            print(f"[MOTOR IA] Conocimiento guardado: {len(self.patrones_aprendidos)} patrones")
        except Exception as e:
            print(f"[MOTOR IA] Error guardando conocimiento: {e}")
    
    def cargar_conocimiento(self):
        """Carga el conocimiento aprendido desde disco"""
        try:
            if os.path.exists(CONOCIMIENTO_FILE):
                with open(CONOCIMIENTO_FILE, 'rb') as f:
                    conocimiento = pickle.load(f)
                
                self.patrones_aprendidos = []
                for p_data in conocimiento.get('patrones', []):
                    patron = PatronAprendido(
                        p_data['texto'],
                        p_data['intencion'],
                        p_data['accion'],
                        p_data.get('contexto', {})
                    )
                    patron.veces_usado = p_data.get('veces_usado', 1)
                    patron.ultimo_uso = p_data.get('ultimo_uso', datetime.now().isoformat())
                    patron.exito = p_data.get('exito', True)
                    patron.confianza = p_data.get('confianza', 1.0)
                    self.patrones_aprendidos.append(patron)
                
                self.palabras_clave = defaultdict(float, conocimiento.get('palabras_clave', {}))
                
                print(f"[MOTOR IA] Conocimiento cargado: {len(self.patrones_aprendidos)} patrones")
        except Exception as e:
            print(f"[MOTOR IA] Error cargando conocimiento: {e}")
            self.patrones_aprendidos = []
            self.palabras_clave = defaultdict(float)
    
    def obtener_estadisticas(self) -> Dict:
        """Obtiene estadísticas del motor de IA"""
        return {
            'total_patrones': len(self.patrones_aprendidos),
            'patrones_por_intencion': {k: len(v) for k, v in self.intenciones.items()},
            'patrones_mas_usados': sorted(
                [(p.texto, p.veces_usado, p.confianza) for p in self.patrones_aprendidos],
                key=lambda x: x[1],
                reverse=True
            )[:10],
            'palabras_clave_top': sorted(
                self.palabras_clave.items(),
                key=lambda x: x[1],
                reverse=True
            )[:20]
        }

# Instancia global del motor de IA
motor_ia = MotorIA()

