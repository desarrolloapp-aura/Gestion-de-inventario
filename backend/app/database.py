from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Crear engine de SQLAlchemy para Supabase PostgreSQL
# Usar connect_args para manejar mejor los errores de conexión
# pool_pre_ping verifica la conexión antes de usarla
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "connect_timeout": 5,  # Timeout de conexión más corto
        "sslmode": "require",  # Supabase requiere SSL
    },
    echo=False,  # Cambiar a True para ver las queries SQL
    pool_timeout=10,  # Timeout para obtener conexión del pool
    pool_recycle=3600,  # Reciclar conexiones cada hora
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency para obtener sesión de base de datos"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

