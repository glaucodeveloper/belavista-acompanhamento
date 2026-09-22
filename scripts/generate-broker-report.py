#!/usr/bin/env python3
import argparse, sqlite3, os, re, zipfile, html, math, datetime
from pathlib import Path
from xml.sax.saxutils import escape

ap=argparse.ArgumentParser();ap.add_argument('--db',required=True);ap.add_argument('--out',required=True);ap.add_argument('--month',required=True);args=ap.parse_args()
conn=sqlite3.connect(args.db);conn.row_factory=sqlite3.Row
sales=conn.execute("SELECT id,lot,client,broker,status,value_cents,created_at FROM commercial_sales ORDER BY created_at").fetchall()
reasons=conn.execute("SELECT id,label,description,share_percent,active FROM commission_reasons WHERE active=1 ORDER BY rowid").fetchall()
rate=float(os.getenv('BELAVISTA_COMMISSION_RATE','6'))/100.0
brokers=sorted({(r['broker'] or 'Sem corretor').strip() for r in sales}) or ['Sem corretor']
out=Path(args.out)/args.month;out.mkdir(parents=True,exist_ok=True)

def safe(s): return re.sub(r'[^A-Za-z0-9._-]+','-',s.strip()).strip('-') or 'corretor'
def money(cents): return f"R$ {cents/100:,.2f}".replace(',', 'X').replace('.', ',').replace('X','.')
def sales_for(broker,acc=False):
    rows=[]
    for r in sales:
        if (r['broker'] or 'Sem corretor').strip()!=broker: continue
        key=(r['created_at'] or '')[:7]
        if acc:
            if key>args.month: continue
        elif key!=args.month: continue
        rows.append(r)
    return rows

def reason_for(row,index):
    text=f"{row['notes'] or ''}".lower()
    if 'mensal' in text: return ('Mensal',70,30,'Parcelas mensais')
    if 'intermedi' in text: return ('Parcela intermediária',50,50,'Parcela intermediária')
    if 'sinal' in text or 'reserva' in text: return ('Sinal',50,50,'À vista / sinal')
    return [('Sinal',50,50,'À vista / sinal'),('Parcela intermediária',50,50,'Parcela intermediária'),('Mensal',70,30,'Parcelas mensais')][index%3]

def xlsx(path,broker,month_rows,acc_rows):
    rows=[['Repasse por corretor',broker,args.month],['Taxa-base configurável',f'{rate*100:.2f}%',''],[],['MÊS'],['Venda','Lote','Cliente','Razão','Pagamento','Valor venda','Comissão estimada','Warley','Contraparte','Situação']]
    for index,r in enumerate(month_rows):
        label,warley_share,partner_share,payment=reason_for(r,index);commission=r['value_cents']*rate/100
        rows.append([r['id'],r['lot'],r['client'],label,payment,r['value_cents']/100,commission,commission*warley_share/100,commission*partner_share/100,r['status']])
    rows += [[],['ACUMULADO'],['Venda','Lote','Cliente','Razão','Pagamento','Valor venda','Comissão estimada','Warley','Contraparte','Situação']]
    for index,r in enumerate(acc_rows):
        label,warley_share,partner_share,payment=reason_for(r,index);commission=r['value_cents']*rate/100
        rows.append([r['id'],r['lot'],r['client'],label,payment,r['value_cents']/100,commission,commission*warley_share/100,commission*partner_share/100,r['status']])
    rows += [[],['Razões de comissão','Participação']]
    for rr in reasons: rows.append([rr['label'],rr['share_percent']/100])
    shared=[];lookup={}
    def sst(v):
        v=str(v)
        if v not in lookup: lookup[v]=len(shared);shared.append(v)
        return lookup[v]
    xmlrows=[]
    for ri,row in enumerate(rows,1):
        cells=[]
        for ci,val in enumerate(row,1):
            col='';n=ci
            while n: n,rem=divmod(n-1,26);col=chr(65+rem)+col
            ref=f'{col}{ri}'
            if isinstance(val,(int,float)): cells.append(f'<c r="{ref}"><v>{val}</v></c>')
            else: cells.append(f'<c r="{ref}" t="s"><v>{sst(val)}</v></c>')
        xmlrows.append(f'<row r="{ri}">'+''.join(cells)+'</row>')
    sstxml='<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="%d" uniqueCount="%d">%s</sst>'%(len(shared),len(shared),''.join(f'<si><t>{escape(x)}</t></si>' for x in shared))
    sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+''.join(xmlrows)+'</sheetData></worksheet>'
    content='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'''
    rels='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'''
    wb='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Repasse" sheetId="1" r:id="rId1"/></sheets></workbook>'''
    wbr='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'''
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',content);z.writestr('_rels/.rels',rels);z.writestr('xl/workbook.xml',wb);z.writestr('xl/_rels/workbook.xml.rels',wbr);z.writestr('xl/worksheets/sheet1.xml',sheet);z.writestr('xl/sharedStrings.xml',sstxml)

