import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generateBuyerPackingPdf(buyerMap) {
  const outputDir = "public/pdf";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `buyer-packing-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);

  const doc = new PDFDocument({
    size: "A4",
    margin: 20
  });

  doc.pipe(fs.createWriteStream(outputPath));

  const pageWidth = doc.page.width - 40;
  const pageHeight = doc.page.height - 40;

  const cols = 4;
  const rows = 6;
  const cellW = pageWidth / cols;
  const cellH = pageHeight / rows;

  let index = 0;

  for (const [buyerId, orders] of Object.entries(buyerMap)) {
    const col = index % cols;
    const row = Math.floor(index / cols) % rows;

    if (index > 0 && index % (cols * rows) === 0) {
      doc.addPage();
    }

    const x = 20 + col * cellW;
    const y = 20 + row * cellH;

    doc.rect(x, y, cellW - 6, cellH - 6).stroke();
    doc.dash(3, { space: 3 }).rect(x + 3, y + 3, cellW - 12, cellH - 12).stroke().undash();

    let cursorY = y + 10;
    doc.fontSize(9).text(`買家：${buyerId}`, x + 8, cursorY);
    cursorY += 14;

    let total = 0;
    orders.forEach(o => {
      const lineTotal = o.price * o.quantity;
      total += lineTotal;
      doc.fontSize(8).text(`${o.productName}`, x + 8, cursorY);
      cursorY += 10;
      doc.fontSize(8).text(`x${o.quantity}  單價 $${o.price}`, x + 14, cursorY);
      cursorY += 12;
    });

    cursorY += 4;
    doc.fontSize(9).text(`合計：$${total}`, x + 8, cursorY);
    index++;
  }

  doc.end();
  return outputPath;
}

// 補上對應 adminRoutes 可能需要的函式名
export const generateShippingPdf = generateBuyerPackingPdf;

// 預設匯出，解決 SyntaxError
const pdfService = {
  generateBuyerPackingPdf,
  generateShippingPdf
};
export default pdfService;