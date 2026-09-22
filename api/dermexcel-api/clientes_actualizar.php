<?php
require_once "config.php";

$usuarioActual = requireAuth($pdo);
$negocioId = $usuarioActual['negocio_id'];

// Editar cliente es un "cambio importante" -> solo admin.
requireRole($usuarioActual, ['admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit();
}

$body = getJsonBody();

$id       = (int) ($body['id'] ?? 0);
$nombre   = trim($body['nombre'] ?? '');
$telefono = trim($body['telefono'] ?? '');

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Falta el id del cliente"]);
    exit();
}

if ($nombre === '') {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "El nombre es obligatorio"]);
    exit();
}

$stmt = $pdo->prepare("SELECT id FROM clientes WHERE id = :id AND negocio_id = :negocio_id AND activo = 1");
$stmt->execute(["id" => $id, "negocio_id" => $negocioId]);

if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Cliente no encontrado"]);
    exit();
}

$stmt = $pdo->prepare(
    "UPDATE clientes
     SET nombre = :nombre, telefono = :telefono
     WHERE id = :id AND negocio_id = :negocio_id"
);
$stmt->execute([
    "nombre"     => $nombre,
    "telefono"   => $telefono !== '' ? $telefono : null,
    "id"         => $id,
    "negocio_id" => $negocioId,
]);

$stmt = $pdo->prepare("SELECT id, nombre, telefono, saldo, activo FROM clientes WHERE id = :id");
$stmt->execute(["id" => $id]);
$cliente = $stmt->fetch();
$cliente['saldo'] = (float) $cliente['saldo'];
$cliente['activo'] = (bool) $cliente['activo'];

echo json_encode([
    "success" => true,
    "cliente" => $cliente
]);
