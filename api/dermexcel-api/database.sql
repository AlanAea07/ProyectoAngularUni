-- ============================================================
-- BASE DE DATOS: fiados_saas
-- Versión SaaS multi-negocio con roles.
-- Impórtala en phpMyAdmin (pestaña "Importar"), reemplaza la BD anterior.
-- ============================================================

CREATE DATABASE fiados_saas CHARACTER SET utf8mb4;
USE fiados_saas;

-- ============================================================
-- NEGOCIOS (el "tenant" del SaaS: cada tienda que contrata el sistema)
-- ============================================================
CREATE TABLE negocios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- USUARIOS (login a la app: vendedores y admins de cada negocio)
-- rol: 'admin' | 'vendedor' | 'cliente'
--   - admin: acceso completo (editar/desactivar clientes, CRUD de usuarios, etc.)
--   - vendedor: puede registrar clientes y fiados, NO puede editar/desactivar
--     clientes ni tocar usuarios (eso son "cambios importantes")
--   - cliente: reservado a futuro para un portal de autoconsulta; hoy no
--     se usa (los clientes de la tienda no entran a la app todavía)
-- ============================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    negocio_id INT NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol ENUM('admin', 'vendedor', 'cliente') NOT NULL DEFAULT 'vendedor',
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (negocio_id) REFERENCES negocios(id)
);

-- ============================================================
-- SESIONES (tokens de login)
-- ============================================================
CREATE TABLE sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ============================================================
-- CLIENTES (la cartera de fiados de cada negocio)
-- ============================================================
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    negocio_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) DEFAULT NULL,
    saldo DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- cacheado, lo mantienen los triggers
    activo TINYINT(1) NOT NULL DEFAULT 1,      -- 1 = activo, 0 = "eliminado" (soft delete)
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (negocio_id) REFERENCES negocios(id),
    INDEX idx_clientes_negocio_activo (negocio_id, activo)
);

-- ============================================================
-- MOVIMIENTOS_FIADO (historial de cargos a la deuda)
-- Es un LEDGER: nunca se edita ni se borra una fila, solo se insertan
-- nuevas. Cada fiado nuevo es un renglón más, el historial completo
-- se conserva siempre. Los triggers de abajo lo bloquean a nivel BD.
-- ============================================================
CREATE TABLE movimientos_fiado (
    id INT AUTO_INCREMENT PRIMARY KEY,
    negocio_id INT NOT NULL,
    cliente_id INT NOT NULL,
    usuario_id INT NOT NULL, -- vendedor/admin que lo registró
    detalle VARCHAR(255) DEFAULT NULL, -- qué se llevó, opcional
    monto DECIMAL(10,2) NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (negocio_id) REFERENCES negocios(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_fiado_cliente_fecha (cliente_id, creado_en)
);

-- ============================================================
-- PAGOS (abonos / liquidaciones) — mismo patrón de negocio_id.
-- El módulo de endpoints para esto se hace en la siguiente etapa.
-- ============================================================
CREATE TABLE pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    negocio_id INT NOT NULL,
    cliente_id INT NOT NULL,
    usuario_id INT NOT NULL, -- vendedor/admin que recibió el pago
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('efectivo', 'transferencia') NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (negocio_id) REFERENCES negocios(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_pago_cliente_fecha (cliente_id, creado_en)
);

-- ============================================================
-- TRIGGERS: mantener el saldo del cliente al día
-- ============================================================
DELIMITER //

CREATE TRIGGER trg_fiado_after_insert
AFTER INSERT ON movimientos_fiado
FOR EACH ROW
BEGIN
    UPDATE clientes SET saldo = saldo + NEW.monto WHERE id = NEW.cliente_id;
END //

CREATE TRIGGER trg_pago_after_insert
AFTER INSERT ON pagos
FOR EACH ROW
BEGIN
    UPDATE clientes SET saldo = saldo - NEW.monto WHERE id = NEW.cliente_id;
END //

-- ============================================================
-- TRIGGERS: bloquear a nivel de base de datos cualquier intento
-- de editar o borrar un movimiento de fiado ya registrado.
-- Así, aunque alguien se conecte directo a MySQL (no solo desde el
-- API), el historial de fiados no se puede alterar ni borrar.
-- ============================================================
CREATE TRIGGER trg_fiado_no_update
BEFORE UPDATE ON movimientos_fiado
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'No se pueden modificar movimientos de fiado: son historial inmutable';
END //

CREATE TRIGGER trg_fiado_no_delete
BEFORE DELETE ON movimientos_fiado
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'No se pueden eliminar movimientos de fiado: son historial inmutable';
END //

DELIMITER ;

-- ============================================================
-- DATOS DE EJEMPLO
-- ============================================================

-- Negocio demo (tu miscelánea de siempre)
INSERT INTO negocios (id, nombre) VALUES (1, 'Miscelánea Demo');

-- Usuarios de prueba, ambos password = "password"
-- (mismo hash bcrypt que ya usabas)
INSERT INTO usuarios (negocio_id, usuario, password, nombre, rol) VALUES
(1, 'admin',    '$2y$10$92IXUNpkjO0rOQ5byMi.YeIe.8Zh4Xj/47dxOL3TvQ8oO8VgYWEnW', 'Admin Demo',    'admin'),
(1, 'vendedor', '$2y$10$92IXUNpkjO0rOQ5byMi.YeIe.8Zh4Xj/47dxOL3TvQ8oO8VgYWEnW', 'Vendedor Demo', 'vendedor');

-- Clientes de ejemplo del negocio demo
INSERT INTO clientes (negocio_id, nombre, telefono, saldo) VALUES
(1, 'Juan Pérez',      '6181234567', 0.00),
(1, 'María López',     NULL,         0.00),
(1, 'Pedro Hernández', '6187654321', 0.00);

-- Solo instalaciones nuevas. Ejecutar migrations/001_pagos.sql despues.
