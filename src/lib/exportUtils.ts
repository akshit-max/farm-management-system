import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function generateExcel(title: string, columns: any[], data: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  worksheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 20 }));
  
  // Title
  worksheet.insertRow(1, [title]);
  worksheet.mergeCells(1, 1, 1, columns.length);
  worksheet.getRow(1).font = { size: 16, bold: true };
  worksheet.getRow(1).alignment = { horizontal: 'center' };
  
  // Empty row
  worksheet.insertRow(2, []);

  // Header row styling
  const headerRow = worksheet.getRow(3);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center' };
  
  // Add data
  data.forEach(item => {
    worksheet.addRow(item);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function generatePdf(title: string, columns: any[], data: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // jsPDF v4: named export { jsPDF }, not default import
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('Farm ERP', 14, 22);
      
      doc.setFontSize(14);
      doc.text(title, 14, 32);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 42);

      const tableData = data.map(row => 
        columns.map(col => row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '')
      );
      
      const head = [columns.map(c => c.header)];

      // jspdf-autotable v5: use autoTable(doc, options) — not doc.autoTable()
      autoTable(doc, {
        startY: 50,
        head: head,
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [10, 49, 40] },
      });

      const arrayBuffer = doc.output('arraybuffer');
      const buffer = Buffer.from(arrayBuffer);
      resolve(buffer);
    } catch (err) {
      reject(err);
    }
  });
}
