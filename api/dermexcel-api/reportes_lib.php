<?php
require_once __DIR__.'/credito.php';

function carpetaReportes(): string {
    $dir = getenv('FIADOS_REPORT_DIR') ?: dirname(__DIR__,2).'/fiados-private/reportes';
    if (!is_dir($dir) && !mkdir($dir,0700,true) && !is_dir($dir)) throw new RuntimeException('No se pudo crear la carpeta privada de reportes');
    return $dir;
}

function snapshotDiario(PDO $pdo,int $negocio,string $fecha,string $corte,string $estado): array {
    $inicio=$fecha.' 00:00:00';
    $q=$pdo->prepare('SELECT nombre FROM negocios WHERE id=?'); $q->execute([$negocio]);
    $s=['negocio_id'=>$negocio,'negocio'=>$q->fetchColumn(),'fecha'=>$fecha,'inicio'=>$inicio,'corte'=>$corte,'estado'=>$estado,'zona_horaria'=>'America/Mexico_City'];
    $totales=[];
    foreach (['pagos'=>'abonos','movimientos_fiado'=>'fiados'] as $tabla=>$tipo) {
        $extra=$tipo==='abonos' ? 'm.metodo_pago, NULL AS detalle' : 'NULL AS metodo_pago,m.detalle';
        $q=$pdo->prepare("SELECT m.id,m.cliente_id,c.nombre cliente,m.monto,m.creado_en,u.nombre vendedor,$extra
            FROM $tabla m JOIN clientes c ON c.id=m.cliente_id JOIN usuarios u ON u.id=m.usuario_id
            WHERE m.negocio_id=? AND m.creado_en>=? AND m.creado_en<? ORDER BY m.creado_en,m.id");
        $q->execute([$negocio,$inicio,$corte]); $s[$tipo]=$q->fetchAll();
        $totales[$tipo]=0;
        foreach ($s[$tipo] as &$r) { $r['monto']=(float)$r['monto']; $totales[$tipo]+=(int)round($r['monto']*100); }
        unset($r); $totales[$tipo]/=100;
    }
    // Reconstruir el saldo a la hora de corte, aunque el reporte se regenere días después.
    // Resta cargos posteriores y reincorpora pagos posteriores al saldo almacenado.
    $q=$pdo->prepare("SELECT c.id,c.nombre,c.activo,c.creado_en,
        c.saldo-COALESCE(f.despues,0)+COALESCE(p.despues,0) saldo,
        COALESCE(p.ultimo,f.primero,c.creado_en) referencia_desde, p.ultimo ultimo_abono
        FROM clientes c
        LEFT JOIN (SELECT cliente_id,SUM(CASE WHEN creado_en>=? THEN monto ELSE 0 END) despues,
            MIN(CASE WHEN creado_en<? THEN creado_en END) primero FROM movimientos_fiado WHERE negocio_id=? GROUP BY cliente_id) f ON f.cliente_id=c.id
        LEFT JOIN (SELECT cliente_id,SUM(CASE WHEN creado_en>=? THEN monto ELSE 0 END) despues,
            MAX(CASE WHEN creado_en<? THEN creado_en END) ultimo FROM pagos WHERE negocio_id=? GROUP BY cliente_id) p ON p.cliente_id=c.id
        WHERE c.negocio_id=? AND c.creado_en<? ORDER BY c.nombre");
    $q->execute([$corte,$corte,$negocio,$corte,$corte,$negocio,$negocio,$corte]);
    $clientes=$q->fetchAll(); $s['clientes']=[]; $s['alertas']=[]; $map=[]; $deuda=0;
    $movidos=array_unique(array_merge(array_column($s['fiados'],'cliente_id'),array_column($s['abonos'],'cliente_id')));
    foreach ($clientes as $c) {
        $c['saldo']=(float)$c['saldo']; $map[$c['id']]=$c['saldo']; $deuda+=(int)round($c['saldo']*100);
        $c['dias_sin_abono']=max(0,(int)(new DateTimeImmutable(substr($c['referencia_desde'],0,10)))->diff(new DateTimeImmutable($fecha))->format('%r%a'));
        if ($c['saldo']>0 || in_array($c['id'],$movidos)) $s['clientes'][]=$c;
        if ($c['saldo']>0 && $c['dias_sin_abono']>30) $s['alertas'][]=$c;
    }
    foreach (['abonos','fiados'] as $tipo) foreach ($s[$tipo] as &$r) $r['saldo_al_corte']=$map[$r['cliente_id']] ?? 0;
    unset($r);
    $s['totales']=$totales+['deuda_total'=>$deuda/100];
    return $s;
}

function generarReporte(PDO $pdo,int $negocio,string $fecha): int {
    $fechaObj=DateTimeImmutable::createFromFormat('!Y-m-d',$fecha);
    if (!$fechaObj || $fechaObj->format('Y-m-d')!==$fecha || $fecha>date('Y-m-d')) throw new InvalidArgumentException('Fecha inválida');
    $hoy=$fecha===date('Y-m-d'); $estado=$hoy?'provisional':'completo';
    $corte=$hoy ? date('Y-m-d H:i:s') : $fechaObj->modify('+1 day')->format('Y-m-d').' 00:00:00';
    $lock="fiados_reporte_{$negocio}_{$fecha}";
    $q=$pdo->prepare('SELECT GET_LOCK(?,0)'); $q->execute([$lock]);
    if (!(int)$q->fetchColumn()) throw new RuntimeException('Este reporte ya se está generando. Intenta de nuevo.');
    $tmp=null; $archivo=null;
    try {
        $q=$pdo->prepare('SELECT id,estado,archivo FROM reportes_diarios WHERE negocio_id=? AND fecha=?'); $q->execute([$negocio,$fecha]); $prev=$q->fetch();
        if ($prev && $prev['estado']==='completo' && is_file(carpetaReportes().'/'.$prev['archivo'])) return (int)$prev['id'];
        $pdo->beginTransaction();
        $s=snapshotDiario($pdo,$negocio,$fecha,$corte,$estado);
        $pdo->commit();
        $dir=carpetaReportes(); $archivo="negocio-{$negocio}-{$fecha}-".bin2hex(random_bytes(8)).'.pdf';
        $tmp=tempnam($dir,'snapshot-'); file_put_contents($tmp,json_encode($s,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
        $python=getenv('FIADOS_PYTHON');
        $local=__DIR__.'/reportes_runtime.php';
        if (!$python && is_file($local)) $python=(require $local)['python'] ?? null;
        if (!$python) throw new RuntimeException('Configura FIADOS_PYTHON para generar reportes PDF.');
        $process=proc_open([$python,__DIR__.'/reportes/render_pdf.py',$tmp,$dir.'/'.$archivo],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
        if (!is_resource($process)) throw new RuntimeException('No se pudo iniciar el generador PDF');
        fclose($pipes[0]); $output=stream_get_contents($pipes[1]); fclose($pipes[1]); $error=stream_get_contents($pipes[2]); fclose($pipes[2]);
        if (proc_close($process)!==0 || !is_file($dir.'/'.$archivo)) { error_log($output.$error); throw new RuntimeException('Falló la generación del PDF.'); }
        $pdo->beginTransaction();
        $q=$pdo->prepare('INSERT INTO reportes_diarios (negocio_id,fecha,estado,corte,snapshot_json,archivo) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE estado=VALUES(estado),corte=VALUES(corte),snapshot_json=VALUES(snapshot_json),archivo=VALUES(archivo),revision=revision+1,generado_en=NOW()');
        $q->execute([$negocio,$fecha,$estado,$corte,json_encode($s,JSON_UNESCAPED_UNICODE),$archivo]);
        if ($estado==='completo') {
            $q=$pdo->prepare('INSERT IGNORE INTO seguimiento_deuda (negocio_id,cliente_id,fecha,dias_sin_abono,saldo,referencia_desde) VALUES (?,?,?,?,?,?)');
            foreach ($s['alertas'] as $a) $q->execute([$negocio,$a['id'],$fecha,$a['dias_sin_abono'],$a['saldo'],$a['referencia_desde']]);
        }
        $q=$pdo->prepare('SELECT id FROM reportes_diarios WHERE negocio_id=? AND fecha=?'); $q->execute([$negocio,$fecha]); $id=(int)$q->fetchColumn();
        $pdo->commit(); return $id;
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    finally { if ($tmp && is_file($tmp)) unlink($tmp); $q=$pdo->prepare('SELECT RELEASE_LOCK(?)'); $q->execute([$lock]); }
}
