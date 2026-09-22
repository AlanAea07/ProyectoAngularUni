<?php
require_once "config.php";

$usuarioActual = requireAuth($pdo);
$negocioId = $usuarioActual['negocio_id'];

// Desactivar (el "eliminar") es un "cambio importante" -> solo admin.
requireRole($usuarioActual, ['admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit();
}

$body = getJsonBody();
$id = (int) ($body['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Falta el id del cliente"]);
    exit();
}

$stmt = $pdo->prepare("SELECT id FROM clientes WHERE id = :id AND negocio_id = :negocio_id AND activo = 1");
$stmt->execute(["id" => $id, "negocio_id" => $negocioId]);

if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Cliente no encontrado o ya estaba desactivado"]);
    exit();
}

// Nunca borramos la fila: solo apagamos la bandera. Así se conserva
// el historial de fiados/pagos ligado a este cliente.
$stmt = $pdo->prepare("UPDATE clientes SET activo = 0 WHERE id = :id AND negocio_id = :negocio_id");
$stmt->execute(["id" => $id, "negocio_id" => $negocioId]);

echo json_encode([
    "success" => true,
    "message" => "Cliente desactivado"
]);
