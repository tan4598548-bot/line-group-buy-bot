// services/pdfService.js
import PDFDocument from 'pdfkit';
import fs from 'fs';

export function generateShippingPDF(orders) {
  const fileName = `shipping_${Date.now()}.pdf`;
  const filePath = `./tmp/${fileName}`;

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(16).text('出貨明細', { align: 'center' });
  doc.moveDown();

  orders.forEach(o => {
    doc
      .fontSize(12)
      .text(
        `${o.product} ${o.color} ${o.size} x ${o.qty}（${o.buyer}）`
      );
  });

  doc.end();
  return fileName;
}
