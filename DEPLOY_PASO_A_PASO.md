
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

