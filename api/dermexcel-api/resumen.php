<?php
require_once 'config.php';
$usuario = requireAuth($pdo);
requireRole($usuario, ['admin', 'vendedor']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit(); }
$stmt = $pdo->prepare('SELECT COALESCE(SUM(saldo),0) AS deuda_total, COALESCE(SUM(saldo > 0),0) AS clientes_con_deuda FROM clientes WHERE negocio_id = ?');
$stmt->execute([$usuario['negocio_id']]);
$resumen = $stmt->fetch();
$stmt = $pdo->prepare('SELECT COUNT(*) FROM movimientos_fiado WHERE negocio_id = ? AND creado_en >= CURRENT_DATE');
$stmt->execute([$usuario['negocio_id']]);
$resumen['fiados_hoy'] = (int)$stmt->fetchColumn();
$stmt = $pdo->prepare('SELECT COALESCE(SUM(monto),0) FROM pagos WHERE negocio_id = ? AND creado_en >= CURRENT_DATE');
$stmt->execute([$usuario['negocio_id']]);
$resumen['abonos_hoy'] = (float)$stmt->fetchColumn();
echo json_encode(['success' => true, 'resumen' => $resumen]);
