import { Capacitor, registerPlugin } from '@capacitor/core';
export const PlotExport = registerPlugin('PlotExport');
export async function saveReportCsv(bytes, filename) {
  if (window.atlasFiles?.saveReportCsv) return window.atlasFiles.saveReportCsv(filename, bytes);
  if (Capacitor.getPlatform() === 'android') {
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Não foi possível preparar a planilha.')); reader.readAsDataURL(new Blob([bytes], { type: 'text/csv;charset=utf-8' })); });
    const prepared = await PlotExport.prepare({ data, format: 'csv' });
    return PlotExport.save({ filename, token: prepared.token, format: 'csv' });
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { canceled: false };
}
export async function savePlotPdf(doc, filename) {
  const bytes = doc.output('arraybuffer');
  if (window.atlasFiles?.saveProgressPdf) return window.atlasFiles.saveProgressPdf(filename, bytes);
  if (Capacitor.getPlatform() === 'android') {
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Não foi possível preparar o PDF.')); reader.readAsDataURL(new Blob([bytes], { type: 'application/pdf' })); });
    const prepared = await PlotExport.prepare({ data });
    return PlotExport.save({ filename, token: prepared.token });
  }
  doc.save(filename);
  return { canceled: false };
}
