import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generateBuyerPackingPdf(buyerList) {
  const pdfDir = path.join("public", "pdf");
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  const fileName = `buyer-packing-${Date.now()}.pdf`;
  const filePath = path.join(pdfDir, fileName);

  const doc = new PDFDocument({
    size: "A4",
    margin: 20
  });

  doc.pipe(fs.createWriteStream(filePath));

  const pageWidth = doc.page.width - 40;
  const pageHeight = doc.page.height - 40;

  const cols = 4;
  const rows = 6;

  const cellWidth = pageWidth / cols;
  const cellHeight = pageHeight / rows;

  let index = 0;

  buyerList.forEach((buyer, i) => {
    if (i > 0 && i % (cols * rows) === 0) {
      doc.addPage();
    }

    const position = i % (cols * rows);
    const col = position % cols;
    const row = Math.floor(position / cols);

    const x = 20 + col * cellWidth;
    const y = 20 + row * cellHeight;

    // 裁切線
    doc
      .rect(x, y, cellWidth, cellHeight)
      .lineWidth(0.5)
      .dash(3, { space: 3 })
      .stroke()
      .undash();

    let cursorY = y + 8;

    // 買家名稱
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(buyer.buyerName, x + 6, cursorY);

    cursorY += 14;

    let total = 0;

    doc.fontSize(8).font("Helvetica");

    buyer.items.forEach(item => {
      const lineTotal = item.qty * item.price;
      total += lineTotal;

      doc.text(
        `${item.productName} ×${item.qty}  $${item.price}`,
        x + 6,
        cursorY,
        { width: cellWidth - 12 }
      );

      cursorY += 10;
    });

    cursorY += 6;

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(`合計：$${total}`, x + 6, cursorY);
  });

  doc.end();

  return filePath;
}
