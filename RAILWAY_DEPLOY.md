``
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