# Dashboard, crédito y cierre diario

Se conserva el diseño actual. En Inicio aparecen datos reales y el acceso a
Reportes. El administrador también tiene Ajustes. Todos los datos pertenecen al
negocio del token autenticado: el navegador no elige `negocio_id`.

## Instalación y operación

1. Respaldar la base existente. Aplicar `migrations/002_dashboard_credito_reportes.sql`
   sobre la base seleccionada, después de la migración 001. No reiniciar la base:
   la migración agrega tablas y conserva clientes, saldos y movimientos.
2. Copiar los PHP y las carpetas `jobs` y `reportes` al directorio de la API.
3. Tener Python con `reportlab`. Ejecutar en PowerShell:

   ```powershell
   .\jobs\instalar-tarea.ps1 -PythonPath 'C:\ruta\python.exe'
   ```

   El instalador admite `-ApiPath` y `-PhpPath`. Crea el archivo local
   `reportes_runtime.php` y la tarea Windows `FiadOS-Reportes-Diarios`.
   La zona horaria de Windows debe ser `Central Standard Time (Mexico)`.

En este equipo ya se aplicó la migración, se actualizó la API de XAMPP y se instaló
la tarea. Su ejecución manual terminó con código 0. Se usa el Python disponible
en el runtime local de Codex; si cambia su ubicación, ejecutar otra vez el instalador.

La tarea corre a las **23:00**, a las **00:05** y al iniciar sesión en Windows.
Requiere el equipo encendido, la sesión Windows abierta y MySQL disponible.
Intenta despertar el equipo y recuperar ejecuciones pendientes; un equipo apagado
no puede generar el PDF a la hora prevista. El trabajo recupera fechas completas
pendientes desde `inicio_reportes` en la siguiente ejecución exitosa.
En un servidor SaaS se debe programar `php jobs/reportes_diarios.php` con estos
horarios y zona horaria; cerrar el navegador no afecta al proceso del servidor.

Los archivos quedan fuera del directorio público, por defecto en
`C:\xampp\fiados-private\reportes`. `FIADOS_REPORT_DIR` permite cambiarlo y
`FIADOS_PYTHON` permite seleccionar Python. Respaldar tanto la base como esta carpeta.

## Reglas del negocio

| Saldo por cliente | Color inicial |
|---|---|
| 0 a 500 | Verde |
| Más de 500 a 1200 | Amarillo |
| Más de 1200 a 2500 | Amarillo |
| Más de 2500 a 4000 | Naranja |
| Más de 4000 | Rojo |

Se conservaron los dos tramos amarillos solicitados. El admin cambia los cuatro
umbrales, los cinco colores y el máximo en Ajustes. Cada negocio tiene su propia
configuración y se registra quién cambió qué, con valores anteriores y nuevos.

El máximo inicial es **$10,000 por cliente**. Ejemplo: si debe $9,950, puede fiar
$50; un fiado de $50.01 se rechaza. Un abono libera crédito. La validación se hace
también en PHP, dentro de una transacción con bloqueo, para impedir que dos
vendedores excedan el máximo al registrar simultáneamente. Bajar el máximo no
modifica deudas existentes; impide aumentarlas mientras no haya crédito disponible.

Con saldo pendiente se muestran los días desde el último abono. Si nunca abonó,
se usa el primer fiado. Después de 30 días aparece la alerta: a los 30 exactos aún
no. Un fiado nuevo no reinicia ese conteo; un abono sí. Esta alerta es informativa
y no bloquea el crédito. El cierre completo conserva un registro diario de los
clientes que cumplen la condición; el detalle muestra los últimos 30 registros.

## Reportes por fecha

El reporte de las 23:00 es provisional. A las 00:05 se completa el de la fecha
anterior, incluyendo movimientos hasta antes de medianoche. Por ejemplo, una
venta del lunes a las 23:40 pertenece al lunes; una del martes a las 00:01 al martes.
La lista muestra estado, corte y revisión. El administrador puede generar o
actualizar un provisional manualmente; vendedor y admin pueden descargarlo.

