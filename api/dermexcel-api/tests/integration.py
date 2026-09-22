"""Run only against the isolated fiados_saas_test_20260921 database and PHP :8089."""
import json
import subprocess
import urllib.request
import urllib.error
import uuid

MYSQL = r'C:\xampp\mysql\bin\mysql.exe'
DB = 'fiados_saas_test_20260921'
BASE = 'http://localhost:8089/'

def sql(query):
    return subprocess.check_output([MYSQL, '-u', 'root', '--default-character-set=utf8mb4', DB, '-N'], input=query, encoding='utf-8').strip()

def request(path, body=None, token=None, status=200):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body is not None else None, headers=headers)
    try:
        response = urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        response = e
    data = json.loads(response.read())
    assert response.status == status, (path, response.status, data)
    return data

tag = uuid.uuid4().hex[:10]
sql("INSERT INTO negocios(nombre) VALUES ('Test A " + tag + "'),('Test B " + tag + "')")
a, b = sql("SELECT id FROM negocios WHERE nombre LIKE 'Test % " + tag + "' ORDER BY id").splitlines()
hashed = subprocess.check_output([r'C:\xampp\php\php.exe', '-r', "echo password_hash('Test-local-123', PASSWORD_DEFAULT);"], text=True)
for tenant, role, suffix in [(a,'vendedor','a'),(b,'vendedor','b'),(a,'cliente','c')]:
    sql(f"INSERT INTO usuarios(negocio_id,usuario,password,nombre,rol) VALUES ({tenant},'test_{tag}_{suffix}','{hashed}','Test','{role}')")
ta = request('login.php', {'usuario':f'test_{tag}_a','password':'Test-local-123'})['token']
tb = request('login.php', {'usuario':f'test_{tag}_b','password':'Test-local-123'})['token']
request('login.php', {'usuario':f'test_{tag}_c','password':'Test-local-123'}, status=403)
request('clientes.php', status=401)
c = request('clientes.php', {'nombre':'Cliente prueba'}, ta)['cliente']['id']
request('fiados.php', {'cliente_id':c,'monto':100,'detalle':'Prueba'}, ta)
request('fiados.php', {'cliente_id':c,'monto':50}, ta)
assert request(f'clientes.php?id={c}', token=ta)['cliente']['saldo'] == 150
request(f'clientes.php?id={c}', token=tb, status=404)
assert request('historial.php', token=tb)['movimientos'] == []
payment = {'cliente_id':c,'monto':40,'metodo_pago':'efectivo','clave_operacion':str(uuid.uuid4())}
request('pagos.php', payment, tb, status=404)
first = request('pagos.php', payment, ta)
again = request('pagos.php', payment, ta)
assert first['pago_id'] == again['pago_id'] and again['saldo_actualizado'] == 110
request('pagos.php', {**payment, 'monto':41}, ta, status=409)
for amount in [0,-1,1.001,100000000]:
    request('pagos.php', {**payment,'monto':amount,'clave_operacion':str(uuid.uuid4())}, ta, status=400)
request('pagos.php', {**payment,'monto':111,'clave_operacion':str(uuid.uuid4())}, ta, status=409)
request('pagos.php', {**payment,'monto':110,'metodo_pago':'transferencia','clave_operacion':str(uuid.uuid4())}, ta)
assert request(f'clientes.php?id={c}', token=ta)['cliente']['saldo'] == 0
assert len(request(f'historial.php?cliente_id={c}', token=ta)['movimientos']) == 4
assert request('resumen.php', token=ta)['resumen']['abonos_hoy'] == 150
request('clientes_desactivar.php', {'id':c}, ta, status=403)
for table in ['pagos','movimientos_fiado']:
    for operation in [f'UPDATE {table} SET monto=1 WHERE cliente_id={c}', f'DELETE FROM {table} WHERE cliente_id={c}']:
        result = subprocess.run([MYSQL,'-u','root',DB,'-e',operation], capture_output=True)
        assert result.returncode != 0, 'Historial debe ser inmutable'
request('logout.php', {}, ta)
request('clientes.php', token=ta, status=401)
print('PASS: login, roles, isolation, fiados, partial/full payments, retries, validation, history, summary, immutable records, logout')
