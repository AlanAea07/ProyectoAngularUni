<?php
require_once 'config.php';
$u=requireAuth($pdo); requireRole($u,['admin','vendedor']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit; }
$n=$u['negocio_id'];
$inicio=date('Y-m-d').' 00:00:00'; $fin=date('Y-m-d',strtotime('+1 day')).' 00:00:00';
$pdo->beginTransaction();
$q=$pdo->prepare('SELECT COALESCE(SUM(saldo),0) deuda_total,COALESCE(SUM(saldo>0),0) clientes_con_deuda FROM clientes WHERE negocio_id=?'); $q->execute([$n]); $r=$q->fetch();
$r['deuda_total']=(float)$r['deuda_total']; $r['clientes_con_deuda']=(int)$r['clientes_con_deuda'];
foreach (['movimientos_fiado'=>'fiados','pagos'=>'abonos'] as $tabla=>$tipo) {
    $q=$pdo->prepare("SELECT COUNT(*) cantidad,COALESCE(SUM(monto),0) monto FROM $tabla WHERE negocio_id=? AND creado_en>=? AND creado_en<?");
    $q->execute([$n,$inicio,$fin]); $v=$q->fetch();
    $r[$tipo.'_cantidad']=(int)$v['cantidad']; $r[$tipo.'_monto']=(float)$v['monto'];
}
$pdo->commit();
$r['fiados_hoy']=$r['fiados_cantidad']; $r['abonos_hoy']=$r['abonos_monto'];
$r['fecha']=date('Y-m-d'); $r['zona_horaria']='America/Mexico_City';
echo json_encode(['success'=>true,'resumen'=>$r]);
