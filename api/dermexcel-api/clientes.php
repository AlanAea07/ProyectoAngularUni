<?php
require_once "config.php";

$usuarioActual = requireAuth($pdo);
requireRole($usuarioActual, ['admin', 'vendedor']);
$negocioId = $usuarioActual['negocio_id'];

$metodo = $_SERVER['REQUEST_METHOD'];

// ============================================================
// GET /clientes.php                -> lista clientes activos del negocio
// GET /clientes.php?buscar=x       -> filtra por nombre
// GET /clientes.php?id=5           -> un solo cliente (para cliente-detalle)
// ============================================================
if ($metodo === 'GET') {

    $id = (int) ($_GET['id'] ?? 0);

    if ($id > 0) {
        $stmt = $pdo->prepare(
            "SELECT id, nombre, telefono, saldo, activo
             FROM clientes
             WHERE id = :id AND negocio_id = :negocio_id
             LIMIT 1"
        );
        $stmt->execute(["id" => $id, "negocio_id" => $negocioId]);
        $cliente = $stmt->fetch();

        if (!$cliente) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Cliente no encontrado"]);
            exit();
        }

        $cliente['saldo'] = (float) $cliente['saldo'];
        $cliente['activo'] = (bool) $cliente['activo'];

        echo json_encode(["success" => true, "cliente" => $cliente]);
        exit();
    }

    $buscar = trim($_GET['buscar'] ?? '');

    if ($buscar !== '') {
        $stmt = $pdo->prepare(
            "SELECT id, nombre, telefono, saldo, activo
             FROM clientes
             WHERE negocio_id = :negocio_id AND activo = 1 AND nombre LIKE :buscar
             ORDER BY nombre ASC"
        );
        $stmt->execute(["negocio_id" => $negocioId, "buscar" => "%$buscar%"]);
    } else {
        $stmt = $pdo->prepare(
            "SELECT id, nombre, telefono, saldo, activo
             FROM clientes
             WHERE negocio_id = :negocio_id AND activo = 1
             ORDER BY nombre ASC"
        );
        $stmt->execute(["negocio_id" => $negocioId]);
    }

    $clientes = $stmt->fetchAll();

    foreach ($clientes as &$c) {
        $c['saldo'] = (float) $c['saldo'];
        $c['activo'] = (bool) $c['activo'];
    }

    echo json_encode([
        "success"  => true,
        "clientes" => $clientes
    ]);
    exit();
}

// ============================================================
// POST /clientes.php -> crear un cliente nuevo
// Permitido a vendedor y admin (no es un "cambio importante").
// body: { "nombre": "Juan Pérez", "telefono": "6181234567" }
// ============================================================
if ($metodo === 'POST') {

    requireRole($usuarioActual, ['admin', 'vendedor']);

    $body = getJsonBody();

    $nombre   = trim($body['nombre'] ?? '');
    $telefono = trim($body['telefono'] ?? '');

    if ($nombre === '') {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "El nombre es obligatorio"]);
        exit();
    }

    $stmt = $pdo->prepare(
        "INSERT INTO clientes (negocio_id, nombre, telefono, saldo, activo)
         VALUES (:negocio_id, :nombre, :telefono, 0.00, 1)"
    );
    $stmt->execute([
        "negocio_id" => $negocioId,
        "nombre"     => $nombre,
        "telefono"   => $telefono !== '' ? $telefono : null,
    ]);

    $nuevoId = (int) $pdo->lastInsertId();

    echo json_encode([
        "success" => true,
        "cliente" => [
            "id"       => $nuevoId,
            "nombre"   => $nombre,
            "telefono" => $telefono !== '' ? $telefono : null,
            "saldo"    => 0.00,
            "activo"   => true,
        ]
    ]);
    exit();
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Método no permitido"]);
