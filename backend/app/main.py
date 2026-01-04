from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .routers import auth, equipos, prestamos, trabajadores, alertas, reportes, config, estadisticas, asistente
# Importar modelos para asegurar que se registren en Base.metadata
from . import models  # noqa: F401
import time

# Crear tablas (en producción usar Alembic migrations)
# Solo crear si la conexión funciona (no bloquear inicio)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Advertencia: No se pudieron crear/verificar tablas: {e}")
    print("Asegurate de que Supabase este configurado correctamente")

app = FastAPI(
    title="Aura Minería - API",
    description="Sistema de gestión de equipos tecnológicos",
    version="1.0.0"
)

# CORS - Permitir orígenes específicos
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todos los orígenes en desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware para logging de peticiones
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    print(f"[REQUEST] {request.method} {request.url.path} - Inicio")
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        print(f"[REQUEST] {request.method} {request.url.path} - Completado en {process_time:.2f}s - Status: {response.status_code}")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        print(f"[REQUEST] {request.method} {request.url.path} - ERROR después de {process_time:.2f}s: {str(e)}")
        raise

# Routers
app.include_router(auth.router)
app.include_router(equipos.router)
app.include_router(prestamos.router)
app.include_router(trabajadores.router)
app.include_router(alertas.router)
app.include_router(reportes.router)
app.include_router(config.router)
app.include_router(estadisticas.router)
app.include_router(asistente.router)


@app.get("/")
def root():
    return {
        "message": "Aura Minería API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "ok"}

