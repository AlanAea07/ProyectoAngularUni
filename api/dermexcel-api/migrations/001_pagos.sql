-- Migración aditiva para la BD existente. No ejecutar database.sql sobre datos existentes.
USE fiados_saas;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS clave_operacion VARCHAR(64) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pago_operacion ON pagos (negocio_id, clave_operacion);
DELIMITER //
CREATE OR REPLACE TRIGGER trg_pago_no_update BEFORE UPDATE ON pagos FOR EACH ROW
BEGIN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se pueden modificar pagos del historial';
END //
CREATE OR REPLACE TRIGGER trg_pago_no_delete BEFORE DELETE ON pagos FOR EACH ROW
BEGIN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se pueden eliminar pagos del historial';
END //
DELIMITER ;
