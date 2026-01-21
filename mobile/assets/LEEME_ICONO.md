# 📱 Configurar Icono de la Aplicación

## Requisitos del Icono

Para cambiar el icono de la aplicación Android, necesitas:

1. **Crear un archivo PNG** llamado `icon.png`
2. **Tamaño:** 1024x1024 píxeles
3. **Formato:** PNG (sin transparencia para mejor compatibilidad)
4. **Colocarlo en:** `mobile/assets/icon.png`

## Diseño Recomendado

- **Fondo:** Puede ser transparente o del color `#111827` (gris oscuro)
- **Contenido:** Logo o símbolo de "Aura Ingeniería"
- **Centrado:** El contenido importante debe estar centrado
- **Márgenes:** Dejar al menos 10% de margen en los bordes (el sistema puede recortar los bordes)

## Pasos

1. Diseña o descarga un icono de 1024x1024 px
2. Nómbralo `icon.png`
3. Colócalo en la carpeta `mobile/assets/`
4. Regenera la APK con: `npx eas-cli build --platform android --profile preview`

## Nota

El icono se usará tanto para Android como para iOS (si generas la app para iOS).



