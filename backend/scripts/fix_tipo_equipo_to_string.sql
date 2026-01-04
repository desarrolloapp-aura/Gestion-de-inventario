-- Script para cambiar la columna tipo de enum a VARCHAR en PostgreSQL
-- Ejecutar este script en Supabase SQL Editor

-- Paso 1: Crear una nueva columna temporal como VARCHAR
ALTER TABLE equipos ADD COLUMN tipo_temp VARCHAR;

-- Paso 2: Copiar los datos de la columna enum a la nueva columna VARCHAR
UPDATE equipos SET tipo_temp = tipo::text;

-- Paso 3: Eliminar la columna enum antigua
ALTER TABLE equipos DROP COLUMN tipo;

-- Paso 4: Renombrar la columna temporal al nombre original
ALTER TABLE equipos RENAME COLUMN tipo_temp TO tipo;

-- Paso 5: Hacer la columna NOT NULL
ALTER TABLE equipos ALTER COLUMN tipo SET NOT NULL;

-- Paso 6: (Opcional) Eliminar el tipo enum si ya no se usa
-- DROP TYPE tipo_equipo;