Cada PDF contiene totales, todos los abonos juntos, todos los fiados juntos,
fecha/hora, quien registró, saldo por cliente al corte y seguimiento por antigüedad.
El saldo al corte se reconstruye descontando fiados posteriores y sumando abonos
posteriores; no cambia por los movimientos del día siguiente. El reporte completo
se conserva sin regenerarlo en cada ejecución. Los saldos repetidos en las filas
de movimientos no se suman: la sección de saldos presenta cada cliente una sola vez.

## APIs: qué reciben y qué devuelven

Todas requieren `Authorization: Bearer <token>`. Salvo Ajustes y generación manual,
aceptan vendedor/admin. No se envían tokens en las URLs de descarga.

| API | Entrada | Salida |
|---|---|---|
| `GET dashboard.php` | Sin cuerpo | `{success,resumen}` con deuda total, clientes con deuda, conteo y monto de fiados/abonos de hoy, fecha y zona horaria |
| `GET clientes.php?buscar=Ana` | Nombre o teléfono opcional | Clientes con saldo, color, máximo, crédito disponible, días sin abono y alerta |
| `GET clientes.php?id=1` | ID propio del negocio | Cliente y seguimiento histórico |
| `POST fiados.php` | `{cliente_id,monto,detalle}` | Fiado y saldo actualizado; HTTP 409 si excede el máximo |
| `GET settings.php` | Solo admin | `{success,configuracion,historial}`; últimos 30 cambios |
| `POST settings.php` | Solo admin: `{limite_credito,rangos:[{hasta,color},...]}` | Configuración guardada; cinco tramos, último `hasta:null` |
| `GET reportes.php` | `?fecha=YYYY-MM-DD` opcional | Lista de hasta 90 reportes del negocio |
| `POST reportes.php` | Solo admin: `{fecha:"YYYY-MM-DD"}` | Reporte generado/actualizado; no admite fechas futuras |
| `GET reportes.php?id=1` | ID propio del negocio | Archivo PDF autenticado; 404 para otro negocio |

Flujo sencillo: Inicio llama a `MovimientosService`, que usa `HttpClient` para
consultar `dashboard.php`. El interceptor agrega el token. PHP verifica la sesión,
obtiene el negocio y consulta MySQL. Angular recibe JSON y actualiza los valores.
`NegocioService` hace lo mismo para Ajustes y Reportes; la descarga recibe un Blob
PDF y lo entrega al navegador como archivo.

## Persistencia y relaciones

- `configuracion_negocio`: una fila por negocio, máximo, rangos y comienzo de reportes.
- `configuracion_auditoria`: negocio, usuario, fecha y configuración anterior/nueva.
- `seguimiento_deuda`: negocio, cliente, fecha, saldo, días y fecha de referencia;
  combinación negocio/cliente/fecha única para evitar duplicados.
- `reportes_diarios`: negocio/fecha únicos, estado, revisión, corte, nombre privado
  del PDF y fotografía JSON de los datos usados para generarlo.

MySQL guarda estos registros en disco. Las señales de Angular solo representan
lo que está en pantalla: al recargar, se vuelve a consultar la base. Los triggers
existentes mantienen el saldo al insertar fiados y pagos; PHP no suma/resta por
segunda vez. Los movimientos siguen siendo inmutables. La transacción permite
guardar el movimiento y su saldo juntos, o deshacer ambos si ocurre un error.

## Verificación

`tests/features.py` ejecuta las pruebas previas y agrega aislamiento entre negocios,
permisos, límites exactos, colores, antigüedad, auditoría, dashboard por fecha,
PDF con movimientos después de las 23:00 y saldo histórico, repetición del cierre
y fiados simultáneos. Usa exclusivamente `fiados_saas_test_20260921` y el servidor
PHP de pruebas en 8089; levanta un segundo proceso en 8090 para concurrencia.
Requiere Python con `pypdf` y `reportlab`, las dos migraciones aplicadas a esa base,
`FIADOS_PYTHON` configurado y `FIADOS_REPORT_DIR` apuntando a una carpeta de prueba.
Genera `output/pdf/reporte-diario-ejemplo.pdf` con datos sintéticos.
