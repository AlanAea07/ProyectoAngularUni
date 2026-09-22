<?php
require_once 'config.php'; require_once 'reportes_lib.php';
$u=requireAuth($pdo); requireRole($u,['admin','vendedor']); $n=(int)$u['negocio_id'];
if ($_SERVER['REQUEST_METHOD']==='GET') {
    $id=(int)($_GET['id']??0);
    if ($id) {
        $q=$pdo->prepare('SELECT archivo,fecha FROM reportes_diarios WHERE id=? AND negocio_id=?'); $q->execute([$id,$n]); $r=$q->fetch();
        if (!$r || !is_file(carpetaReportes().'/'.$r['archivo'])) { http_response_code(404); exit(json_encode(['success'=>false,'message'=>'Reporte no encontrado'])); }
        header('Content-Type: application/pdf'); header('Cache-Control: private, no-store'); header('X-Content-Type-Options: nosniff');
        header('Content-Disposition: attachment; filename="reporte-'.$r['fecha'].'.pdf"');
        readfile(carpetaReportes().'/'.$r['archivo']); exit;
    }
    $fecha=$_GET['fecha']??'';
    $q=$pdo->prepare('SELECT id,fecha,estado,corte,revision,generado_en FROM reportes_diarios WHERE negocio_id=? AND (?="" OR fecha=?) ORDER BY fecha DESC LIMIT 90');
    $q->execute([$n,$fecha,$fecha]); echo json_encode(['success'=>true,'reportes'=>$q->fetchAll()]); exit;
}
if ($_SERVER['REQUEST_METHOD']==='POST') {
    requireRole($u,['admin']); $b=getJsonBody();
    try { $id=generarReporte($pdo,$n,(string)($b['fecha']??date('Y-m-d'))); echo json_encode(['success'=>true,'id'=>$id]); }
    catch (InvalidArgumentException $e) { http_response_code(400); echo json_encode(['success'=>false,'message'=>$e->getMessage()]); }
    catch (Throwable $e) { error_log($e->getMessage()); http_response_code(500); echo json_encode(['success'=>false,'message'=>'No se pudo generar el reporte. Revisa el generador PDF y vuelve a intentar.']); }
    exit;
}
http_response_code(405);
