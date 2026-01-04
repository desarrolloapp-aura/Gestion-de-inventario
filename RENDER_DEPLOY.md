
4. En **"Environment Variables"**, agrega:
   ```
   DATABASE_URL=postgresql://aura_user:BeLr0hbo8oD51ELqoo8LiKeiIILWOLqm@dpg-d5dcdt6uk2gs738tfu30-a/aura_8j0l
   JWT_SECRET_KEY=tu-secret-key-super-segura
   JWT_ALGORITHM=HS256
   JWT_EXPIRATION_HOURS=24
   CORS_ORIGINS=https://aura-frontend.onrender.com
  
   ```
5. Click **"Create Web Service"**
6. Render te dará una URL como: `https://aura-backend.onrender.com`

**Guarda esta URL** - la necesitarás para el Frontend y Mobile.

---

## 📋 Paso 3: Deploy Frontend

1. En Render, ve a **Dashboard** → **"+ New"** → **"Web Service"**
2. Conecta el **mismo repositorio** de GitHub
3. Configura:
   - **Name:** `aura-frontend`
   - **Environment:** `Node`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run preview -- --host 0.0.0.0 --port $PORT`
4. En **"Environment Variables"**, agrega:
   ```
   VITE_API_URL=https://aura-backend.onrender.com
   ```
   (Reemplaza con la URL real de tu backend)
5. Click **"Create Web Service"**
6. Render te dará una URL como: `https://aura-frontend.onrender.com`

---

## 📋 Paso 4: Actualizar CORS en Backend

Después de que el Frontend esté deployado:

1. Ve al servicio Backend en Render
2. Ve a **"Environment"** → **"Environment Variables"**
3. Edita `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://aura-frontend.onrender.com
   ```
4. Render redeployará automáticamente

---

## 📋 Paso 5: Configurar Mobile para Producción

### 5.1 Actualizar URL en el código
Edita `mobile/src/config/api.ts`:

```typescript
const PRODUCTION_API_URL = 'https://aura-backend.onrender.com';
```

### 5.2 Actualizar app.config.js
Edita `mobile/app.config.js`:

```javascript
extra: {
  apiUrl: "https://aura-backend.onrender.com",
  eas: {
    projectId: "6cfe36ce-1b8e-4173-afdd-9b703f8d2879"
  }
}
```

### 5.3 Generar APK
```powershell
cd mobile
npx eas-cli build --platform android --profile production
```

El APK funcionará automáticamente sin pedir URL al usuario.

---

## ✅ Resumen Final

- **Backend:** `https://aura-backend.onrender.com`
- **Frontend:** `https://aura-frontend.onrender.com`
- **Mobile:** APK con URL hardcodeada
- **Base de Datos:** PostgreSQL en Render

**Total: 2 servicios web + 1 base de datos**

---

## 🔧 Troubleshooting

### Backend no conecta a la base de datos
- Verifica que `DATABASE_URL` esté configurada correctamente
- Usa la "Internal Database URL" de Render (no la pública)
- Asegúrate de que el servicio Backend esté en la misma región que la base de datos

### Frontend no conecta al Backend
- Verifica `VITE_API_URL` en variables de entorno
- Verifica `CORS_ORIGINS` en el Backend incluye la URL del Frontend
- Asegúrate de que ambas URLs terminen sin barra final `/`

### Mobile no conecta
- Verifica que `PRODUCTION_API_URL` esté correcta
- Regenera el APK después de cambiar la URL
- Asegúrate de que la URL use `https://` (no `http://`)

---

## 📝 Notas Importantes

- **Render Free Plan:** Los servicios se "duermen" después de 15 minutos de inactividad. La primera petición puede tardar ~30 segundos en despertar.
- **Para producción real:** Considera el plan "Starter" ($7/mes) para evitar el "sleep".
- **Base de datos:** El plan free de PostgreSQL tiene 90 días de prueba, luego necesitas un plan de pago.

