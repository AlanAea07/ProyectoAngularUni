# Conexión y caché de consulta

Implementación de la actividad académica del 28 de septiembre de 2026.

- Estado de red con eventos `online`/`offline` y estado independiente de la API.
- Botón global para comprobar PHP y MySQL mediante `estado.php`.
- Red primero y recuperación de consultas JSON desde localStorage al fallar el transporte,
  superar el tiempo de espera o recibir errores HTTP 5xx.
- Caducidad de 24 horas, hasta 30 consultas y 500 000 caracteres en total.
- Claves por negocio, usuario y URL. Limpieza al iniciar/cerrar sesión y tras escrituras
  confirmadas. No se sustituyen errores 401 ni 403 con datos locales.
- Límite de 10 segundos por petición; 60 segundos para reportes.
- No se guardan escrituras pendientes ni hay sincronización automática.

No desconectar toda la laptop para demostrar un fallo de API: con XAMPP local puede
seguir funcionando. Usar DevTools, Network, Offline con la aplicación ya cargada;
si localhost sigue disponible, bloquear `*dermexcel-api/*` mediante DevTools.
Entrar antes a las pantallas a probar para tener copia de sus URLs exactas.
Restaurar la red y retirar el bloqueo al terminar. El Word incluye los pasos y
espacios para capturas.

## Verificación ejecutada

- `ng test --watch=false`: 20 pruebas aprobadas en 5 archivos, 15 nuevas.
- `ng build`: compilación de producción aprobada.
- `php -l`: config.php y estado.php sin errores de sintaxis.
- API real local: estado.php devuelve `{success:true}`.
- API de prueba en puerto 8091 con base inexistente: HTTP 500 y mensaje general;
  no se modificaron bases reales. El proceso de prueba se cerró al terminar.
- Navegador: botón Comprobar conexión muestra Servidor disponible.
- Corte de transporte, offline/online, timeout y recuperación: simulados de forma
  reproducible con HttpTestingController y Vitest, sin apagar Wi-Fi ni modificar
  registros del usuario.

## Instalación en otra copia

Incluir los cambios de `src` al compilar Angular. Copiar `estado.php` y el ajuste
de errores de `config.php` a la API desplegada, conservando sus credenciales reales.
No hay migraciones de base de datos para esta actividad.

## Documento

`output/documentos/Informe_conexion_y_cache_FiadOS.docx` es el entregable editable.
`crear_reporte_conexion.py` permite regenerarlo con Python y python-docx.
El renderizador LibreOffice no está disponible en el runtime de Windows; se
verificaron las cinco páginas usando exportación de archivo de Word a PDF y Poppler.
Los archivos de revisión en `tmp/docx-conexion` no son entregables.
