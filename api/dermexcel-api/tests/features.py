"""Integración de dashboard, crédito y reportes. Exclusivamente BD de prueba."""
import concurrent.futures
import datetime as dt
import json
import os
from pathlib import Path
import runpy
import subprocess
import urllib.request
import urllib.error
import uuid
from pypdf import PdfReader

base=runpy.run_path(str(Path(__file__).with_name('integration.py')))
sql,request,tag,a,b,hashed=[base[x] for x in ['sql','request','tag','a','b','hashed']]
sql(f"INSERT INTO usuarios(negocio_id,usuario,password,nombre,rol) VALUES ({a},'admin_{tag}','{hashed}','Admin prueba','admin')")
admin=request('login.php',{'usuario':f'admin_{tag}','password':'Test-local-123'})['token']
seller=request('login.php',{'usuario':f'test_{tag}_a','password':'Test-local-123'})['token']
other=request('login.php',{'usuario':f'test_{tag}_b','password':'Test-local-123'})['token']
uid=sql(f"SELECT id FROM usuarios WHERE usuario='test_{tag}_a'")
request('settings.php',token=seller,status=403)
config=request('settings.php',token=admin)['configuracion']
assert config['limite_credito']==10000 and len(config['rangos'])==5
def client(name='Prueba'):
    return request('clientes.php',{'nombre':name},seller)['cliente']['id']
def debt(cid,amount,status=200):
    return request('fiados.php',{'cliente_id':cid,'monto':amount},seller,status=status)
def pay(cid,amount):
    return request('pagos.php',{'cliente_id':cid,'monto':amount,'metodo_pago':'efectivo','clave_operacion':str(uuid.uuid4())},seller)
for amount,color in [(0,'verde'),(500,'verde'),(500.01,'amarillo'),(1200,'amarillo'),(1200.01,'amarillo'),(2500,'amarillo'),(2500.01,'naranja'),(4000,'naranja'),(4000.01,'rojo'),(10000,'rojo')]:
    cid=client('Rango '+str(amount))
    if amount: debt(cid,amount)
    c=request(f'clientes.php?id={cid}',token=seller)['cliente']
    assert c['color_deuda']==color,(amount,c)
    if amount==10000:
        debt(cid,.01,409);pay(cid,10);debt(cid,10);debt(cid,.01,409)
request('settings.php',{**config,'limite_credito':0},admin,status=400)
bad=json.loads(json.dumps(config));bad['rangos'][1]['hasta']=100
request('settings.php',bad,admin,status=400)
new={**config,'limite_credito':9000}
request('settings.php',new,seller,status=403)
request('settings.php',new,admin)
debt(cid,.01,409)
assert request('settings.php',token=admin)['historial']
assert float(sql(f'SELECT limite_credito FROM configuracion_negocio WHERE negocio_id={b}'))==10000
request('settings.php',config,admin)

# Antigüedad: 30 días sin alerta; 31 sí; un fiado nuevo no reinicia el contador.
old=client('Cliente sin abonos')
sql(f"UPDATE clientes SET creado_en=DATE_SUB(NOW(),INTERVAL 40 DAY) WHERE id={old}")
sql(f"INSERT INTO movimientos_fiado(negocio_id,cliente_id,usuario_id,monto,creado_en) VALUES ({a},{old},{uid},100,DATE_SUB(NOW(),INTERVAL 30 DAY))")
assert not request(f'clientes.php?id={old}',token=seller)['cliente']['alerta_antiguedad']
late=client('Cliente de seguimiento')
sql(f"UPDATE clientes SET creado_en=DATE_SUB(NOW(),INTERVAL 50 DAY) WHERE id={late}")
sql(f"INSERT INTO movimientos_fiado(negocio_id,cliente_id,usuario_id,monto,creado_en) VALUES ({a},{late},{uid},100,DATE_SUB(NOW(),INTERVAL 40 DAY))")
debt(late,20)
assert request(f'clientes.php?id={late}',token=seller)['cliente']['dias_sin_abono']==40
pay(late,10)
assert not request(f'clientes.php?id={late}',token=seller)['cliente']['alerta_antiguedad']
pending=client('Seguimiento histórico')
sql(f"UPDATE clientes SET creado_en=DATE_SUB(NOW(),INTERVAL 50 DAY) WHERE id={pending}")
sql(f"INSERT INTO movimientos_fiado(negocio_id,cliente_id,usuario_id,monto,creado_en) VALUES ({a},{pending},{uid},100,DATE_SUB(NOW(),INTERVAL 40 DAY))")

