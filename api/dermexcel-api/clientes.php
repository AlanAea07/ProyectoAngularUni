<?php
require_once "config.php";
require_once "credito.php";

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
    $id = (int)($_GET['id'] ?? 0);
    $rows = clientesConCredito($pdo, (int)$negocioId, $id, trim($_GET['buscar'] ?? ''));
    if ($id > 0) {
        if (!$rows) { http_response_code(404); exit(json_encode(['success'=>false,'message'=>'Cliente no encontrado'])); }
        $q=$pdo->prepare('SELECT fecha,dias_sin_abono,saldo,referencia_desde FROM seguimiento_deuda WHERE negocio_id=? AND cliente_id=? ORDER BY fecha DESC LIMIT 30');
        $q->execute([$negocioId,$id]);
        $rows[0]['seguimiento']=$q->fetchAll();
        echo json_encode(['success'=>true,'cliente'=>$rows[0]]);
    } else { echo json_encode(['success'=>true,'clientes'=>$rows]); }
    exit;
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
