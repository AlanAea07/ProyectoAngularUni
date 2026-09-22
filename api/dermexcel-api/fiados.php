<?php
require_once "config.php";
require_once "credito.php";

$usuarioActual = requireAuth($pdo);
requireRole($usuarioActual, ['admin', 'vendedor']);
$negocioId = $usuarioActual['negocio_id'];

$metodo = $_SERVER['REQUEST_METHOD'];

// ============================================================
// GET /fiados.php?cliente_id=5 -> historial completo de fiados
// de ese cliente, del más reciente al más viejo. No hay forma de
// editar ni borrar renglones desde aquí: es solo lectura.
// ============================================================
if ($metodo === 'GET') {

    $clienteId = (int) ($_GET['cliente_id'] ?? 0);

    if ($clienteId <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Falta cliente_id"]);
        exit();
    }

    // Nos aseguramos de que el cliente sea de este negocio antes de
    // enseñar nada de su historial.
    $stmt = $pdo->prepare("SELECT id FROM clientes WHERE id = :id AND negocio_id = :negocio_id");
    $stmt->execute(["id" => $clienteId, "negocio_id" => $negocioId]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Cliente no encontrado"]);
        exit();
    }

    $stmt = $pdo->prepare(
        "SELECT mf.id, mf.detalle, mf.monto, mf.creado_en, u.nombre AS registrado_por
         FROM movimientos_fiado mf
         JOIN usuarios u ON u.id = mf.usuario_id
         WHERE mf.cliente_id = :cliente_id AND mf.negocio_id = :negocio_id
         ORDER BY mf.creado_en DESC, mf.id DESC"
    );
    $stmt->execute(["cliente_id" => $clienteId, "negocio_id" => $negocioId]);
    $fiados = $stmt->fetchAll();

    foreach ($fiados as &$f) {
        $f['monto'] = (float) $f['monto'];
    }

    echo json_encode([
        "success" => true,
        "fiados"  => $fiados
    ]);
    exit();
}

// ============================================================
// POST /fiados.php -> registrar un fiado nuevo
// Permitido a vendedor y admin. Solo INSERTA: nunca hay edición ni
// borrado de un fiado ya guardado (bloqueado también por triggers
// en la base de datos, como doble seguro).
// body: { "cliente_id": 5, "monto": 150.00, "detalle": "2 refrescos y pan" }
// ============================================================
if ($metodo === 'POST') {

    requireRole($usuarioActual, ['admin', 'vendedor']);

    $body = getJsonBody();

    $clienteId = (int) ($body['cliente_id'] ?? 0);
    $monto     = (string) ($body['monto'] ?? '');
    $detalle   = trim($body['detalle'] ?? '');

    if ($clienteId <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Falta cliente_id"]);
        exit();
    }

    if (!preg_match('/^\d{1,8}(\.\d{1,2})?$/D', $monto) || (float)$monto <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "El monto debe ser mayor a 0"]);
        exit();
    }

    try {
    $pdo->beginTransaction();
    $config = configuracionNegocio($pdo, (int)$negocioId, true);
    // Mismo bloqueo de cliente que pagos: el límite se verifica sobre el saldo vigente.
    $stmt = $pdo->prepare('SELECT id,saldo FROM clientes WHERE id=? AND negocio_id=? AND activo=1 FOR UPDATE');
    $stmt->execute([$clienteId,$negocioId]);
    $cliente=$stmt->fetch();
    if (!$cliente) { $pdo->rollBack(); http_response_code(404); exit(json_encode(['success'=>false,'message'=>'Cliente no encontrado'])); }
    if ((int)round((float)$cliente['saldo']*100) + (int)round((float)$monto*100) > (int)round($config['limite_credito']*100)) {
        $pdo->rollBack(); http_response_code(409);
        exit(json_encode(['success'=>false,'message'=>'Este fiado supera el límite de crédito del cliente. Disponible: $'.number_format(max(0,$config['limite_credito']-$cliente['saldo']),2)]));
    }

    $stmt = $pdo->prepare(
        "INSERT INTO movimientos_fiado (negocio_id, cliente_id, usuario_id, detalle, monto, creado_en)
         VALUES (:negocio_id, :cliente_id, :usuario_id, :detalle, :monto, NOW())"
    );
    $stmt->execute([
        "negocio_id" => $negocioId,
        "cliente_id" => $clienteId,
        "usuario_id" => $usuarioActual['id'],
        "detalle"    => $detalle !== '' ? $detalle : null,
        "monto"      => $monto,
    ]);

    $nuevoId = (int) $pdo->lastInsertId();

    // El trigger trg_fiado_after_insert ya sumó el monto al saldo del
    // cliente; lo regresamos actualizado para que la app no tenga que
    // volver a pedirlo.
    $stmt = $pdo->prepare("SELECT saldo FROM clientes WHERE id = :id");
    $stmt->execute(["id" => $clienteId]);
    $saldoActual = (float) $stmt->fetchColumn();

    $pdo->commit();
    echo json_encode([
        "success" => true,
        "fiado" => [
            "id"              => $nuevoId,
            "cliente_id"      => $clienteId,
            "detalle"         => $detalle !== '' ? $detalle : null,
            "monto"           => $monto,
            "registrado_por"  => $usuarioActual['nombre'],
        ],
        "saldo_actualizado" => $saldoActual,
    ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack(); error_log($e->getMessage());
        http_response_code(500); echo json_encode(['success'=>false,'message'=>'No se pudo registrar el fiado.']);
    }
    exit();
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Método no permitido"]);
