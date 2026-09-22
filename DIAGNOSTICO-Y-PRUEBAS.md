# Diagnóstico y cambios — 21 de septiembre de 2026

## Qué ocurrió con las pantallas

El texto compartido describe varias versiones diferentes. Una etiqueta `</ion-content>` sin apertura sí provoca NG5002 y bloquea la compilación. En los archivos recibidos al comenzar esta revisión ese error ya no existía: el compilador procesó las pantallas.

La afirmación de que es obligatorio poner manualmente `ion-router-outlet` dentro de `ion-tabs` no corresponde a Ionic Angular 9.0.1 instalado aquí. `node_modules/@ionic/angular/dist/standalone/navigation/tabs.js` ya declara uno dentro de `.tabs-inner`, con `tabs=true` y eventos de cambio de pila. El outlet añadido en `tabs.page.html` duplicaba contenedores para las mismas rutas. Se retiró únicamente ese outlet adicional; se conserva el principal de `app.component.html`.

Los imports `@ionic/angular` son correctos en esta versión: su package.json exporta standalone desde la raíz. No se requiere `/standalone`. No se instalaron ni actualizaron dependencias.

Con la estructura corregida se verificaron en navegador el inicio de sesión, tabs, detalle, formulario de fiado, buscador de pagos, cierre de sesión y botón Atrás. Esto confirma el funcionamiento actual; no permite reconstruir con certeza cada fallo de versiones anteriores descritas en el chat.

## Problemas adicionales encontrados

- No existía guard: `replaceUrl` cambia el historial, no autoriza el acceso y tampoco elimina todas las entradas antiguas. Ahora `/tabs` tiene `canActivate` y `canActivateChild`; el backend valida el token y el negocio en cada petición.
- Pagos/Abonos abría Clientes sin un flujo de pago. Ahora abre una selección con búsqueda por nombre o teléfono.
- Historial estaba vacío y los números de Inicio eran constantes. Ahora consultan datos del negocio autenticado.
- Clientes no recargaba saldos al volver a un tab cacheado. Ahora usa `ionViewWillEnter`.
- Logout borraba almacenamiento local sin revocar el token. Se añadió endpoint de revocación y caducidad de siete días. Si no hay red, se elimina la sesión local, pero el servidor no puede recibir la revocación hasta recuperar conexión; el token sigue sujeto a su caducidad.
- Login confundía credenciales incorrectas con un fallo de XAMPP. Ahora muestra el mensaje de la API.
- Producción fallaba por el presupuesto CSS de la página antigua `/home`, no por NG5002. La fuente se cargó globalmente y el presupuesto de estilos por componente se ajustó a 6/8 kB para admitir los 5.78 kB existentes.
- Había una prueba que importaba `HomePage`, aunque la clase se llama `HomepagePage`, y faltaban proveedores en la prueba de Login. Se corrigieron.

## Pagos y separación por negocio

Un pago guarda cliente, negocio, vendedor, importe, método y fecha. Permite abono parcial o usar el saldo completo. El backend obtiene negocio/usuario del token; no confía en esos datos enviados por el navegador.

Se valida monto positivo, hasta dos decimales y no superior al saldo. La transacción bloquea al cliente antes de comprobar e insertar. El trigger de pagos ya existente realiza la resta, una sola vez. La clave de operación evita duplicar un pago al reintentar la misma solicitud. Historial muestra fiados y pagos sin sobrescribir movimientos anteriores. Ambos tipos tienen triggers que impiden editar o borrar registros.

Se conservan los roles existentes. Vendedor registra clientes, fiados y pagos; admin además edita/desactiva clientes. El portal del rol cliente sigue fuera de esta etapa: se bloqueó su acceso a los endpoints internos para que no pueda consultar toda la cartera. No se implementaron suscripciones, cobro del SaaS ni alta de nuevos negocios.

## Base y despliegue local

Se respaldó `fiados_saas` en `.local-backup/fiados_saas-before-pagos.sql`, ignorado por Git. Se aplicó la migración aditiva `api/dermexcel-api/migrations/001_pagos.sql` y se sincronizaron los PHP con `C:/xampp/htdocs/dermexcel-api`, que es la API usada por la app. No se reimportó ni reconstruyó la base principal.

Las operaciones de prueba se ejecutaron en `fiados_saas_test_20260921`, con datos sintéticos de dos negocios. No se registraron pagos ni fiados de prueba en la cartera principal. La migración usa sintaxis MariaDB de XAMPP; para MySQL puro debe adaptarse la sintaxis de creación idempotente.

## Verificación

- Compilación de producción completada.
- Angular: cinco pruebas pasaron, incluidas dos de guard (sin sesión y después de logout).
- PHP: comprobación de sintaxis de los endpoints.
- Integración HTTP: login, roles, rechazo sin token, dos fiados acumulados, aislamiento entre negocios, pago parcial, liquidación por transferencia, reintento idempotente, rechazo de clave reutilizada con otros datos, montos inválidos, sobrepago, historial, resumen, inmutabilidad y revocación del token.
- Navegador: acceso directo sin sesión redirige a Login; login de vendedor, búsqueda de cliente, selección sin deuda, formulario de fiado, detalle e Historial responden; Salir y Atrás permanecen en Login. Los pagos con saldo se validaron mediante API en la base aislada, sin introducir movimientos en los clientes de demostración del usuario.

`npm` fue bloqueado por NVM4306 (identidad del script npm cambió). Para verificar se usó el Node incluido con Codex y el CLI Angular instalado en el proyecto, sin modificar NVM. El comando habitual sigue siendo `npm start` o `ionic serve` una vez resuelto el estado local de NVM. Browserslist conserva advertencias sobre navegadores anteriores al soporte de Angular 22.
