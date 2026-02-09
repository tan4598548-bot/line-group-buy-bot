import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * 出貨清單 PDF
 * orders: [
 *   {
 *     orderId,
 *     buyerName,
 *     productName,
 *     color,
 *     size,
 *     quantity
 *   }
 * ]
 */
export function generateShippingPdf(orders = []) {
  if (!orders.length) {
    throw new Error("無出貨資料可產生 PDF");
  }

  const outputDir = "public/pdf";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(
    outputDir,
    `shipping_list_${Date.now()}.pdf`
  );

  const doc = new PDFDocument({
    size: "A4",
    margin: 40
  });

  doc.pipe(fs.createWriteStream(filePath));

  /* ===== 標題 ===== */
  doc
    .fontSize(18)
    .text("📦 出貨清單", { align: "center" })
    .moveDown(1);

  doc
    .fontSize(10)
    .text(`產生時間：${new Date().toLocaleString()}`)
    .moveDown(1.5);

  /* ===== 表頭 ===== */
  const startY = doc.y;
  const colX = {
    no: 40,
    buyer: 70,
    product: 150,
    spec: 340,
    qty: 470
  };

  doc
    .fontSize(10)
    .text("序", colX.no, startY)
    .text("買家", colX.buyer, startY)
    .text("商品", colX.product, startY)
    .text("規格", colX.spec, startY)
    .text("數量", colX.qty, startY);

  doc
    .moveTo(40, startY + 15)
    .lineTo(550, startY + 15)
    .stroke();

  let y = startY + 25;

  /* ===== 內容 ===== */
  orders.forEach((o, i) => {
    if (y > 760) {
      doc.addPage();
      y = 60;
    }

    doc
      .fontSize(9)
      .text(i + 1, colX.no, y)
      .text(o.buyerName || "-", colX.buyer, y)
      .text(o.productName || "-", colX.product, y)
      .text(
        `${o.color || ""} ${o.size || ""}`.trim(),
        colX.spec,
        y
      )
      .text(o.quantity || 0, colX.qty, y);

    y += 18;
  });

  doc.end();
  return filePath;
}
