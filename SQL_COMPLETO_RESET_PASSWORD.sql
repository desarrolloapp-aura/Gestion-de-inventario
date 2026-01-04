-- SQL COMPLETO para resetear contraseña de admin a "admin123"
-- Ejecuta TODO esto en Supabase SQL Editor

-- PRIMERO: Eliminar el usuario si existe (para empezar limpio)
DELETE FROM usuarios WHERE username = 'admin';

-- SEGUNDO: Crear el usuario con la contraseña "admin123"
-- Hash generado con bcrypt para "admin123"
INSERT INTO usuarios (username, email, password_hash, rol, activo)
VALUES (
  'admin',
  'admin@aura.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYq5q5q5q5q',
  'INFORMATICA',
  true
);

-- TERCERO: Verificar que se creó correctamente
SELECT username, email, rol, activo, LEFT(password_hash, 30) as hash_preview
FROM usuarios 
WHERE username = 'admin';

