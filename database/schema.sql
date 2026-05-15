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
-- TABLA: password_reset_tokens
-- =========================================

CREATE TABLE password_reset_tokens (
    id_token SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

-- =========================================
-- TABLA: categorias
-- =========================================
CREATE TABLE categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(256) NOT NULL,
    tipo VARCHAR(16) NOT NULL,

    CONSTRAINT chk_tipo_categoria
        CHECK (tipo IN ('viaje', 'gasto'))
);

-- =========================================
-- TABLA: viajes
-- =========================================

CREATE TABLE viajes (
    id_viaje SERIAL PRIMARY KEY,
    nombre VARCHAR(128) NOT NULL,
    id_categoria INT,
    id_usuario_creador INT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_viajes_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria)
        ON DELETE SET NULL,
        
    CONSTRAINT fk_viajes_usuario_creador
        FOREIGN KEY (id_usuario_creador)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
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
    id_categoria INT,
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

    CONSTRAINT fk_gastos_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria)
        ON DELETE SET NULL,

    CONSTRAINT chk_monto_gasto
        CHECK (monto > 0)
);

-- =========================================
-- TABLA: division_gastos
-- =========================================

CREATE TABLE division_gastos (
    id_division SERIAL PRIMARY KEY,
    id_gasto INT NOT NULL,
    nombre VARCHAR(128) NOT NULL,
    monto_total NUMERIC(10,2) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_division_gasto
        FOREIGN KEY (id_gasto)
        REFERENCES gastos(id_gasto)
        ON DELETE CASCADE,

    CONSTRAINT chk_monto_total_division
        CHECK (monto_total > 0)
);

-- =========================================
-- TABLA: division_gastos_participantes
-- =========================================

CREATE TABLE division_gastos_participantes (
    id_participante SERIAL PRIMARY KEY,
    id_division INT NOT NULL,
    id_usuario INT NOT NULL,
    monto NUMERIC(10,2) NOT NULL,

    CONSTRAINT fk_div_part_division
        FOREIGN KEY (id_division)
        REFERENCES division_gastos(id_division)
        ON DELETE CASCADE,

    CONSTRAINT fk_div_part_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT uq_division_usuario_part
        UNIQUE (id_division, id_usuario),

    CONSTRAINT chk_monto_participante
        CHECK (monto > 0)
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

CREATE INDEX idx_div_part_division
ON division_gastos_participantes(id_division);

CREATE INDEX idx_div_part_usuario
ON division_gastos_participantes(id_usuario);

CREATE INDEX idx_usuarios_viajes_viaje
ON usuarios_viajes(id_viaje);

CREATE INDEX idx_usuarios_viajes_usuario
ON usuarios_viajes(id_usuario);

CREATE INDEX idx_viajes_categoria
ON viajes(id_categoria);

CREATE INDEX idx_gastos_categoria
ON gastos(id_categoria);

CREATE INDEX idx_password_reset_usuario
ON password_reset_tokens(id_usuario);

CREATE INDEX idx_password_reset_token_hash
ON password_reset_tokens(token_hash);
