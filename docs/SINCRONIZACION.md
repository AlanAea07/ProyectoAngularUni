# Persistencia y sincronización: unidades I y II

## Cambios sobre el sistema existente

Se conservan Axios, servicios Angular, autenticación, roles, formularios, caché
de consultas y operaciones PHP. No se cambia el cálculo de saldos ni el historial.

| Requisito | Implementación |
| --- | --- |
| Persistencia local | Caché existente en localStorage y nueva cola durable de escrituras |
| Consulta remota | ApiClient y servicios existentes |
| Sincronización | Envío secuencial de pendientes, confirmación del servidor y descarga de consultas |
| Sin conexión | Lectura de copias vigentes y registro de operaciones pendientes |
| Reconexión | Evento online, vuelta a la app, reintento cada 30 segundos mientras está visible y botón manual |
| Estado visual | Red/API, carga, listado de pendientes/rechazos y última sincronización |
| Proceso | Flujo paso a paso descrito abajo |

## Operaciones disponibles sin conexión

- Crear clientes.
- Editar solo el nombre y desactivar clientes, desde cuenta de administrador.
- Registrar fiados y pagos para clientes ya descargados en el dispositivo.

Los clientes nuevos pendientes aparecen en el panel de sincronización; se pueden
usar para fiados/pagos después de recibir su identificador del servidor. Los
saldos de las pantallas siguen siendo los últimos confirmados: los pendientes no
se suman ni restan como si ya fueran oficiales. El servidor verifica el crédito,
saldo, permisos y negocio al recibir cada operación.

Reportes, ajustes, login y logout no entran en la cola. Se necesita iniciar sesión
con conexión al menos una vez. Cerrar sesión conserva los pendientes, pero solo
se pueden ver/enviar al volver a entrar con la misma cuenta en el mismo servidor.
Cambiar de cuenta o servidor no transfiere pendientes entre negocios.

La consulta local conserva los límites existentes: 24 horas, 30 consultas y
500 000 caracteres. Las escrituras pendientes no caducan y se limitan a 100 por
cuenta/servidor. Si no se pueden guardar, no se envían ni se anuncian como guardadas.
No borrar los datos de la aplicación mientras existan pendientes.

## Proceso de sincronización (diagrama descrito paso a paso)

1. **El usuario guarda una operación.** Se genera un identificador único y se
   escribe en la cola local antes de intentar enviarla.
2. **Comprobar API.** `estado.php` debe anunciar `sincronizacion: 1`. Si falta
   conexión o la API es antigua, conservar el pendiente y mostrar el estado.
3. **Enviar en orden.** Usar la sesión vigente y la cabecera `X-Operacion-Id`.
   Una segunda pulsación o reintento pendiente reutiliza la misma operación.
4. **Validar en servidor.** Autenticar, verificar permisos y comprobar la clave.
   - Clave ya confirmada con los mismos datos: devolver la respuesta guardada.
   - Clave usada con otros datos: rechazar con 409.
   - Clave nueva: validar la operación y ejecutarla.
5. **Confirmar atómicamente.** Guardar el cambio y su respuesta en una sola
   transacción. Ante error, revertirlos. Los saldos siguen usando sus triggers.
6. **Procesar respuesta en dispositivo.**
   - Confirmada: retirar el pendiente local.
   - Red, timeout, 5xx, 408 o 429: conservarlo para reintentar con la misma clave.
   - 401: conservarlo, solicitar login y pausar el envío.
   - Rechazo definitivo (por ejemplo 403 o 409): mostrar el motivo y detener la
     secuencia. El usuario puede descartar el rechazo y registrar una operación
     corregida. No se descartan operaciones cuyo resultado remoto sea incierto.
7. **Descargar consultas.** Actualizar clientes, resumen, historial y consultas
   previamente guardadas. La comprobación remota no acepta una copia local como
   evidencia de sincronización exitosa.
8. **Actualizar UI.** Refrescar las vistas de consulta visibles y mostrar el
   estado y hora. Los formularios abiertos conservan sus datos; para consultar
   un saldo nuevo en ellos se vuelve a abrir el formulario.
9. **Repetir al recuperar conexión.** Automáticamente con la app activa o usando
   **Sincronizar / comprobar conexión**. La app cerrada no ejecuta tareas de fondo.

## Activación en XAMPP u otro servidor

La actualización del frontend y del backend debe instalarse conjuntamente.

1. Con MySQL funcionando, seleccionar la base de la aplicación y ejecutar
   `api/dermexcel-api/migrations/003_sincronizacion.sql`. Es aditiva: solo crea
   `operaciones_sincronizadas`. No volver a importar `database.sql` sobre datos reales.
2. Copiar desde `api/dermexcel-api/` al servidor:
   `sincronizacion.php`, `estado.php`, `clientes.php`, `clientes_actualizar.php`,
   `clientes_desactivar.php`, `fiados.php` y `pagos.php`.
3. Incorporar en `config.php` la cabecera CORS `X-Operacion-Id`, preservando las
   credenciales del servidor. La variable opcional `FIADOS_DB_PORT` permite pruebas
   aisladas; por defecto se sigue usando el puerto 3306.
4. Verificar que `estado.php` responda `{"success":true,"sincronizacion":1}`.
5. Compilar con `npm run build`. Para la app instalada, ejecutar `npm run android:sync`
   y volver a generar/instalar la aplicación con el flujo Android existente.

En esta revisión, MySQL de XAMPP no completó el arranque. La migración se probó
en una instancia aislada en el puerto 3317; **no se aplicó sobre la base real ni
se reemplazó la API de `C:\xampp\htdocs\dermexcel-api`**. Esos pasos de activación
quedan pendientes hasta que MySQL vuelva a funcionar.

## Verificación

Resultado del 20 de octubre: compilación de producción correcta, 48 pruebas
Angular aprobadas y pruebas HTTP/PHP con MySQL aislado aprobadas. No se realizó
una demostración visual en dispositivo físico.

- `npm test -- --watch=false`: pruebas de persistencia, pérdida de conexión,
  recuperación, duplicados, rechazo, cuenta/servidor, 401 y almacenamiento lleno.
- `npm run build`: compilación del frontend.
- `python api/dermexcel-api/tests/clientes_http.py`: crea y elimina una base
  temporal; prueba permisos, inmutabilidad de saldo/historial y reenvío idempotente
  de POST, PATCH y DELETE. Requiere MySQL de XAMPP; se puede seleccionar un puerto
  aislado con la variable `FIADOS_TEST_MYSQL_PORT`.

Para demostrarlo: entrar con conexión, visitar Clientes y un detalle, bloquear la
API y registrar una operación; comprobar su estado pendiente y la copia local.
Restaurar la API y pulsar Sincronizar; comprobar un único registro en el servidor.
Una operación que exceda el saldo vigente debe quedar rechazada con su motivo.

En navegador, mantener la app cargada para la demostración offline; no se añade
un service worker/PWA. La app Capacitor instalada ya contiene sus recursos locales.
La cola usa el almacenamiento del origen/dispositivo: no se comparte entre una
pestaña de otro origen y la aplicación instalada.
