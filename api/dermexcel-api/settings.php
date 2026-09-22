<?php
require_once 'config.php';
require_once 'credito.php';
$u = requireAuth($pdo);
requireRole($u, ['admin']);
$negocio = (int)$u['negocio_id'];
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $q = $pdo->prepare('SELECT a.id,a.anterior_json,a.nuevo_json,a.creado_en,u.nombre AS registrado_por FROM configuracion_auditoria a JOIN usuarios u ON u.id=a.usuario_id WHERE a.negocio_id=? ORDER BY a.id DESC LIMIT 30');
    $q->execute([$negocio]);
    echo json_encode(['success'=>true,'configuracion'=>configuracionNegocio($pdo,$negocio),'historial'=>$q->fetchAll()]); exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
$b = getJsonBody(); $limite = $b['limite_credito'] ?? null; $rangos = $b['rangos'] ?? null;
$valido = is_numeric($limite) && preg_match('/^\d{1,8}(\.\d{1,2})?$/D',(string)$limite) && $limite > 0 && is_array($rangos) && count($rangos) === 5;
$previo = 0;
if ($valido) foreach ($rangos as $i=>$r) {
    if (!is_array($r) || !in_array($r['color'] ?? '', ['verde','amarillo','naranja','rojo'],true) || !array_key_exists('hasta',$r)) { $valido=false; break; }
    if ($i === 4) { if ($r['hasta'] !== null) $valido=false; }
    elseif (!is_numeric($r['hasta']) || !preg_match('/^\d{1,8}(\.\d{1,2})?$/D',(string)$r['hasta']) || $r['hasta'] <= $previo || $r['hasta'] >= $limite) { $valido=false; }
    else { $previo = $r['hasta']; }
}
if (!$valido) { http_response_code(400); exit(json_encode(['success'=>false,'message'=>'Los cuatro límites deben ser positivos, ascendentes y menores al crédito máximo. El último tramo no lleva límite.'])); }
try {
    $pdo->beginTransaction();
    $anterior = configuracionNegocio($pdo,$negocio,true);
    $q=$pdo->prepare('UPDATE configuracion_negocio SET limite_credito=?,rangos_json=?,actualizado_por=?,actualizado_en=NOW() WHERE negocio_id=?');
    $q->execute([$limite,json_encode($rangos),$u['id'],$negocio]);
    $nuevo=configuracionNegocio($pdo,$negocio);
    $q=$pdo->prepare('INSERT INTO configuracion_auditoria (negocio_id,usuario_id,anterior_json,nuevo_json) VALUES (?,?,?,?)');
    $q->execute([$negocio,$u['id'],json_encode($anterior),json_encode($nuevo)]);
    $pdo->commit(); echo json_encode(['success'=>true,'configuracion'=>$nuevo]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack(); error_log($e->getMessage());
    http_response_code(500); echo json_encode(['success'=>false,'message'=>'No se pudieron guardar los ajustes.']);
}
