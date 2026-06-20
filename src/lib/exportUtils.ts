import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

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
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Title
      doc.fontSize(20).text('Farm ERP', { align: 'center' });
      doc.fontSize(16).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(2);

      // Table Header
      const startX = 30;
      let currentY = doc.y;
      
      doc.fontSize(10).font('Helvetica-Bold');
      let currentX = startX;
      columns.forEach(col => {
        doc.text(col.header, currentX, currentY, { width: col.width || 100 });
        currentX += (col.width || 100);
      });
      
      doc.moveDown();
      doc.moveTo(startX, doc.y).lineTo(565, doc.y).stroke();
      doc.moveDown(0.5);

      // Table Body
      doc.font('Helvetica');
      data.forEach((row, i) => {
        currentX = startX;
        currentY = doc.y;
        
        // Page break if needed
        if (currentY > 750) {
          doc.addPage();
          currentY = doc.y;
        }

        columns.forEach(col => {
          const val = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '';
          doc.text(val, currentX, currentY, { width: col.width || 100 });
          currentX += (col.width || 100);
        });
        doc.moveDown(0.5);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
