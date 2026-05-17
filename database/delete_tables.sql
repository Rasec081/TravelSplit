-- =========================================
-- ELIMINAR TODAS LAS TABLAS DEL PROYECTO
-- =========================================

DROP TABLE IF EXISTS public.division_gastos_participantes CASCADE;
DROP TABLE IF EXISTS public.division_gastos CASCADE;
DROP TABLE IF EXISTS public.gastos CASCADE;
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.usuarios_viajes CASCADE;
DROP TABLE IF EXISTS public.viajes CASCADE;
DROP TABLE IF EXISTS public.categorias CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;

-- =========================================
-- OPCIONAL:
-- ELIMINAR SEQUENCES GENERADAS POR SERIAL
-- (PostgreSQL normalmente las elimina solo)
-- =========================================

DROP SEQUENCE IF EXISTS usuarios_id_usuario_seq CASCADE;
DROP SEQUENCE IF EXISTS viajes_id_viaje_seq CASCADE;
DROP SEQUENCE IF EXISTS gastos_id_gasto_seq CASCADE;
DROP SEQUENCE IF EXISTS division_gastos_id_division_seq CASCADE;
DROP SEQUENCE IF EXISTS categorias_id_categoria_seq CASCADE;
