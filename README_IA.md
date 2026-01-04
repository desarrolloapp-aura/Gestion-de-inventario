# Motor de IA Propio - Sistema de Aprendizaje Continuo

## 🚀 Comandos de Despliegue

### Entrenar/Desplegar la IA
```bash
# Opción 1: Usando el script principal
python setup_ia.py

# Opción 2: Modo automático (sin confirmación)
python setup_ia.py --yes

# Opción 3: Usando el script de entrenamiento directo
python backend/scripts/entrenar_ia.py

# Opción 4: En Windows (doble clic)
entrenar_ia.bat
```

### Ver Estado y Porcentaje de Aprendizaje
```bash
# Opción 1: Script Python
python backend/scripts/estado_ia.py

# Opción 2: En Windows (doble clic)
estado_ia.bat
```

## 📊 Características del Motor de IA

### Sistema de Aprendizaje
- **Aprende de ejemplos**: Guarda patrones de preguntas y sus intenciones
- **Ciclos de retroalimentación**: Mejora con cada uso exitoso
- **Almacenamiento persistente**: Guarda conocimiento en `backend/conocimiento_ia.pkl`
- **Confianza por patrón**: Cada patrón tiene un nivel de confianza que aumenta con el uso

### Métricas de Aprendizaje
- **Porcentaje de aprendizaje**: Basado en patrones exitosos y confianza promedio
- **Patrones por intención**: Distribución de conocimiento por tipo de consulta
- **Top patrones más usados**: Los patrones más confiables y utilizados
- **Palabras clave importantes**: Peso de palabras en el conocimiento

## 🔄 Ciclo de Aprendizaje

1. **Detección**: Encuentra el patrón más similar al mensaje
2. **Ejecución**: Ejecuta la acción correspondiente
3. **Aprendizaje**: Si la respuesta es exitosa, aprende nuevas variaciones
4. **Retroalimentación**: El usuario puede marcar si la respuesta fue útil
5. **Mejora continua**: El motor se vuelve más inteligente con el tiempo

## 📈 Estadísticas

El motor muestra:
- Total de patrones aprendidos
- Patrones nuevos en cada ciclo
- Porcentaje de aprendizaje (0-100%)
- Top patrones más usados
- Palabras clave más importantes

## 💡 Uso

El motor se activa automáticamente cuando usas el asistente virtual en la aplicación.
Cada interacción exitosa mejora el aprendizaje del motor.

Para mejorar el aprendizaje, ejecuta periódicamente:
```bash
python setup_ia.py --yes
```