# Dashboard de fecha local: no mezclar ayer ni mañana.
today=sql('SELECT CURRENT_DATE'); yesterday=sql('SELECT DATE_SUB(CURRENT_DATE,INTERVAL 1 DAY)'); tomorrow=sql('SELECT DATE_ADD(CURRENT_DATE,INTERVAL 1 DAY)')
hist=client('José & María <Tienda> con nombre largo para comprobar el PDF')
sql(f"UPDATE clientes SET creado_en='{yesterday} 00:00:00' WHERE id={hist}")
sql(f"INSERT INTO movimientos_fiado(negocio_id,cliente_id,usuario_id,monto,detalle,creado_en) VALUES ({a},{hist},{uid},100,'Venta temprana','{yesterday} 10:00:00'),({a},{hist},{uid},50,'Venta después de las once','{yesterday} 23:30:00'),({a},{hist},{uid},25,'Venta a medianoche','{today} 00:00:00')")
sql(f"INSERT INTO pagos(negocio_id,cliente_id,usuario_id,monto,metodo_pago,creado_en) VALUES ({a},{hist},{uid},40,'transferencia','{yesterday} 23:45:00')")
dash=request('dashboard.php',token=seller)['resumen']
expected=int(sql(f"SELECT COUNT(*) FROM movimientos_fiado WHERE negocio_id={a} AND creado_en>='{today}' AND creado_en<'{tomorrow}'"))
assert dash['fiados_hoy']==expected and dash['fecha']==today
assert request('dashboard.php',token=other)['resumen']['fiados_hoy']==0

# Reportes: permisos, provisional, cierre completo, idempotencia y saldo histórico.
request('reportes.php',{'fecha':yesterday},seller,status=403)
request('reportes.php',{'fecha':tomorrow},admin,status=400)
request('reportes.php',{'fecha':'2026-02-30'},admin,status=400)
provisional=request('reportes.php',{'fecha':today},admin)['id']
assert request('reportes.php?fecha='+today,token=seller)['reportes'][0]['estado']=='provisional'
# Simular un corte de ayer ya guardado a las 23:00. El cierre debe incluir 23:30 y 23:45.
sql(f"INSERT INTO reportes_diarios(negocio_id,fecha,estado,corte,snapshot_json,archivo) VALUES ({a},'{yesterday}','provisional','{yesterday} 23:00:00','{{}}','provisional-test.pdf')")
report=request('reportes.php',{'fecha':yesterday},admin)['id']
row=request('reportes.php?fecha='+yesterday,token=seller)['reportes'][0]
assert row['estado']=='completo' and row['revision']==2
snap=json.loads(sql(f'SELECT snapshot_json FROM reportes_diarios WHERE id={report}'))
assert len([m for m in snap['fiados'] if m['cliente_id']==hist])==2
assert next(c['saldo'] for c in snap['clientes'] if c['id']==hist)==110
assert next(c['saldo'] for c in request('clientes.php',token=seller)['clientes'] if c['id']==hist)==135
assert any(c['id']==pending for c in snap['alertas'])
assert request(f'clientes.php?id={pending}',token=seller)['cliente']['seguimiento']
request(f'reportes.php?id={report}',token=other,status=404)
again=request('reportes.php',{'fecha':yesterday},admin)['id']
assert again==report and request('reportes.php?fecha='+yesterday,token=seller)['reportes'][0]['revision']==2
pdf=urllib.request.urlopen(urllib.request.Request(f'http://localhost:8089/reportes.php?id={report}',headers={'Authorization':'Bearer '+seller})).read()
assert pdf.startswith(b'%PDF')
out=Path('output/pdf');out.mkdir(parents=True,exist_ok=True)
sample=out/'reporte-diario-ejemplo.pdf';sample.write_bytes(pdf)
text='\n'.join(page.extract_text() for page in PdfReader(sample).pages)
assert text.index('Abonos recibidos (') < text.index('Fiados registrados (')
assert '23:30:00' in text and '23:45:00' in text and '$110.00' in text
assert '00:00:00' in text # Cabecera del periodo, no movimiento a medianoche.
assert 'Venta a medianoche' not in text

# Carrera de dos PHP independientes contra el mismo saldo.
concurrent=client('Concurrencia');debt(concurrent,9900)
env=os.environ.copy();env['FIADOS_DB_NAME']='fiados_saas_test_20260921'
server=subprocess.Popen([r'C:\xampp\php\php.exe','-S','localhost:8090','-t',str(Path(__file__).resolve().parents[1])],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    import time
    for _ in range(50):
        try: urllib.request.urlopen('http://localhost:8090/login.php')
        except urllib.error.HTTPError: break
        except OSError: time.sleep(.1)
    def charge(port):
        req=urllib.request.Request(f'http://localhost:{port}/fiados.php',data=json.dumps({'cliente_id':concurrent,'monto':80}).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+seller})
        try: return urllib.request.urlopen(req).status
        except urllib.error.HTTPError as e:return e.code
    with __import__('concurrent.futures',fromlist=['ThreadPoolExecutor']).ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(charge,[8089,8090]))==[200,409]
    assert request(f'clientes.php?id={concurrent}',token=seller)['cliente']['saldo']==9980
finally: server.terminate();server.wait()
print('PASS: rangos y bordes, límite y concurrencia, settings/auditoría/roles, 30 días, dashboard por fecha, PDF separado, corte completo, saldo histórico, seguimiento e aislamiento')
print('PDF de prueba:',sample.resolve())