def pdf(path,broker,month_rows,acc_rows):
    report_title='ALIANÇA PARK - REPASSE MENSAL POR CORRETOR'
    def pdf_escape(t): return str(t).replace('\\','\\\\').replace('(','\\(').replace(')','\\)').encode('latin-1','replace').decode('latin-1')
    def text(x,y,value,size=9,font='F1',color=(.12,.14,.17)):
        r,g,b=color;return f'{r} {g} {b} rg BT /{font} {size} Tf {x} {y} Td ({pdf_escape(value)}) Tj ET'
    def rect(x,y,w,h,fill=None,stroke=None):
        ops=[]
        if fill: ops.append(f'{fill[0]} {fill[1]} {fill[2]} rg {x} {y} {w} {h} re f')
        if stroke: ops.append(f'{stroke[0]} {stroke[1]} {stroke[2]} RG 0.6 w {x} {y} {w} {h} re S')
        return '\n'.join(ops)
    def line(x1,y1,x2,y2,color=(.75,.77,.8)):
        return f'{color[0]} {color[1]} {color[2]} RG 0.5 w {x1} {y1} m {x2} {y2} l S'
    ops=[rect(0,0,595,842,fill=(.96,.97,.98)),rect(0,752,595,90,fill=(.05,.12,.20))]
    ops += [text(38,807,'ALIANÇA PARK',22,'F2',(.96,.98,1)),text(40,783,report_title.split(' - ',1)[1],9,'F2',(.64,.78,.96)),text(410,807,args.month,10,'F2',(.96,.98,1)),text(410,783,'relatório gerencial',8,'F1',(.72,.8,.88))]
    ops += [text(38,720,f'Corretor: {broker}',12,'F2'),text(38,700,f'Competência: {args.month}  ·  Taxa-base: {rate*100:.2f}%',9),rect(38,648,519,34,fill=(.88,.93,.98),stroke=(.74,.8,.86))]
    month_total=sum(int(r['value_cents']*rate) for r in month_rows);acc_total=sum(int(r['value_cents']*rate) for r in acc_rows)
    ops += [text(50,667,'TOTAL DO MÊS',8,'F2',(.12,.25,.4)),text(180,663,money(month_total),14,'F2',(.05,.28,.55)),text(330,667,'TOTAL ACUMULADO',8,'F2',(.12,.25,.4)),text(460,663,money(acc_total),11,'F2',(.05,.28,.55))]
    ops += [text(38,620,'LANÇAMENTOS DO MÊS',9,'F2',(.05,.28,.55)),rect(38,592,519,20,fill=(.12,.23,.34))]
    headers=[(46,'CONTRATO'),(118,'LOTE'),(174,'CLIENTE'),(300,'RAZÃO'),(405,'COMISSÃO'),(480,'DIVISÃO')]
    for x,label in headers: ops.append(text(x,599,label,7,'F2',(.96,.98,1)))
    y=575
    for index,r in enumerate(month_rows[:15]):
        label,warley_share,partner_share,payment=reason_for(r,index);commission=int(r['value_cents']*rate)
        if index%2==0: ops.append(rect(38,y-6,519,20,fill=(.91,.94,.96)))
        ops += [text(46,y,r['id'][:10],7),text(118,y,str(r['lot'])[:9],7),text(174,y,str(r['client'])[:19],7),text(300,y,label[:16],7),text(405,y,money(commission),7,'F2'),text(480,y,f'{warley_share}/{partner_share}',7)]
        ops.append(line(38,y-8,557,y-8));y-=21
    y-=6;ops += [text(38,y,'COMPOSIÇÃO DAS RAZÕES',9,'F2',(.05,.28,.55))];y-=18
    for rr in reasons[:4]: ops.append(text(46,y,f"{rr['label']}: {rr['share_percent']:.1f}% da composição",8));y-=14
    ops += [text(38,40,'Aliança Park · documento gerencial para conferência do repasse',7,'F1',(.35,.4,.45)),text(450,40,'Página 1',7,'F1',(.35,.4,.45))]
    stream='\n'.join(ops).encode('latin-1')
    objs=[]
    objs.append(b'<< /Type /Catalog /Pages 2 0 R >>')
    objs.append(b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
    objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>')
    objs.append(b'<< /Length %d >>\nstream\n'%len(stream)+stream+b'\nendstream')
    objs.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    outb=bytearray(b'%PDF-1.4\n');offs=[0]
    for i,o in enumerate(objs,1): offs.append(len(outb));outb.extend(f'{i} 0 obj\n'.encode());outb.extend(o);outb.extend(b'\nendobj\n')
    xref=len(outb);outb.extend(f'xref\n0 {len(objs)+1}\n0000000000 65535 f \n'.encode())
    for off in offs[1:]: outb.extend(f'{off:010d} 00000 n \n'.encode())
    outb.extend(f'trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
    path.write_bytes(outb)

for broker in brokers:
    mr=sales_for(broker,False);ar=sales_for(broker,True);base=safe(broker)
    xlsx(out/f'{base}-{args.month}.xlsx',broker,mr,ar);pdf(out/f'{base}-{args.month}.pdf',broker,mr,ar)
print(f'generated {len(brokers)} broker reports in {out}')
