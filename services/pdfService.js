import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generateShippingPdf(orders) {
  const outputDir = "public/pdf";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `ship-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  doc.pipe(fs.createWriteStream(outputPath));
  
  // 字體處理 (若無字體則使用內建，但中文會亂碼)
  const fontPath = path.join(process.cwd(), "public/fonts/msjh.ttc");
  if (fs.existsSync(fontPath)) {
    doc.font(fontPath);
  }

  doc.fontSize(22).text("📦 團購發貨小紙條", { align: "center" });
  doc.moveDown();

  const buyerGroups = orders.reduce((acc, o) => {
    if (!acc[o.buyerName]) acc[o.buyerName] = [];
    acc[o.buyerName].push(o);
    return acc;
  }, {});

  Object.entries(buyerGroups).forEach(([buyer, items]) => {
    doc.rect(doc.x, doc.y, 500, 2).fill("#06c755");
    doc.moveDown(0.5);
    doc.fillColor("black").fontSize(16).text(`買家：${buyer}`);
    
    let subtotal = 0;
    items.forEach(i => {
      doc.fontSize(12).text(`  - ${i.productName} (${i.color}/${i.size}) x ${i.qty}  [$${i.price * i.qty}]`);
      subtotal += i.price * i.qty;
    });
    
    doc.fontSize(12).text(`小計：$${subtotal}`, { align: "right" });
    doc.moveDown(1);
  });

  doc.end();
  return `/pdf/${filename}`;
}

export default { generateShippingPdf };