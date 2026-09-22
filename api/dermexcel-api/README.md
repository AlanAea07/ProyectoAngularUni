# API Fiados SaaS (PHP + MySQL)

## 1. Instalar / actualizar en XAMPP

- Copiar los PHP a `C:/xampp/htdocs/dermexcel-api` y arrancar Apache y MariaDB.
- **BD existente:** importar únicamente `migrations/001_pagos.sql`. Conserva clientes, saldos, usuarios y fiados. Requiere MariaDB (XAMPP).
- **Instalación nueva:** importar `database.sql`, luego `migrations/001_pagos.sql`. El script inicial ya no borra bases existentes.
- El seed nuevo tiene admin/vendedor con contraseña `password`; las credenciales de una instalación existente no cambian.
- `FIADOS_DB_NAME` permite seleccionar una base separada para pruebas. Por defecto se usa `fiados_saas`.

## 2. Qué cambió respecto a la versión anterior

- **Multi-tenant real**: cada tabla de negocio (`usuarios`, `clientes`,
  `movimientos_fiado`, `pagos`) tiene `negocio_id`. Cada consulta se filtra
  por el negocio del usuario logueado — un negocio nunca ve datos de otro.
- **Roles**: `usuarios.rol` puede ser `admin`, `vendedor` o `cliente` (este
  último reservado para un futuro portal de autoconsulta; hoy no se usa).
  - `vendedor`: puede registrar clientes y fiados.
  - `admin`: además puede editar/desactivar clientes (los "cambios
    importantes").
- **Autenticación en cada request**: todos los endpoints (menos `login.php`)
  ahora exigen el header `Authorization: Bearer <token>` que devuelve el
  login. Sin ese header, o con un token inválido, responden `401`.
- **Historial de fiados inmutable**: `movimientos_fiado` es un ledger de
  solo inserción. No existe endpoint para editar ni borrar un fiado, y
  además hay triggers en la base de datos (`trg_fiado_no_update`,
  `trg_fiado_no_delete`) que bloquean esos intentos aunque alguien se
  conecte directo a MySQL.

## 3. Endpoints

- `POST /login.php` → body: `{ "usuario", "password" }`
  → responde `{ success, token, usuario: { id, usuario, nombre, rol, negocio_id, negocio_nombre } }`

**Clientes** (requieren `Authorization: Bearer <token>`):

- `GET /clientes.php` → lista clientes activos del negocio del usuario
- `GET /clientes.php?buscar=juan` → filtra por nombre
- `GET /clientes.php?id=5` → un solo cliente (para la pantalla de detalle)
- `POST /clientes.php` → crea un cliente — **vendedor y admin**
  → body: `{ "nombre", "telefono" }`
- `POST /clientes_actualizar.php` → edita nombre/teléfono — **solo admin**
  → body: `{ "id", "nombre", "telefono" }`
- `POST /clientes_desactivar.php` → desactiva (nunca borra) — **solo admin**
  → body: `{ "id" }`

**Fiados** (requieren `Authorization: Bearer <token>`):

- `GET /fiados.php?cliente_id=5` → historial completo de fiados de ese
  cliente, del más reciente al más viejo
  → responde `{ success, fiados: [ { id, detalle, monto, creado_en, registrado_por }, ... ] }`
- `POST /fiados.php` → registra un fiado nuevo — **vendedor y admin**
  → body: `{ "cliente_id", "monto", "detalle" }` (`detalle` opcional)
  → responde `{ success, fiado: {...}, saldo_actualizado }`
  → No hay `PUT` ni `DELETE`: un fiado registrado no se puede tocar.

## 4. Probar con Postman

1. Login → `POST http://localhost/dermexcel-api/login.php`, body:
   `{ "usuario": "vendedor", "password": "1234" }` → copia el `token` de la respuesta.
2. En cualquier otro endpoint, agrega el header:
   `Authorization: Bearer <token que copiaste>`
3. Ejemplo, registrar un fiado → `POST http://localhost/dermexcel-api/fiados.php`, body:
   `{ "cliente_id": 1, "monto": 150, "detalle": "2 refrescos y pan" }`

## Pagos, historial y resumen

- `POST /pagos.php`: `{cliente_id, monto, metodo_pago, clave_operacion}`. Método: efectivo/transferencia. Clave: UUID nuevo para cada operación, el mismo para reintentos. No aceptar más de dos decimales ni montos superiores al saldo.
- Una transacción bloquea la fila del cliente; el trigger existente descuenta el saldo. No restar otra vez desde PHP.
- `GET /historial.php[?cliente_id=ID]`: fiados y pagos, incluidos movimientos de clientes inactivos.
- `GET /resumen.php`: alias compatible de `dashboard.php`; fecha de Ciudad de México.
- `POST /logout.php`: revoca el token actual. Las sesiones caducan a los siete días.
- Las operaciones internas requieren admin/vendedor. El rol cliente está reservado y no puede consultar la cartera del negocio.
- Pagos y fiados son registros de solo inserción; triggers impiden modificación y borrado.

## Pruebas de integración

`tests/integration.py` usa exclusivamente `fiados_saas_test_20260921` y `http://localhost:8089`.
Crear esa base vacía, copiar el esquema actualizado sin datos y arrancar PHP con `FIADOS_DB_NAME=fiados_saas_test_20260921` en el puerto 8089. Ejecutar el script con Python. Crea datos sintéticos en esa base y no toca la base principal.

## Dashboard, crédito y reportes diarios

Consultar `MEJORAS.md` para instalación de la migración 002, contratos de API,
reglas de crédito, persistencia y programación del cierre. Aplicar también
`migrations/002_dashboard_credito_reportes.sql` al instalar o actualizar.
