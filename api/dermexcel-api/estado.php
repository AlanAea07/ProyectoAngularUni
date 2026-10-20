<?php
// Comprobación pública mínima: no devuelve clientes, credenciales ni detalles SQL.
require_once __DIR__ . '/config.php';
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit; }
// Evita enviar una cola a una API antigua o sin la migración de idempotencia.
$sincronizacion = 0;
try {
    $pdo->query('SELECT clave FROM operaciones_sincronizadas LIMIT 0');
    $sincronizacion = 1;
} catch (PDOException $e) { /* La consulta normal sigue disponible. */ }
echo json_encode(['success' => true, 'sincronizacion' => $sincronizacion]);
