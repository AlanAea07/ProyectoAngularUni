<?php
require_once 'config.php';
$usuario = requireAuth($pdo);
requireRole($usuario, ['admin', 'vendedor']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit(); }
$clienteId = (int)($_GET['cliente_id'] ?? 0);
$sql = "SELECT m.id, m.cliente_id, c.nombre AS cliente_nombre, m.monto, m.detalle,
        m.creado_en, u.nombre AS registrado_por, 'fiado' AS tipo, NULL AS metodo_pago
        FROM movimientos_fiado m JOIN clientes c ON c.id = m.cliente_id JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.negocio_id = ? AND (? = 0 OR m.cliente_id = ?)
        UNION ALL
        SELECT p.id, p.cliente_id, c.nombre, p.monto, NULL, p.creado_en, u.nombre, 'pago', p.metodo_pago
        FROM pagos p JOIN clientes c ON c.id = p.cliente_id JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.negocio_id = ? AND (? = 0 OR p.cliente_id = ?)
        ORDER BY creado_en DESC, id DESC";
$stmt = $pdo->prepare($sql);
$stmt->execute([$usuario['negocio_id'], $clienteId, $clienteId, $usuario['negocio_id'], $clienteId, $clienteId]);
$movimientos = $stmt->fetchAll();
foreach ($movimientos as &$m) { $m['monto'] = (float)$m['monto']; }
echo json_encode(['success' => true, 'movimientos' => $movimientos]);
