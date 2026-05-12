-- =========================================
-- BASE DE DATOS: TRAVELSPLIT
-- =========================================

-- =========================================
-- TABLA: usuarios
-- =========================================

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(64) NOT NULL,
    correo VARCHAR(64) UNIQUE NOT NULL,
    contrasena VARCHAR(256) NOT NULL
);

-- =========================================
-- TABLA: viajes
-- =========================================

CREATE TABLE viajes (
    id_viaje SERIAL PRIMARY KEY,
    nombre VARCHAR(128) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP

);

-- =========================================
-- TABLA: usuarios_viajes
-- =========================================

CREATE TABLE usuarios_viajes (
    id_usuario_viaje SERIAL PRIMARY KEY,
    id_viaje INT NOT NULL,
    id_usuario INT NOT NULL,
    balance NUMERIC(10,2) DEFAULT 0,
    rol VARCHAR(16) NOT NULL,



    CONSTRAINT fk_usuarios_viajes_viaje
        FOREIGN KEY (id_viaje)
        REFERENCES viajes(id_viaje)
        ON DELETE CASCADE,

    CONSTRAINT fk_usuarios_viajes_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT uq_usuario_viaje
        UNIQUE (id_viaje, id_usuario),

    CONSTRAINT chk_rol
        CHECK (rol IN ('admin', 'participante'))

);

-- =========================================
-- TABLA: gastos
-- =========================================

CREATE TABLE gastos (
    id_gasto SERIAL PRIMARY KEY,
    id_viaje INT NOT NULL,
    id_usuario INT NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    descripcion VARCHAR(256) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_gastos_viaje
        FOREIGN KEY (id_viaje)
        REFERENCES viajes(id_viaje)
        ON DELETE CASCADE,

    CONSTRAINT fk_gastos_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT chk_monto_gasto
        CHECK (monto > 0)

);

-- =========================================
-- TABLA: division_gastos
-- =========================================

CREATE TABLE division_gastos (
    id_division SERIAL PRIMARY KEY,
    id_gasto INT NOT NULL,
    id_usuario INT NOT NULL,
    monto NUMERIC(10,2) NOT NULL,

    CONSTRAINT fk_division_gasto
        FOREIGN KEY (id_gasto)
        REFERENCES gastos(id_gasto)
        ON DELETE CASCADE,

    CONSTRAINT fk_division_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT uq_gasto_usuario
        UNIQUE (id_gasto, id_usuario),

    CONSTRAINT chk_monto_division
        CHECK (monto >= 0)

);

-- =========================================
-- ÍNDICES 
-- =========================================

CREATE INDEX idx_gastos_viaje
ON gastos(id_viaje);

CREATE INDEX idx_gastos_usuario
ON gastos(id_usuario);

CREATE INDEX idx_division_gasto
ON division_gastos(id_gasto);

CREATE INDEX idx_division_usuario
ON division_gastos(id_usuario);

CREATE INDEX idx_usuarios_viajes_viaje
ON usuarios_viajes(id_viaje);

CREATE INDEX idx_usuarios_viajes_usuario
ON usuarios_viajes(id_usuario);