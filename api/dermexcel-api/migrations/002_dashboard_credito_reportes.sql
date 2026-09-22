-- Migración aditiva. Ejecutar en la base seleccionada, sin USE fijo.
CREATE TABLE IF NOT EXISTS configuracion_negocio (
 negocio_id INT PRIMARY KEY,
 limite_credito DECIMAL(10,2) NOT NULL DEFAULT 10000.00,
 rangos_json TEXT NOT NULL,
 inicio_reportes DATE NOT NULL,
 actualizado_por INT NULL,
 actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (negocio_id) REFERENCES negocios(id),
 FOREIGN KEY (actualizado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;
INSERT IGNORE INTO configuracion_negocio (negocio_id, rangos_json, inicio_reportes)
SELECT id, '[{"hasta":500,"color":"verde"},{"hasta":1200,"color":"amarillo"},{"hasta":2500,"color":"amarillo"},{"hasta":4000,"color":"naranja"},{"hasta":null,"color":"rojo"}]', CURRENT_DATE FROM negocios;

CREATE TABLE IF NOT EXISTS configuracion_auditoria (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 negocio_id INT NOT NULL, usuario_id INT NOT NULL,
 anterior_json TEXT NOT NULL, nuevo_json TEXT NOT NULL,
 creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (negocio_id) REFERENCES negocios(id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seguimiento_deuda (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 negocio_id INT NOT NULL, cliente_id INT NOT NULL, fecha DATE NOT NULL,
 dias_sin_abono INT NOT NULL, saldo DECIMAL(10,2) NOT NULL,
 referencia_desde DATETIME NOT NULL,
 creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_seguimiento (negocio_id, cliente_id, fecha),
 FOREIGN KEY (negocio_id) REFERENCES negocios(id),
 FOREIGN KEY (cliente_id) REFERENCES clientes(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reportes_diarios (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, negocio_id INT NOT NULL, fecha DATE NOT NULL,
 estado ENUM('provisional','completo') NOT NULL,
 corte DATETIME NOT NULL, snapshot_json LONGTEXT NOT NULL,
 archivo VARCHAR(180) NOT NULL, revision INT NOT NULL DEFAULT 1,
 generado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_reporte (negocio_id, fecha),
 FOREIGN KEY (negocio_id) REFERENCES negocios(id)
) ENGINE=InnoDB;
