<?php
// Biblioteca interna: los endpoints deben autenticar antes de usarla.
function configuracionNegocio(PDO $pdo, int $negocio, bool $bloquear = false): array {
    $rangos = '[{"hasta":500,"color":"verde"},{"hasta":1200,"color":"amarillo"},{"hasta":2500,"color":"amarillo"},{"hasta":4000,"color":"naranja"},{"hasta":null,"color":"rojo"}]';
    $q = $pdo->prepare('INSERT IGNORE INTO configuracion_negocio (negocio_id,rangos_json,inicio_reportes) VALUES (?,?,CURRENT_DATE)');
    $q->execute([$negocio, $rangos]);
    $q = $pdo->prepare('SELECT * FROM configuracion_negocio WHERE negocio_id = ?' . ($bloquear ? ' FOR UPDATE' : ''));
    $q->execute([$negocio]);
    $c = $q->fetch();
    $c['limite_credito'] = (float)$c['limite_credito'];
    $c['rangos'] = json_decode($c['rangos_json'], true);
    $c['dias_alerta'] = 30;
    unset($c['rangos_json']);
    return $c;
}

function colorDeuda(float $saldo, array $rangos): string {
    foreach ($rangos as $r) {
        if ($r['hasta'] === null || $saldo <= (float)$r['hasta']) return $r['color'];
    }
    return 'rojo';
}

// Una sola consulta agregada por negocio, no una consulta extra por cada cliente.
function clientesConCredito(PDO $pdo, int $negocio, int $id = 0, string $buscar = ''): array {
    $config = configuracionNegocio($pdo, $negocio);
    $sql = "SELECT c.*, p.ultimo_abono, f.primer_fiado,
        COALESCE(p.ultimo_abono, f.primer_fiado, c.creado_en) AS referencia_desde,
        GREATEST(0,DATEDIFF(CURRENT_DATE,COALESCE(p.ultimo_abono,f.primer_fiado,c.creado_en))) AS dias_sin_abono
        FROM clientes c
        LEFT JOIN (SELECT cliente_id, MAX(creado_en) ultimo_abono FROM pagos WHERE negocio_id = ? GROUP BY cliente_id) p ON p.cliente_id=c.id
        LEFT JOIN (SELECT cliente_id, MIN(creado_en) primer_fiado FROM movimientos_fiado WHERE negocio_id = ? GROUP BY cliente_id) f ON f.cliente_id=c.id
        WHERE c.negocio_id = ?";
    $args = [$negocio,$negocio,$negocio];
    if ($id > 0) { $sql .= ' AND c.id = ?'; $args[] = $id; }
    else { $sql .= ' AND c.activo = 1 AND (c.nombre LIKE ? OR c.telefono LIKE ?)'; $args[] = "%$buscar%"; $args[] = "%$buscar%"; }
    $q = $pdo->prepare($sql . ' ORDER BY c.nombre'); $q->execute($args);
    $rows = $q->fetchAll();
    foreach ($rows as &$c) {
        $c['id'] = (int)$c['id']; $c['saldo'] = (float)$c['saldo']; $c['activo'] = (bool)$c['activo'];
        $c['dias_sin_abono'] = $c['saldo'] > 0 ? (int)$c['dias_sin_abono'] : 0;
        $c['alerta_antiguedad'] = $c['saldo'] > 0 && $c['dias_sin_abono'] > 30;
        $c['color_deuda'] = colorDeuda($c['saldo'], $config['rangos']);
        $c['limite_credito'] = $config['limite_credito'];
        $c['credito_disponible'] = max(0, round($config['limite_credito'] - $c['saldo'],2));
    }
    return $rows;
}
