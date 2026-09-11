# Miscelánea - Aplicación de Gestión de Fiados

## Descripción

Esta aplicación móvil tiene como objetivo facilitar la gestión de los fiados de una miscelánea o tienda pequeña. Está pensada para que los vendedores puedan registrar las deudas de los clientes recurrentes, consultar cuánto deben, registrar abonos y llevar un historial de los movimientos realizados.

La aplicación busca reemplazar el manejo manual de las cuentas fiadas, evitando depender de libretas, notas o registros difíciles de consultar y permitiendo mantener un historial organizado de las deudas y pagos de cada cliente.

## Objetivo

El objetivo principal es desarrollar una aplicación sencilla y fácil de utilizar para que los vendedores puedan administrar los fiados de los clientes desde un dispositivo móvil.

La aplicación permitirá:

* Registrar nuevos clientes.
* Consultar clientes y sus deudas actuales.
* Registrar nuevas compras fiadas.
* Registrar abonos parciales.
* Registrar pagos en efectivo o transferencia.
* Liquidar completamente una deuda.
* Consultar el historial de fiados y pagos.
* Registrar las fechas en las que se realizan las operaciones.
* Mantener el historial de los clientes incluso cuando sean desactivados.

## Usuarios

La aplicación está pensada para ser utilizada por los vendedores o cajeros de la tienda.

Inicialmente se contemplan **4 usuarios vendedores**, los cuales podrán consultar y administrar los clientes de manera compartida.

No se manejarán comisiones, intereses ni recargos por retraso, ya que el sistema está enfocado únicamente en llevar el control de las deudas y los pagos.

## Funcionamiento general

El flujo principal de la aplicación será:

```text
Inicio de sesión
       ↓
     Inicio
       ↓
    Clientes
       ↓
Seleccionar cliente
       ↓
Detalle del cliente
       ↓
 ┌───────────────┬───────────────┐
 │               │               │
Nuevo fiado   Registrar abono   Liquidar
 │               │               │
 └───────────────┴───────────────┘
                 ↓
              Historial
```

### Fiados

Al registrar un fiado se podrá indicar el monto total de la deuda y, de manera opcional, una descripción de lo que compró el cliente.

Por ejemplo:

```text
Cliente: Juan Pérez
Monto: $350.00
Descripción: 2 refrescos, pan y leche
Fecha: 11/09/2026
```

La descripción no será obligatoria, ya que el objetivo principal es controlar el monto de la deuda.

### Abonos

Los clientes podrán realizar pagos parciales de su deuda.

Por ejemplo:

```text
Deuda:       $800.00
Abono:       $200.00
--------------------
Pendiente:   $600.00
```

Cada abono registrará la fecha y el método de pago utilizado.

Los métodos contemplados serán:

* Efectivo
* Transferencia

### Liquidación

Cuando el cliente pague la totalidad de su deuda, se podrá registrar la liquidación y el saldo quedará en:

```text
$0.00
```

La operación permanecerá registrada en el historial para poder consultar cuándo se liquidó la deuda.

## Clientes

Los clientes podrán ser creados, consultados y editados.

No se eliminarán físicamente los clientes de la base de datos. En su lugar, se utilizará un estado de activo/inactivo.

Esto permitirá conservar el historial de:

* Fiados.
* Abonos.
* Liquidaciones.
* Fechas de cada movimiento.

Por ejemplo:

```text
Cliente activo
       ↓
Realiza fiados y pagos
       ↓
Se conserva todo su historial
       ↓
Cliente puede ser desactivado
       ↓
El historial permanece en el sistema
```

## Tecnologías

### Aplicación móvil

* Ionic
* Angular
* TypeScript
* HTML
* SCSS
* Capacitor

### Backend

* PHP
* API REST
* MySQL

### Comunicación

La aplicación Ionic se comunicará con el backend mediante peticiones HTTP y recibirá la información en formato JSON.

```text
┌─────────────────────┐
│    Ionic Angular    │
│    Aplicación móvil │
└──────────┬──────────┘
           │
           │ HTTP / JSON
           ↓
┌─────────────────────┐
│       PHP API       │
└──────────┬──────────┘
           │
           │ SQL
           ↓
┌─────────────────────┐
│       MySQL         │
└─────────────────────┘
```

La aplicación móvil no tendrá conexión directa con MySQL. Todas las operaciones de datos pasarán por la API PHP.

## Vistas principales

La aplicación contará inicialmente con las siguientes vistas:

1. **Login**

   * Inicio de sesión de los vendedores.

2. **Inicio**

   * Resumen general.
   * Acceso rápido a las funciones principales.

3. **Clientes**

   * Lista de clientes.
   * Búsqueda de clientes.
   * Acceso a la información de cada cliente.

4. **Detalle del cliente**

   * Deuda actual.
   * Historial de movimientos.
   * Registrar fiado.
   * Registrar abono.
   * Liquidar deuda.

5. **Nuevo fiado**

   * Registro de una nueva deuda.

6. **Registrar abono**

   * Registro de pagos parciales.
   * Selección del método de pago.

7. **Liquidar deuda**

   * Registro del pago total pendiente.

8. **Historial**

   * Consulta de fiados, abonos y liquidaciones realizadas.

## Características importantes

* Aplicación enfocada en dispositivos móviles.
* Interfaz sencilla para facilitar el trabajo del vendedor.
* Clientes compartidos entre los vendedores.
* Registro de fechas de cada operación.
* Pagos parciales.
* Pagos en efectivo o transferencia.
* Historial permanente de movimientos.
* Desactivación de clientes en lugar de eliminación.
* Comunicación mediante API.
* Persistencia de información en MySQL.

## Alcance inicial

La primera versión estará enfocada exclusivamente en el control de fiados y pagos.

No se contempla inicialmente:

* Control de inventario.
* Catálogo de productos.
* Comisiones.
* Intereses.
* Multas o recargos por retraso.
* Facturación.
* Gestión avanzada de proveedores.
* Administración de ventas generales de la tienda.

Estas funciones podrían considerarse posteriormente si el proyecto crece.

## Seguridad

El sistema contará con autenticación para los vendedores y la información será manejada mediante una API.

El backend deberá validar los datos recibidos y utilizar consultas preparadas para reducir riesgos de SQL Injection.

Las contraseñas de los usuarios se almacenarán utilizando hashes, nunca como texto plano.

## Estado del proyecto

**En desarrollo**

Actualmente se está construyendo la aplicación desde cero utilizando Ionic Angular para el frontend y PHP + MySQL para el backend.

El desarrollo se realizará por etapas, comenzando por:

1. Autenticación.
2. CRUD de clientes.
3. Consulta del detalle de clientes.
4. Registro de fiados.
5. Registro de abonos.
6. Liquidación de deudas.
7. Historial de movimientos.
8. Integración y pruebas generales.

## Propósito del proyecto

El proyecto busca demostrar el desarrollo de una aplicación móvil conectada a un backend mediante una API, aplicando conceptos de desarrollo frontend, backend, bases de datos, autenticación, persistencia de información y diseño de interfaces móviles.

La aplicación está diseñada para resolver un problema sencillo y común en pequeñas tiendas: **mantener un control organizado de quién debe, cuánto debe, cuánto ha pagado y cuándo realizó cada movimiento.**
