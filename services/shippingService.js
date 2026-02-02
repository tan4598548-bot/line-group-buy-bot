import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { getPendingOrders, markOrdersShipped } from "./sheetService.js";

export async function generateShippingPDF() {
  const orders = await getPendingOrders();
  if (!orders.length) throw new Error("沒有待出貨訂單");

  const doc = new PDFDocument({ size: [226, 600], margin: 10 });
  const filePath = path.join("/tmp", `shipping_${Date.now()}.pdf`);
  doc.pipe(fs.createWriteStream(filePath));

  let currentBuyer = "";
  let pageSubtotal = 0;
  let grandTotal = 0;
  let pageCount = 0;
  const shippedRows = [];

  for (const o of orders) {
    if (o.buyerName !== currentBuyer) {
      if (currentBuyer) {
        doc.text(`小計：$${pageSubtotal}`);
        doc.addPage();
        pageSubtotal = 0;
      }
      currentBuyer = o.buyerName;
      pageCount++;
      doc.fontSize(12).text(`買家：${o.buyerName}`);
      doc.moveDown(0.5);
    }

    const lineTotal = o.qty * o.price;
    doc.fontSize(10).text(
      `${o.productName} ${o.color}/${o.size} x${o.qty}  $${lineTotal}`
    );

    pageSubtotal += lineTotal;
    grandTotal += lineTotal;
    shippedRows.push(o._row);
  }

  doc.moveDown(0.5);
  doc.text(`小計：$${pageSubtotal}`);

  if (pageCount > 1) {
    doc.addPage();
    doc.fontSize(12).text(`總計：$${grandTotal}`);
  }

  doc.end();
  await markOrdersShipped(shippedRows);

  return filePath;
}
