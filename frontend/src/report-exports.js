import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoDataUrl from './assets/alianca-park-logo-mark.png?inline';

const roundMoney = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const decimal = value => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const safeFilePart = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const csvCell = value => {
  let text = String(value ?? '');
  if (/^[\s]*[=+@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

function reportColumns(type) {
  if (type === 'transfers') return [
    ['id', 'Identificação'], ['date', 'Data'], ['broker', 'Corretor'], ['lotLabel', 'Lote'], ['reason', 'Tipo de entrada'],
    ['amount', 'Entrada recebida'], ['commissionPercent', 'Comissão (%)'], ['commission', 'Comissão calculada'], ['warley', 'Warley'], ['partner', 'Parceiro'],
  ];
  return [
    ['id', 'Identificação'], ['name', type === 'materials' ? 'Material' : 'Serviço'], ['category', 'Categoria'],
    ['unit', 'Unidade'], ['quantity', 'Quantidade'], ['unitPrice', 'Valor unitário'], ['total', 'Valor total'],
  ];
}

function cellValue(type, row, key, repasseDetails) {
  if (key === 'id') return row.id || '—';
  if (type === 'transfers') {
    if (key === 'date') return dateLabel(row.date);
    if (key === 'reason') return repasseDetails(row).reason || row.reason || '—';
    if (key === 'commissionPercent') return `${decimal(row.commissionPercent)}%`;
    if (key === 'amount') return money(row.amount);
    if (['commission', 'warley', 'partner'].includes(key)) return money(repasseDetails(row)[key]);
    return row[key] ?? '—';
  }
  if (key === 'quantity') return decimal(row.quantity);
  if (key === 'unitPrice') return money(row.unitPrice);
  if (key === 'total') return money(row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0));
  return row[key] ?? '—';
}

function summaryItems(type, rows, repasseDetails) {
  if (type === 'transfers') {
    const sums = rows.reduce((result, row) => {
      const detail = repasseDetails(row);
      result.entries += Number(row.amount || 0);
      result.commission += detail.commission;
      result.warley += detail.warley;
      result.partner += detail.partner;
      return result;
    }, { entries: 0, commission: 0, warley: 0, partner: 0 });
    return [
      ['Registros', String(rows.length)], ['Entradas recebidas', money(roundMoney(sums.entries))],
      ['Comissões calculadas', money(roundMoney(sums.commission))], ['Warley / Parceiro', `${money(roundMoney(sums.warley))} / ${money(roundMoney(sums.partner))}`],
    ];
  }
  const total = rows.reduce((sum, row) => sum + Number(row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0)), 0);
  return [['Registros', String(rows.length)], ['Quantidade total', decimal(rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0))], ['Valor total', money(roundMoney(total))]];
}

export function exportReportCsv({ type, rows, title, owner, query = '', repasseDetails }) {
  const columns = reportColumns(type), generatedAt = new Date().toLocaleString('pt-BR');
  const header = columns.map(([, label]) => csvCell(label)).join(';');
  const body = rows.map(row => columns.map(([key]) => csvCell(cellValue(type, row, key, repasseDetails))).join(';'));
  const totals = summaryItems(type, rows, repasseDetails).map(([label, value]) => `${csvCell(label)};${csvCell(value)}`);
  const meta = [
    `${csvCell('Relatório')};${csvCell(title)}`,
    `${csvCell('Empreendimento')};${csvCell('Aliança Park')}`,
    `${csvCell('Responsável')};${csvCell(owner || '—')}`,
    `${csvCell('Emitido em')};${csvCell(generatedAt)}`,
    ...(query ? [`${csvCell('Filtro aplicado')};${csvCell(query)}`] : []),
    ...totals,
    '', header, ...body,
  ];
  const blob = new Blob([`\uFEFF${meta.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = `${safeFilePart(title)}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportReportPdf({ type, rows, title, owner, query = '', repasseDetails }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth(), pageHeight = doc.internal.pageSize.getHeight();
  const columns = reportColumns(type), summaries = summaryItems(type, rows, repasseDetails);
  const body = rows.map(row => columns.map(([key]) => cellValue(type, row, key, repasseDetails)));
  const emitted = new Date().toLocaleString('pt-BR');
  autoTable(doc, {
    head: [columns.map(([, label]) => label)], body, startY: 62,
    margin: { top: 32, right: 12, bottom: 14, left: 12 },
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 2.1, textColor: [42, 55, 75], lineColor: [222, 229, 237], lineWidth: 0.15, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [20, 34, 53], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
    alternateRowStyles: { fillColor: [246, 248, 251] },
    columnStyles: { 0: { cellWidth: 31 }, ...(type === 'transfers' ? { 1: { cellWidth: 20 }, 5: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' } } : { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }) },
    didDrawPage: data => {
      doc.setFillColor(17, 29, 46); doc.rect(0, 0, pageWidth, 28, 'F');
      doc.addImage(logoDataUrl, 'PNG', 12, 4, 19, 19);
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('ALIANÇA PARK', 37, 12);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(title, 37, 19);
      doc.setTextColor(205, 216, 231); doc.setFontSize(7); doc.text(`Emitido ${emitted}  ·  Responsável: ${owner || '—'}${query ? `  ·  Filtro: ${query}` : ''}`, 37, 24);
      if (data.pageNumber === 1) {
        const gap = 4, cardWidth = (pageWidth - 24 - gap * (summaries.length - 1)) / summaries.length;
        summaries.forEach(([label, value], index) => {
          const x = 12 + index * (cardWidth + gap); doc.setFillColor(244, 247, 250); doc.setDrawColor(225, 231, 239); doc.roundedRect(x, 33, cardWidth, 22, 2, 2, 'FD');
          doc.setTextColor(103, 118, 138); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(label, x + 4, 40);
          doc.setTextColor(29, 43, 62); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(doc.splitTextToSize(value, cardWidth - 8), x + 4, 49);
        });
      }
      doc.setDrawColor(225, 231, 239); doc.line(12, pageHeight - 10, pageWidth - 12, pageHeight - 10);
      doc.setTextColor(115, 128, 147); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text('Aliança Park · Relatório operacional', 12, pageHeight - 5);
      doc.text(`Página ${data.pageNumber}`, pageWidth - 12, pageHeight - 5, { align: 'right' });
    },
  });
  doc.save(`${safeFilePart(title)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
