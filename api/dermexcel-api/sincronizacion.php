<?php
// Guarda la respuesta y el cambio de negocio en la MISMA transacción.
// Sin cabecera se conserva el contrato de los clientes anteriores.
function iniciarOperacion(PDO $pdo, array $usuario, array $body): void {
    $clave = $_SERVER['HTTP_X_OPERACION_ID'] ?? '';
    if ($clave === '') return;
    if (!preg_match('/^[a-zA-Z0-9-]{16,64}$/D', $clave)) {
        http_response_code(400);
        exit(json_encode(['success'=>false, 'message'=>'Identificador de operación inválido.']));
    }
    $huella = hash('sha256', $_SERVER['REQUEST_METHOD'].'|'.basename($_SERVER['SCRIPT_NAME']).'|'.json_encode($body));
    $identidad = [$usuario['negocio_id'], $usuario['id'], $clave];
    try {
        $pdo->beginTransaction();
        try {
            $q = $pdo->prepare('INSERT INTO operaciones_sincronizadas (negocio_id,usuario_id,clave,huella) VALUES (?,?,?,?)');
            $q->execute([...$identidad, $huella]);
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) !== 1062) throw $e;
            // La clave única espera a que termine cualquier envío concurrente.
            $q = $pdo->prepare('SELECT huella,respuesta FROM operaciones_sincronizadas WHERE negocio_id=? AND usuario_id=? AND clave=? FOR UPDATE');
            $q->execute($identidad);
            $previa = $q->fetch();
            $pdo->rollBack();
            if (!$previa || $previa['huella'] !== $huella || !$previa['respuesta']) {
                http_response_code(409);
                exit(json_encode(['success'=>false, 'message'=>'La operación ya tiene otros datos. Revisa el historial.']));
            }
            exit($previa['respuesta']);
        }
        $GLOBALS['operacion_sync'] = $identidad;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log($e->getMessage());
        http_response_code(503);
        exit(json_encode(['success'=>false, 'message'=>'Sincronización no disponible. Verifica la migración 003 del servidor.']));
    }
}

function confirmarOperacion(PDO $pdo, array $respuesta): void {
    $json = json_encode($respuesta, JSON_THROW_ON_ERROR);
    if (isset($GLOBALS['operacion_sync'])) {
        $q = $pdo->prepare('UPDATE operaciones_sincronizadas SET respuesta=? WHERE negocio_id=? AND usuario_id=? AND clave=?');
        $q->execute([$json, ...$GLOBALS['operacion_sync']]);
    }
    if ($pdo->inTransaction()) $pdo->commit();
    echo $json;
}
