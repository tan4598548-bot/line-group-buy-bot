import PDFDocument from "pdfkit";
import fs from "fs";

/**
 * orders: [
 *   {
 *     buyerName,
 *     productName,
 *     color,
 *     size,
 *     quantity,
 *     price
 *   }
 * ]
 */
export function generateBuyerPackingPDF(buyerOrdersMap, outputPath) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 20
  });

  doc.pipe(fs.createWriteStream(outputPath));

  const pageWidth = doc.page.width - 40;
  const pageHeight = doc.page.height - 40;

  const cols = 4;
  const rows = 6;

  const cellWidth = pageWidth / cols;
  const cellHeight = pageHeight / rows;

  let index = 0;

  for (const [buyerName, orders] of Object.entries(buyerOrdersMap)) {
    const col = index % cols;
    const row = Math.floor(index / cols) % rows;

    if (index > 0 && index % (cols * rows) === 0) {
      doc.addPage();
    }

    const x = 20 + col * cellWidth;
    const y = 20 + row * cellHeight;

    doc
      .rect(x, y, cellWidth - 5, cellHeight - 5)
      .stroke();

    let cursorY = y + 8;

    doc
      .fontSize(9)
      .text(`買家：${buyerName}`, x + 6, cursorY);

    cursorY += 14;

    let total = 0;

    orders.forEach(o => {
      const lineTotal = (o.price || 0) * o.quantity;
      total += lineTotal;

      doc
        .fontSize(8)
        .text(
          `${o.productName}`,
          x + 6,
          cursorY
        );

      cursorY += 10;

      doc
        .fontSize(8)
        .text(
          `${o.color || ""} ${o.size || ""} x${o.quantity}  $${o.price || "--"}`,
          x + 10,
          cursorY
        );

      cursorY += 12;
    });

    cursorY += 6;

    doc
      .fontSize(8)
      .text(`合計：$${total}`, x + 6, cursorY);

    index++;
  }

  doc.end();
}
