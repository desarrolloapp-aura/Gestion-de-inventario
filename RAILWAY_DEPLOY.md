# 🚀 Guía de Deployment en Railway

## Estructura de Servicios

Necesitas **2 servicios** en Railway:

1. **Backend** (FastAPI/Python)
2. **Frontend** (Vite/React)

**Mobile NO se deploya** - Solo configuras la URL del backend en el código.

---

## 📋 Paso 1: Preparar Backend

### 1.1 Variables de Entorno en Railway

En el servicio Backend, agrega estas variables:

```
DATABASE_URL=postgresql://... (Railway lo crea automáticamente si agregas PostgreSQL)
JWT_SECRET_KEY=tu-secret-key-super-segura
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
CORS_ORIGINS=https://tu-frontend.railway.app
GEMINI_API_KEY= (opcional)
```

### 1.2 Agregar PostgreSQL

1. En Railway, agrega un servicio PostgreSQL
2. Railway automáticamente creará `DATABASE_URL`
3. Conecta el servicio Backend a esta base de datos

### 1.3 Deploy Backend

1. Conecta tu repositorio de GitHub a Railway
2. Selecciona la carpeta `backend/` como root
3. Railway detectará automáticamente Python y usará `requirements.txt`
4. El servicio iniciará en el puerto que Railway asigne

**URL del Backend:** `https://tu-backend.railway.app`

---

## 📋 Paso 2: Preparar Frontend

### 2.1 Variables de Entorno

En el servicio Frontend, agrega:

```
VITE_API_URL=https://tu-backend.railway.app
```

### 2.2 Deploy Frontend

1. Crea un nuevo servicio en Railway
2. Selecciona la carpeta `frontend/` como root
3. Railway detectará Node.js y usará `package.json`
4. El build se ejecutará automáticamente

**URL del Frontend:** `https://tu-frontend.railway.app`

---

## 📋 Paso 3: Configurar Mobile para Producción

### 3.1 Actualizar URL de Producción

Edita `mobile/src/config/api.ts`:

```typescript
const PRODUCTION_API_URL = 'https://tu-backend.railway.app';
```

### 3.2 Generar APK con URL de Producción

1. Edita `mobile/app.config.js`:
```javascript
extra: {
  apiUrl: "https://tu-backend.railway.app",
  eas: {
    projectId: "6cfe36ce-1b8e-4173-afdd-9b703f8d2879"
  }
}
```

2. Genera el APK:
```powershell
npx eas-cli build --platform android --profile production
```

3. El APK funcionará automáticamente sin pedir URL al usuario.

---

## ✅ Resumen

- **Backend:** `https://tu-backend.railway.app` (1 servicio)
- **Frontend:** `https://tu-frontend.railway.app` (1 servicio)
- **Mobile:** APK con URL hardcodeada (no necesita deploy)
- **Base de Datos:** PostgreSQL en Railway (1 servicio adicional)

**Total: 3 servicios en Railway** (Backend, Frontend, PostgreSQL)

---

## 🔧 Troubleshooting

### Backend no conecta a la base de datos
- Verifica que `DATABASE_URL` esté configurada
- Asegúrate de que el servicio PostgreSQL esté conectado al Backend

### Frontend no conecta al Backend
- Verifica `VITE_API_URL` en variables de entorno
- Verifica `CORS_ORIGINS` en el Backend incluye la URL del Frontend

### Mobile no conecta
- Verifica que `PRODUCTION_API_URL` esté correcta
- Regenera el APK después de cambiar la URL

