# 🚀 Pasos para Deploy en Railway (Paso a Paso)

## ✅ Paso 1: PostgreSQL (YA COMPLETADO)
Ya agregaste PostgreSQL. Railway creó automáticamente la variable `DATABASE_URL`.

---

## 📋 Paso 2: Crear Servicio Backend

### 2.1 Agregar Servicio desde GitHub
1. En Railway, haz clic en **"+ New"** → **"GitHub Repo"**
2. Selecciona tu repositorio: `cuevasn050/Gestion-de-inventario`
3. Railway preguntará qué servicio crear
4. Selecciona **"Backend"** o crea un servicio nuevo
5. **IMPORTANTE:** En la configuración del servicio, busca **"Root Directory"** o **"Source"**
6. Cambia el root directory a: `backend`
   - Esto le dice a Railway que el código está en la carpeta `backend/`

### 2.2 Conectar a PostgreSQL
1. En el servicio Backend, haz clic en **"Variables"** o **"Settings"**
2. Busca **"Add Service"** o **"Connect Database"**
3. Conecta el servicio PostgreSQL que ya creaste
4. Railway automáticamente agregará `DATABASE_URL` a las variables de entorno

### 2.3 Configurar Variables de Entorno
En el servicio Backend, agrega estas variables en **"Variables"**:

```
JWT_SECRET_KEY=tu-secret-key-super-segura-cambiala-por-una-real
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
CORS_ORIGINS=https://tu-frontend.railway.app
GEMINI_API_KEY= (déjalo vacío si no lo usas)
```

**NOTA:** `DATABASE_URL` ya está configurada automáticamente por Railway.

### 2.4 Deploy Backend
1. Railway detectará automáticamente que es Python
2. Usará `requirements.txt` para instalar dependencias
3. Usará `Procfile` o `railway.json` para iniciar el servidor
4. Espera a que el deploy termine
5. Railway te dará una URL como: `https://tu-backend.railway.app`

**Guarda esta URL** - la necesitarás para el Frontend y Mobile.

---

## 📋 Paso 3: Crear Servicio Frontend

### 3.1 Agregar Servicio desde GitHub
1. En Railway, haz clic en **"+ New"** → **"GitHub Repo"**
2. Selecciona el **mismo repositorio**: `cuevasn050/Gestion-de-inventario`
3. Selecciona **"Frontend"** o crea un servicio nuevo
4. **IMPORTANTE:** Cambia el **Root Directory** a: `frontend`

### 3.2 Configurar Variables de Entorno
En el servicio Frontend, agrega:

```
VITE_API_URL=https://tu-backend.railway.app
```

(Reemplaza `tu-backend.railway.app` con la URL real que te dio Railway para el Backend)

### 3.3 Deploy Frontend
1. Railway detectará Node.js automáticamente
2. Ejecutará `npm install` y `npm run build`
3. Iniciará el servidor con `npm run preview`
4. Railway te dará una URL como: `https://tu-frontend.railway.app`

---

## 📋 Paso 4: Actualizar CORS en Backend

Después de que el Frontend esté deployado:

1. Ve al servicio Backend en Railway
2. Edita la variable `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://tu-frontend.railway.app
   ```
3. Railway redeployará automáticamente

---

## 📋 Paso 5: Configurar Mobile para Producción

### 5.1 Actualizar URL en el código
Edita `mobile/src/config/api.ts`:

```typescript
const PRODUCTION_API_URL = 'https://tu-backend.railway.app';
```

### 5.2 Actualizar app.config.js
Edita `mobile/app.config.js`:

```javascript
extra: {
  apiUrl: "https://tu-backend.railway.app",
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

- **Backend:** `https://tu-backend.railway.app`
- **Frontend:** `https://tu-frontend.railway.app`
- **Mobile:** APK con URL hardcodeada
- **Base de Datos:** PostgreSQL (conectada automáticamente)

**Total: 2 servicios + 1 base de datos**

