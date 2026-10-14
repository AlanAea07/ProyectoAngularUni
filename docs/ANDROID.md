# FiadOS en Android Studio (Windows)

El proyecto activo es Android, no iOS. No se necesita una Mac. El emulador ejecuta Android: el APK resultante no se instala en iPhone.

## Preparación realizada

- Plataforma `@capacitor/android` 8.5.1 y proyecto Gradle en `android`.
- Nombre FiadOS e identificador `com.fiados.app`.
- Interfaz empaquetada desde `www`; no depende de Ionic Serve.
- Axios conserva la IP dinámica y la autenticación de todas las APIs.
- Permiso INTERNET y HTTP habilitado solo en la variante debug para XAMPP. La interfaz interna usa esquema HTTP para evitar bloqueo por contenido mixto con Axios.
- Copias de seguridad automáticas deshabilitadas para no restaurar tokens/cachés del dispositivo en otro equipo.
- Reportes PDF descargados con autenticación y compartidos mediante un archivo temporal en Cache. Android puede liberar esa carpeta; no se elimina al seleccionar destino porque la aplicación receptora todavía podría estar leyendo el PDF. Descargar otra vez el mismo nombre reemplaza la copia.
- Se retiraron dependencia, scripts y configuración iOS. El proyecto Xcode generado anteriormente se conserva únicamente en `.local-backup/ios-previo-android`, fuera de la configuración activa y de Git.

## Qué instalar

1. Android Studio 2025.2.1 o posterior desde https://developer.android.com/studio . Completar su asistente con Android SDK y Android Emulator.
2. En SDK Manager instalar Android SDK Platform 36, Platform-Tools y las Build-Tools requeridas por Gradle. En Device Manager crear un teléfono virtual con imagen API 36 compatible con el procesador de la laptop.
3. Usar el JDK incluido en Android Studio para Gradle (Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK). No seleccionar el Java 26 global de esta laptop: el wrapper Gradle 8.14.3 del proyecto no está preparado para ejecutarse con ese Java.
4. Node.js 22.12 o posterior. VS Code no necesita extensiones adicionales.

En la revisión no se encontró Android Studio ni el SDK en ubicaciones estándar o el registro de instalación. No se ha compilado un APK ni ejecutado un emulador. NVM bloqueó npm con NVM4306 por integridad; se usó un gestor independiente para preparar las dependencias. Si tu terminal muestra ese error, reparar/reinstalar Node desde una fuente oficial antes de ejecutar npm; no es un error de Ionic ni de la base.

## Abrir y ejecutar

En la terminal de VS Code, dentro de Appdeprueba:

```powershell
npm install
npm run android:sync
npm run android:open
```

Si ya están instaladas las dependencias, omitir npm install. `android:sync` compila Angular y copia la interfaz/plugins a Android. `android:open` abre Android Studio. También puedes abrir manualmente la carpeta `android` desde File > Open.

Esperar Gradle Sync. Seleccionar la variante debug (predeterminada), iniciar el dispositivo virtual en Device Manager, seleccionar el módulo app y pulsar Run (triángulo verde). No ejecutar `cap add android` otra vez.

Después de cambios de código ejecutar `npm run android:sync` y volver a pulsar Run. Cambiar solo la IP del login no exige recompilar. Para generar un APK de prueba, usar Build > Generate App Bundles or APKs > Generate APKs (el nombre puede variar según versión); normalmente queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

## Conectar el emulador a XAMPP

Encender Apache y MySQL. En Servidor de datos del login escribir:

```text
10.0.2.2:80
```

Pulsar Probar servidor y luego iniciar sesión. `10.0.2.2` es la dirección especial del emulador oficial para llegar a localhost de Windows; no depende de que cambie la IP del Wi-Fi. La URL resultante es `http://10.0.2.2/dermexcel-api`. Si Apache usa otro puerto, sustituir 80. MySQL 3306 lo utiliza PHP, no la app.

En un teléfono Android físico usar la IP Wi-Fi actual de la laptop y tener ambos equipos en la misma red. `10.0.2.2` corresponde al emulador, no al teléfono físico. Ni el emulador ni el teléfono requieren que Ionic Serve esté abierto.

Si no conecta, abrir `http://10.0.2.2/dermexcel-api/estado.php` en Chrome del emulador: debe devolver `{"success":true}`. Confirmar Apache, puerto, carpeta API y variante debug. En release se requiere API HTTPS; la excepción HTTP no está incluida.

## Pruebas para la tarea

1. Con conexión: abrir Clientes, comprobar conexión y capturar listado/Servidor disponible.
2. Sin conexión: primero cargar Clientes. Desactivar Wi-Fi y datos móviles del emulador y verificar que la petición a la API falla; no basta apagar Wi-Fi de Windows porque 10.0.2.2 es local. Otra prueba controlada consiste en detener Apache temporalmente y volverlo a encender al terminar, simulando servicio no disponible. Cambiar a Inicio y volver a Clientes, esperar el aviso de Consulta local y capturar.
3. Recuperación: restablecer red/Apache, comprobar conexión y volver a consultar.
4. En datos de prueba: registrar cliente, fiado y abono, comprobar saldo/historial y exportar PDF.

La caché continúa en localStorage del WebView, separada del navegador de Windows y con vigencia de 24 horas. No hay cola de registros sin conexión ni sincronización de abonos pendientes.

Fuentes oficiales: https://capacitorjs.com/docs/getting-started/environment-setup y https://developer.android.com/studio/run/emulator-networking-address .
