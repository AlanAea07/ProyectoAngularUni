<?php
require_once 'config.php';
$usuario = requireAuth($pdo);
requireRole($usuario, ['admin', 'vendedor']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['success' => false, 'message' => 'Método no permitido']));
}
$body = getJsonBody();
$clienteId = filter_var($body['cliente_id'] ?? null, FILTER_VALIDATE_INT);
$monto = (string) ($body['monto'] ?? '');
$metodo = $body['metodo_pago'] ?? '';
$clave = $body['clave_operacion'] ?? '';
if (!$clienteId || !preg_match('/^\d{1,8}(\.\d{1,2})?$/D', $monto) || (float)$monto <= 0
    || !in_array($metodo, ['efectivo', 'transferencia'], true)
    || !is_string($clave) || !preg_match('/^[a-zA-Z0-9-]{16,64}$/D', $clave)) {
    http_response_code(400);
    exit(json_encode(['success' => false, 'message' => 'Revisa cliente, monto (máximo dos decimales) y método de pago.']));
}
try {
    $pdo->beginTransaction();
    // Serializa pagos del mismo cliente: dos cajeros no pueden gastar el mismo saldo.
    $stmt = $pdo->prepare('SELECT saldo FROM clientes WHERE id = ? AND negocio_id = ? FOR UPDATE');
    $stmt->execute([$clienteId, $usuario['negocio_id']]);
    $cliente = $stmt->fetch();
    if (!$cliente) {
        $pdo->rollBack();
        http_response_code(404);
        exit(json_encode(['success' => false, 'message' => 'Cliente no encontrado']));
    }
    $stmt = $pdo->prepare('SELECT id, cliente_id, monto, metodo_pago FROM pagos WHERE negocio_id = ? AND clave_operacion = ?');
    $stmt->execute([$usuario['negocio_id'], $clave]);
    $previo = $stmt->fetch();
    if ($previo) {
        if ((int)$previo['cliente_id'] !== $clienteId || $previo['monto'] != $monto || $previo['metodo_pago'] !== $metodo) {
            $pdo->rollBack();
            http_response_code(409);
            exit(json_encode(['success' => false, 'message' => 'La operación ya se usó con otros datos. Consulta el historial.']));
        }
        $pdo->commit();
        exit(json_encode(['success' => true, 'pago_id' => (int)$previo['id'], 'saldo_actualizado' => (float)$cliente['saldo']]));
    }
    if ((int)round((float)$monto * 100) > (int)round((float)$cliente['saldo'] * 100)) {
        $pdo->rollBack();
        http_response_code(409);
        exit(json_encode(['success' => false, 'message' => 'El pago supera el saldo actual. Actualiza el cliente antes de continuar.']));
    }
    $stmt = $pdo->prepare('INSERT INTO pagos (negocio_id, cliente_id, usuario_id, monto, metodo_pago, clave_operacion) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$usuario['negocio_id'], $clienteId, $usuario['id'], $monto, $metodo, $clave]);
    $id = (int)$pdo->lastInsertId();
    // El trigger existente descuenta el saldo una sola vez.
    $stmt = $pdo->prepare('SELECT saldo FROM clientes WHERE id = ? AND negocio_id = ?');
    $stmt->execute([$clienteId, $usuario['negocio_id']]);
    $saldo = (float)$stmt->fetchColumn();
    $pdo->commit();
    echo json_encode(['success' => true, 'pago_id' => $id, 'saldo_actualizado' => $saldo]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'No se pudo registrar el pago. Reintenta la misma operación.']);
}
