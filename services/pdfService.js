import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// 確保路徑與 Render 環境相容
const fontPath = path.join(process.cwd(), "public", "fonts", "msjh.ttc");
const outputDir = path.join(process.cwd(), "public", "pdf");

/**
 * 📦 產生買家發貨小紙條 (整合 Orders 頁面資料)
 */
export async function generateShippingPdf(orders) {
  // 自動建立資料夾
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `ship-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const stream = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    doc.pipe(stream);

    // 處理中文字體 (針對 TTC 格式建議加上索引)
    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    } else {
      console.error(`❌ 找不到字體檔於: ${fontPath}`);
    }

    // 標題
    doc.fontSize(22).text("📦 團購發貨小紙條", { align: "center" });
    doc.moveDown();

    // 依買家名稱分組
    const buyerGroups = orders.reduce((acc, o) => {
      if (!acc[o.buyerName]) acc[o.buyerName] = [];
      acc[o.buyerName].push(o);
      return acc;
    }, {});

    Object.entries(buyerGroups).forEach(([buyer, items]) => {
      // 綠色分隔線 (LINE 風格)
      doc.rect(doc.x, doc.y, 500, 2).fill("#06c755");
      doc.moveDown(0.5);
      
      doc.fillColor("black").fontSize(16).text(`買家：${buyer}`);
      
      let subtotal = 0;
      items.forEach(i => {
        // 修正：將 color/size 統一為 spec 以對應資料庫結構
        const specDisplay = i.spec ? ` (${i.spec})` : "";
        doc.fontSize(12).fillColor("#333").text(`  - ${i.productName}${specDisplay} x ${i.qty}  [$${i.total}]`);
        subtotal += parseInt(i.total || 0);
      });
      
      doc.fontSize(12).fillColor("black").text(`本張總計：$${subtotal}`, { align: "right" });
      doc.moveDown(1.5);
    });

    doc.end();

    stream.on('finish', () => resolve(`/pdf/${filename}`));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * 🏭 產生廠商採購彙總清單 (整合 VendorOrders 資料)
 */
export async function generateVendorPdf(orderList) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `vendor-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const stream = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    doc.pipe(stream);
    if (fs.existsSync(fontPath)) doc.font(fontPath);

    doc.fontSize(22).text("🏭 廠商採購彙總清單", { align: "center" });
    doc.moveDown();

    // 繪製表格標題
    doc.fontSize(12).text(`商品代碼 | 商品名稱 | 規格 | 採購數`, { underline: true });
    doc.moveDown(0.5);

    orderList.forEach(item => {
      // 支援 VendorOrders 或彙整後的物件結構
      const code = item.productCode || "";
      const name = item.productName || "";
      const spec = item.spec || item.specSize || "";
      const qty = item.totalQty || item.qty || 0;

      doc.fontSize(11).text(`${code} | ${name} | ${spec} | 數量: ${qty}`);
      doc.moveDown(0.5);
    });

    doc.end();
    stream.on('finish', () => resolve(`/pdf/${filename}`));
    stream.on('error', (err) => reject(err));
  });
}

export default { generateShippingPdf, generateVendorPdf };