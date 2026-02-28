import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// 使用 process.cwd() 確保在 Render 環境路徑正確
const fontPath = path.join(process.cwd(), "public/fonts/msjh.ttc");
const outputDir = path.join(process.cwd(), "public/pdf");

/**
 * 📦 產生買家發貨小紙條 (對齊需求：想要的 PDF 小紙張)
 */
export async function generateShippingPdf(orders) {
  // 自動建立資料夾以防 Render 缺少
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `ship-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // 檢查字體是否存在
  if (fs.existsSync(fontPath)) {
    doc.font(fontPath);
  } else {
    console.warn("⚠️ 警告：找不到 msjh.ttc 字體，中文可能亂碼");
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
      subtotal += (i.price || 0) * (i.qty || 0);
    });
    
    doc.fontSize(12).text(`小計：$${subtotal}`, { align: "right" });
    doc.moveDown(1);
  });

  doc.end();
  return new Promise((resolve) => {
    stream.on('finish', () => resolve(`/pdf/${filename}`));
  });
}

/**
 * 🏭 產生廠商採購彙總清單
 */
export async function generateVendorPdf(orderList) {
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