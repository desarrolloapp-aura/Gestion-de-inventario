# ⚙️ Configurar Build Command en Render (Frontend)

Si el servicio Frontend se creó **manualmente** (no desde `render.yaml`), necesitas actualizar el Build Command manualmente.

## Pasos:

1. **Ve a tu Dashboard de Render**
   - https://dashboard.render.com

2. **Selecciona el servicio Frontend**
   - Busca el servicio llamado `Gestion-de-inventario` o `aura-frontend`
   - Haz clic en él

3. **Ve a "Settings" (Configuración)**
   - En el menú lateral, haz clic en **"Settings"**

4. **Actualiza el Build Command**
   - Busca la sección **"Build Command"**
   - Reemplaza el comando actual con:
     ```
     npm install --legacy-peer-deps && npm run build
     ```
   - Haz clic en **"Save Changes"**

5. **Render redeployará automáticamente**
   - Después de guardar, Render detectará el cambio y redeployará
   - Espera a que termine (puede tomar 2-5 minutos)

---

## ✅ Verificación:

Después del deploy, verifica que el build sea exitoso:
- Ve a la pestaña **"Logs"** del servicio
- Deberías ver:
  - `npm install --legacy-peer-deps` ejecutándose
  - `npm run build` completándose sin errores
  - Build exitoso

---

## 🔄 Alternativa: Recrear el servicio desde render.yaml

Si prefieres usar el `render.yaml` automáticamente:
1. Elimina el servicio Frontend actual
2. Ve a tu Dashboard → **"New"** → **"Blueprint"**
3. Conecta tu repositorio de GitHub
4. Render detectará el `render.yaml` y creará los servicios automáticamente

