import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generateOverstockShippingPdf(orders) {
  const doc = new PDFDocument({ margin: 40 });
  const fileName = `overstock-shipping-${Date.now()}.pdf`;
  const filePath = path.join("public/pdf", fileName);

  doc.pipe(fs.createWriteStream(filePath));

  let currentBuyer = "";

  orders.forEach((o, idx) => {
    if (o.buyerName !== currentBuyer) {
      if (idx !== 0) doc.addPage();
      currentBuyer = o.buyerName;

      doc.fontSize(18).text("📦 現貨出清 出貨單", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).text(`買家：${o.buyerName}`);
      doc.moveDown();
    }

    doc.fontSize(12).text(
      `• ${o.productName} / ${o.color} / ${o.size}  $${o.price}`
    );
  });

  const total = orders.reduce((s, o) => s + Number(o.price), 0);
  doc.moveDown();
  doc.fontSize(14).text(`總計：$${total}`);

  doc.end();
  return fileName;
}
