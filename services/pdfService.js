import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// 取得通用字體路徑
const fontPath = path.join(process.cwd(), "public/fonts/msjh.ttc");

/**
 * 📦 產生買家發貨小紙條 (Shipping PDF)
 */
export async function generateShippingPdf(orders) {
  const outputDir = "public/pdf";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `ship-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  doc.pipe(fs.createWriteStream(outputPath));
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
  return `/pdf/${filename}`;
}

/**
 * 🏭 產生廠商採購彙總表 (Vendor Order PDF)
 * 對齊圖片 2 (廠商管理需求)
 */
export async function generateVendorPdf(orderList) {
  const outputDir = "public/pdf";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `vendor-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  doc.pipe(fs.createWriteStream(outputPath));
  if (fs.existsSync(fontPath)) doc.font(fontPath);

  doc.fontSize(22).text("🏭 廠商採購彙總清單", { align: "center" });
  doc.fontSize(10).text(`產生日期：${new Date().toLocaleString()}`, { align: "center" });
  doc.moveDown();

  // 表格標題
  doc.fontSize(12).fillColor("#333");
  doc.text("商品代碼      商品名稱                     規格(顏色/尺寸)    數量", { underline: true });
  doc.moveDown(0.5);

  orderList.forEach(item => {
    const code = item.productCode.padEnd(12);
    const name = item.productName.substring(0, 15).padEnd(20);
    const spec = `${item.color || ''}/${item.size || ''}`.padEnd(18);
    const qty = `${item.qty}`.padStart(5);
    
    doc.fontSize(11).text(`${code} ${name} ${spec} ${qty}`);
    doc.moveDown(0.3);
  });

  doc.end();
  return `/pdf/${filename}`;
}

export default { generateShippingPdf, generateVendorPdf };