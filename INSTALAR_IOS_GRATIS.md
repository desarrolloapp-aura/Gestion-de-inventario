# 🍎 Instalar App iOS en tu Dispositivo (Gratis)

## Opción 1: Máquina Virtual macOS + Xcode

### Requisitos:
1. **Máquina Virtual con macOS:**
   - VirtualBox o VMware
   - macOS instalado (puede ser complejo, Apple restringe esto)
   - Mínimo 4GB RAM, 50GB disco

2. **Xcode:**
   - Descargar desde Mac App Store (gratis)
   - Requiere ~12GB de espacio

3. **Apple ID:**
   - Tu cuenta de Apple (gratis)

### Proceso:

1. **Configurar Xcode:**
   ```bash
   # Abrir Xcode
   # Ir a Preferences → Accounts
   # Agregar tu Apple ID
   ```

2. **Generar el build:**
   ```bash
   cd mobile
   npx expo prebuild --platform ios
   npx expo run:ios --device
   ```

3. **Conectar tu iPhone:**
   - Conecta por USB
   - Confía en la computadora en el iPhone
   - Xcode detectará tu dispositivo

4. **Instalar:**
   - Selecciona tu iPhone como destino
   - Xcode instalará la app directamente

### ⚠️ Limitaciones:
- ✅ Solo funciona en TU dispositivo
- ❌ Certificado expira cada 7 días (debes re-instalar)
- ❌ No puedes distribuir a otros
- ⚠️ VM de macOS puede ser lenta/inestable

---

## Opción 2: Mac Físico (Si tienes acceso)

Mismo proceso pero más rápido y estable.

---

## Opción 3: Expo Go (Más Fácil) ⭐

**La forma más simple:**

1. **Instalar Expo Go en tu iPhone:**
   - Desde App Store (gratis)

2. **Iniciar el servidor:**
   ```powershell
   cd mobile
   npx expo start
   ```

3. **Escanear QR:**
   - Abre Expo Go
   - Escanea el QR que aparece en la terminal
   - La app se carga directamente

**Ventajas:**
- ✅ Gratis
- ✅ No requiere Mac
- ✅ No requiere certificados
- ✅ Funciona en cualquier red

**Desventajas:**
- ⚠️ Requiere que el servidor de Expo esté corriendo
- ⚠️ No es una app "instalada" permanente

---

## Recomendación

**Para tu caso (solo tu dispositivo):**
- **Mejor opción:** Expo Go (más fácil, no requiere Mac)
- **Si quieres app "real":** Mac físico o VM con Xcode

**Para Android (otros dispositivos):**
- ✅ Ya estás generando la APK con EAS
- ✅ Se puede instalar en múltiples dispositivos sin límite

