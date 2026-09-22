<?php
// Solo CLI: nunca expone una generación global por HTTP.
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
require_once __DIR__.'/../config.php'; require_once __DIR__.'/../reportes_lib.php';
$negocios=$pdo->query('SELECT id FROM negocios WHERE activo=1')->fetchAll(); $fallos=0;
foreach ($negocios as $n) {
    try {
        $config=configuracionNegocio($pdo,(int)$n['id']);
        $fin=new DateTimeImmutable(date('Y-m-d'));
        // Recupera cortes pendientes desde que se habilitó esta función.
        for ($d=new DateTimeImmutable($config['inicio_reportes']); $d<$fin; $d=$d->modify('+1 day')) {
            $id=generarReporte($pdo,(int)$n['id'],$d->format('Y-m-d'));
            echo "OK negocio={$n['id']} fecha={$d->format('Y-m-d')} reporte=$id\n";
        }
        if ((int)date('H')>=23) {
            $id=generarReporte($pdo,(int)$n['id'],date('Y-m-d'));
            echo "OK provisional negocio={$n['id']} reporte=$id\n";
        }
    } catch (Throwable $e) { $fallos++; fwrite(STDERR,"ERROR negocio={$n['id']}: ".$e->getMessage()."\n"); }
}
exit($fallos?1:0);
