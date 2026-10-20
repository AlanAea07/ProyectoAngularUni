"""Prueba PATCH/DELETE en una BD temporal; requiere MySQL de XAMPP encendido."""
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
MYSQL = r'C:\xampp\mysql\bin\mysql.exe'
PHP = r'C:\xampp\php\php.exe'
PORT = os.environ.get('FIADOS_TEST_MYSQL_PORT', '3306')
DB = 'fiados_test_clientes_' + uuid.uuid4().hex[:12]


def sql(query, database=None):
    return subprocess.check_output(
        [MYSQL, '-h', '127.0.0.1', '--port=' + PORT, '-u', 'root', '--default-character-set=utf8mb4', '-N'] + ([database] if database else []),
        input=query, encoding='utf-8')


server = None
created = False
try:
    schema = (ROOT / 'database.sql').read_text(encoding='utf-8').replace('fiados_saas', DB)
    sql(schema)
    created = True
    hashed = subprocess.check_output([PHP, '-r', "echo password_hash('Test-local-123', PASSWORD_DEFAULT);"], text=True)
    sql(f"UPDATE usuarios SET password='{hashed}' WHERE usuario IN ('admin','vendedor')", DB)
    for migration in sorted((ROOT / 'migrations').glob('*.sql')):
        sql(migration.read_text(encoding='utf-8').replace('fiados_saas', DB), DB)
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    base = f'http://127.0.0.1:{port}/'
    server = subprocess.Popen([PHP, '-S', f'127.0.0.1:{port}', '-t', str(ROOT)],
        env={**os.environ, 'FIADOS_DB_NAME': DB, 'FIADOS_DB_PORT': PORT}, stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
    for attempt in range(50):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.2):
                break
        except OSError:
            time.sleep(0.1)

    def request(path, method='GET', body=None, token=None, status=200, operation=None):
        headers = {'Content-Type': 'application/json'}
        if operation:
            headers['X-Operacion-Id'] = operation
        if token:
            headers['Authorization'] = 'Bearer ' + token
        req = urllib.request.Request(base + path, method=method, headers=headers,
            data=json.dumps(body).encode() if body is not None else None)
        try:
            response = urllib.request.urlopen(req, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            data = json.loads(response.read())
            assert response.status == status, (path, response.status, data)
            return data

    admin = request('login.php', 'POST', {'usuario': 'admin', 'password': 'Test-local-123'})['token']
    seller = request('login.php', 'POST', {'usuario': 'vendedor', 'password': 'Test-local-123'})['token']
    cid = request('clientes.php', 'POST', {'nombre': 'Original', 'telefono': '5551234567'}, admin)['cliente']['id']
    request('fiados.php', 'POST', {'cliente_id': cid, 'monto': 100, 'detalle': 'Prueba'}, admin)
    request('pagos.php', 'POST', {'cliente_id': cid, 'monto': 20, 'metodo_pago': 'efectivo', 'clave_operacion': str(uuid.uuid4())}, admin)
    history = request(f'historial.php?cliente_id={cid}', token=admin)
    for method, path in [('PATCH', 'clientes_actualizar.php'), ('DELETE', 'clientes_desactivar.php')]:
        request(path, method, {'id': cid, 'nombre': 'Cambio'}, status=401)
        request(path, method, {'id': cid, 'nombre': 'Cambio'}, seller, 403)
        request(path, 'POST', {'id': cid, 'nombre': 'Cambio'}, admin, 405)
    for field in ['saldo', 'telefono', 'activo']:
        request('clientes_actualizar.php', 'PATCH', {'id': cid, 'nombre': 'Cambio', field: 0}, admin, 400)
    request('clientes_actualizar.php', 'PATCH', {'id': cid, 'nombre': '  '}, admin, 400)
    edited = request('clientes_actualizar.php', 'PATCH', {'id': cid, 'nombre': 'Nuevo nombre'}, admin)['cliente']
    assert edited['nombre'] == 'Nuevo nombre' and edited['saldo'] == 80
    assert edited['telefono'] == '5551234567'
    request('clientes_desactivar.php', 'DELETE', {'id': cid}, admin)
    assert sql(f'SELECT activo, saldo FROM clientes WHERE id={cid}', DB).strip() == '0\t80.00'
    assert all(c['id'] != cid for c in request('clientes.php', token=admin)['clientes'])
    for movement in history['movimientos']:
        movement['cliente_nombre'] = 'Nuevo nombre'
    assert request(f'historial.php?cliente_id={cid}', token=admin) == history
    request('clientes_desactivar.php', 'DELETE', {'id': cid}, admin, 404)
    req = urllib.request.Request(base + 'clientes_actualizar.php', method='OPTIONS')
    with urllib.request.urlopen(req) as response:
        allowed = response.headers['Access-Control-Allow-Methods']
        assert 'PATCH' in allowed and 'DELETE' in allowed
    # Respuesta perdida: mismo identificador devuelve el mismo registro sin duplicar.
    key = str(uuid.uuid4())
    creation = {'nombre': 'Cliente sincronizado', 'telefono': '555'}
    first = request('clientes.php', 'POST', creation, admin, operation=key)
    assert request('clientes.php', 'POST', creation, admin, operation=key) == first
    request('clientes.php', 'POST', {**creation, 'nombre': 'Otro'}, admin, 409, key)
    synced_id = first['cliente']['id']
    fiado_key = str(uuid.uuid4())
    debt = {'cliente_id': synced_id, 'monto': 100, 'detalle': 'Sin conexion'}
    first = request('fiados.php', 'POST', debt, admin, operation=fiado_key)
    assert request('fiados.php', 'POST', debt, admin, operation=fiado_key) == first
    pay_key = str(uuid.uuid4())
    payment = {'cliente_id': synced_id, 'monto': 20, 'metodo_pago': 'efectivo', 'clave_operacion': str(uuid.uuid4())}
    first = request('pagos.php', 'POST', payment, admin, operation=pay_key)
    assert request('pagos.php', 'POST', payment, admin, operation=pay_key) == first
    edit_key = str(uuid.uuid4())
    edit = {'id': synced_id, 'nombre': 'Editado'}
    first = request('clientes_actualizar.php', 'PATCH', edit, admin, operation=edit_key)
    assert request('clientes_actualizar.php', 'PATCH', edit, admin, operation=edit_key) == first
    delete_key = str(uuid.uuid4())
    first = request('clientes_desactivar.php', 'DELETE', {'id': synced_id}, admin, operation=delete_key)
    assert request('clientes_desactivar.php', 'DELETE', {'id': synced_id}, admin, operation=delete_key) == first
    assert sql(f'SELECT saldo FROM clientes WHERE id={synced_id}', DB).strip() == '80.00'
    assert len(request(f'historial.php?cliente_id={synced_id}', token=admin)['movimientos']) == 2
    assert sql(f"SELECT COUNT(*) FROM operaciones_sincronizadas", DB).strip() == '5'
    bad_key = str(uuid.uuid4())
    request('fiados.php', 'POST', {**debt, 'monto': 999999}, admin, 404, bad_key)
    assert sql(f"SELECT COUNT(*) FROM operaciones_sincronizadas WHERE clave='{bad_key}'", DB).strip() == '0'
    print('PASS: sincronizacion idempotente de clientes, fiados, pagos, PATCH y DELETE; rollback de rechazo')
    print('PASS: PATCH nombre, DELETE logico, permisos, saldo/telefono inmutables, historial y CORS')
finally:
    if server:
        server.terminate()
        server.wait(timeout=10)
    # Solo elimina la base temporal con identificador generado por esta ejecución.
    assert DB.startswith('fiados_test_clientes_')
    if created:
        sql(f'DROP DATABASE IF EXISTS `{DB}`')
