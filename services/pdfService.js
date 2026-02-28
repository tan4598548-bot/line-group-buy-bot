import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const fontPath = path.join(process.cwd(), "public/fonts/msjh.ttc");

export async function generateShippingPdf(orders) {
  const outputDir = "public/pdf";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `ship-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);
  if (fs.existsSync(fontPath)) doc.font(fontPath);

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
  return new Promise((resolve) => {
    stream.on('finish', () => resolve(`/pdf/${filename}`));
  });
}

export async function generateVendorPdf(orderList) {
  const outputDir = "public/pdf";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `vendor-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);
  if (fs.existsSync(fontPath)) doc.font(fontPath);

  doc.fontSize(22).text("🏭 廠商採購彙總清單", { align: "center" });
  doc.moveDown();

  orderList.forEach(item => {
    doc.fontSize(12).text(`${item.productCode} | ${item.productName} | ${item.color}/${item.size} | 數量: ${item.qty}`);
    doc.moveDown(0.5);
  });

  doc.end();
  return new Promise((resolve) => {
    stream.on('finish', () => resolve(`/pdf/${filename}`));
  });
}

export default { generateShippingPdf, generateVendorPdf };