-- Aditiva: ejecutar en la base seleccionada; no elimina datos.
CREATE TABLE IF NOT EXISTS operaciones_sincronizadas (
 negocio_id INT NOT NULL,
 usuario_id INT NOT NULL,
 clave VARCHAR(64) NOT NULL,
 huella CHAR(64) NOT NULL,
 respuesta LONGTEXT NULL,
 creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (negocio_id, usuario_id, clave),
 FOREIGN KEY (negocio_id) REFERENCES negocios(id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;
