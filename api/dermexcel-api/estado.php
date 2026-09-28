<?php
// Comprobación pública mínima: no devuelve clientes, credenciales ni detalles SQL.
require_once __DIR__ . '/config.php';
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit; }
echo json_encode(['success' => true]);
