# Conexión desde el celular en la misma red

1. Mantener Apache y MySQL de XAMPP encendidos en la laptop.
2. Ejecutar `npm run start:lan` desde el proyecto. La aplicación debe escuchar
   en la red, no solo en 127.0.0.1. El servidor de desarrollo se dejó ejecutándose.
3. Conectar celular y laptop al mismo Wi-Fi. Abrir `http://192.168.0.222:4200`.
4. En Servidor de datos escribir `192.168.0.222:80` y pulsar Probar servidor.
5. Con el mensaje de conexión correcta, ingresar usuario y contraseña.

La IP verificada el 28 de septiembre de 2026 es 192.168.0.222. Si cambia, consultar
`ipconfig`, abrir la aplicación en la nueva IP y actualizar el campo de login.
El navegador recuerda el origen mediante localStorage. También se admite la URL
completa de una carpeta de API y un puerto web diferente, por ejemplo
`http://192.168.0.222:8080/dermexcel-api`.

## Qué puerto utiliza cada parte

Celular → aplicación Angular en 4200 → Axios → Apache/PHP en 80 → MySQL en 3306.

3306 no es un puerto HTTP y no se escribe en el campo de la API. Se dejó explícito
en el DSN de PHP en config.php. No es necesario exponer MySQL al celular.
La API se puede comprobar directamente en `http://192.168.0.222/dermexcel-api/estado.php`.

Si el celular no alcanza esas direcciones, revisar que la red no sea de invitados,
que el router no aísle dispositivos y que el firewall permita Apache y el servidor
de desarrollo en la red privada. No se modificaron las reglas del firewall.
La conexión se comprobó desde el navegador de la laptop por su IP local; la prueba
física desde el celular queda por realizar.

## Cambios del código

- ServidorService valida y guarda el origen; agrega /dermexcel-api si solo recibe IP y puerto.
- ApiClient realiza todas las solicitudes mediante Axios y consulta la dirección
  vigente en cada petición. Los servicios de login, clientes, fiados, abonos,
  dashboard, historial, ajustes y reportes usan rutas relativas a ese origen.
- Se conservan tiempos de espera, mensajes de error y caché de consulta. La caché
  incluye la URL completa. Cambiar servidor elimina sesión y copias anteriores.
- El token se vincula al servidor que inició la sesión y no se envía a otro origen.
- PDF usa respuesta Blob. La comprobación de conexión también usa Axios.
- Las claves UUID de los abonos usan crypto.getRandomValues, compatible con HTTP
  de red local donde crypto.randomUUID puede no estar disponible.

## Verificación

28 pruebas aprobadas: regresiones de caché, autenticación, validación de direcciones,
separación entre servidores y 20 operaciones de los servicios hacia la IP elegida.
Compilación de producción aprobada y PHP sin errores de sintaxis. En navegador
se comprobó la validación de 3306, Probar servidor con puerto 80, inicio de sesión
y datos reales del dashboard mediante la dirección de red local, sin crear movimientos.

La implementación de caché anterior se trasladó de los interceptores de HttpClient
a ApiClient. El informe Word de la actividad anterior describe aquella versión;
esta nota documenta la migración posterior a Axios.
