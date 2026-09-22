"""Genera un PDF privado desde el snapshot JSON producido por PHP."""
import json
import sys
from decimal import Decimal
from html import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

def render(source, target):
    with open(source, encoding='utf-8') as stream:
        data = json.load(stream)
    red = colors.HexColor('#a64145')
    ink = colors.HexColor('#342c2b')
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('Brand', fontName='Helvetica-Bold', fontSize=23, leading=27, textColor=red, spaceAfter=12))
    styles.add(ParagraphStyle('SectionTitle', fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=red, spaceBefore=19, spaceAfter=9, keepWithNext=True))
    styles.add(ParagraphStyle('CellText', fontName='Helvetica', fontSize=8, leading=11, textColor=ink))
    styles.add(ParagraphStyle('CellHead', parent=styles['CellText'], fontName='Helvetica-Bold', textColor=colors.white))
    styles.add(ParagraphStyle('SmallInfo', fontSize=9, leading=13, textColor=ink, spaceAfter=6))
    styles.add(ParagraphStyle('Money', parent=styles['CellText'], alignment=TA_RIGHT))
    def para(text, style='CellText'):
        return Paragraph(escape(str(text or '')).replace('\n', '<br/>'), styles[style])
    def money(value):
        return '$' + format(Decimal(str(value)), ',.2f')
    def table(headers, rows, widths):
        cells = [[para(x, 'CellHead') for x in headers]]
        cells += [[para(x) for x in row] for row in rows]
        t = Table(cells, colWidths=widths, repeatRows=1, hAlign='LEFT')
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0),(-1,0),red), ('VALIGN',(0,0),(-1,-1),'TOP'),
            ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#faf7f4')]),
            ('LINEBELOW',(0,0),(-1,0),0.5,red),
            ('LINEBELOW',(0,1),(-1,-1),0.3,colors.HexColor('#eadfda')),
            ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
            ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ]))
        return t
    story = [para('FiadOS | Reporte diario','Brand'),para(data['negocio'],'Heading2'),
             para('Fecha: '+data['fecha']+' | Hora local: Ciudad de México | Importes en MXN','SmallInfo'),
             para('Periodo: '+data['inicio']+' a '+data['corte']+' (fin exclusivo).','SmallInfo'),
             para('PROVISIONAL: se completará después de medianoche.' if data['estado']=='provisional' else 'COMPLETO: incluye todos los movimientos de la fecha.','SmallInfo'),Spacer(1,10)]
    totals=data['totales']
    story.append(table(['Fiado en el día','Abonos recibidos','Deuda total al corte'],[[money(totals['fiados']),money(totals['abonos']),money(totals['deuda_total'])]],[173,173,173]))
    for key, title in [('abonos','Abonos recibidos'),('fiados','Fiados registrados')]:
        records=data[key]
        story.append(para(title+f' ({len(records)})','SectionTitle'))
        if not records:
            story.append(para('Sin movimientos en este periodo.','SmallInfo'))
            continue
        rows=[]
        for m in records:
            concept=m.get('metodo_pago') if key=='abonos' else m.get('detalle') or 'Sin descripción'
            rows.append([m['cliente']+'\n'+str(concept),m['creado_en'],m['vendedor'],money(m['monto']),money(m['saldo_al_corte'])])
        story.append(table(['Cliente / concepto','Fecha y hora','Registró','Monto','Debe al corte'],rows,[170,88,91,82,88]))
        story.append(Spacer(1,7)); story.append(para('Total '+key+': '+money(totals[key]),'SmallInfo'))
    story.append(para('Saldos por cliente al corte','SectionTitle'))
    story.append(para('Incluye clientes con movimientos en el día o deuda pendiente. El saldo se muestra una vez por cliente; no se suman los saldos repetidos en las tablas anteriores.','SmallInfo'))
    if data['clientes']:
        story.append(table(['Cliente','Saldo pendiente','Seguimiento'],[[c['nombre'],money(c['saldo']),f"{c['dias_sin_abono']} días sin abonar" if c['saldo']>0 and c['dias_sin_abono']>30 else 'Sin alerta por antigüedad'] for c in data['clientes']],[235,110,174]))
    else: story.append(para('Sin clientes con movimientos o deuda pendiente.','SmallInfo'))
    story.append(para('Seguimiento de más de 30 días','SectionTitle'))
    story.append(para('Indicador informativo: la antigüedad no retiene el crédito. Se cuenta desde el último abono o, si no existe, desde el primer fiado.','SmallInfo'))
    if data['alertas']:
        story.append(table(['Cliente','Días sin abonar','Desde','Saldo'],[[c['nombre'],c['dias_sin_abono'],c['referencia_desde'],money(c['saldo'])] for c in data['alertas']],[210,83,126,100]))
    else: story.append(para('Sin alertas de antigüedad al corte.','SmallInfo'))
    def footer(canvas, doc):
        canvas.saveState(); canvas.setFont('Helvetica',8); canvas.setFillColor(colors.HexColor('#746966'))
        canvas.drawString(38,25,'FiadOS - '+data['fecha']+' - '+data['estado'])
        canvas.drawRightString(A4[0]-38,25,f'Página {doc.page}'); canvas.restoreState()
    doc=SimpleDocTemplate(target,pagesize=A4,rightMargin=38,leftMargin=38,topMargin=35,bottomMargin=45,title='FiadOS - Reporte '+data['fecha'],author='FiadOS')
    doc.build(story,onFirstPage=footer,onLaterPages=footer)

if __name__ == '__main__':
    render(sys.argv[1],sys.argv[2])
