# 🔐 Variables de Entorno para Render

## Variables que DEBES configurar en el Backend:

### 1. DATABASE_URL ✅
**Ya la tienes:**
```
postgresql://aura_user:BeLr0hbo80D51ELq0o8LiKeiIILWOLqm@dpg-d5dcdt6uk2gs738tfu30-a/aura_8j01
```

### 2. JWT_SECRET_KEY ⚠️
**Debes generarla tú** - Es una clave secreta para firmar los tokens JWT.

**Genera una clave segura:**
- Puedes usar: https://randomkeygen.com/
- O usar Python: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- O cualquier generador de claves aleatorias

**Ejemplo de clave generada:**
```
JWT_SECRET_KEY=K8mN3pQ9rT2vW5xZ7aB0cD1eF4gH6iJ8kL0mN2pQ4rS6tU8vW0xY2zA4bC6dE8f
```

### 3. JWT_ALGORITHM ✅
**Valor fijo:**
```
JWT_ALGORITHM=HS256
```

### 4. JWT_EXPIRATION_HOURS ✅
**Valor fijo:**
```
JWT_EXPIRATION_HOURS=24
```

### 5. CORS_ORIGINS ⚠️
**URL del Frontend** - Como aún no existe, puedes:

**Opción A:** Dejarlo vacío por ahora y actualizarlo después
```
CORS_ORIGINS=
```

**Opción B:** Usar un placeholder (actualizar después del deploy del frontend)
```
CORS_ORIGINS=https://aura-frontend.onrender.com
```

**IMPORTANTE:** Después de deployar el frontend, actualiza esta variable con la URL real que te dé Render.

### 6. GEMINI_API_KEY (Opcional)
**Solo si usas el asistente IA:**
```
GEMINI_API_KEY=
```
Déjalo vacío si no lo usas.

---

## 📋 Resumen - Variables para el Backend en Render:

```
DATABASE_URL=postgresql://aura_user:BeLr0hbo80D51ELq0o8LiKeiIILWOLqm@dpg-d5dcdt6uk2gs738tfu30-a/aura_8j01
JWT_SECRET_KEY=<GENERA_UNA_CLAVE_SECRETA_AQUI>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
CORS_ORIGINS=https://aura-frontend.onrender.com
GEMINI_API_KEY=
```

---

## 📋 Variables para el Frontend en Render:

**Solo necesitas 1 variable:**
```
VITE_API_URL=https://aura-backend.onrender.com
```

(Reemplaza `aura-backend.onrender.com` con la URL real que te dé Render para el backend)

