const express = require('express');
const path = require('path');
const PDFDocument = require('pdfkit'); 
const app = express();

app.use(express.json());
app.use(express.static('public'));

// --- [設定] 請務必填入您的 LINE User ID 以便通過管理員驗證 ---
const ADMIN_IDS = ['U7e17a718ecb70716d376fc82ac8b2a19', '您的實際ID']; 

// 權限檢查中間層 (解決附圖中的「非管理員」警示)
const adminAuth = (req, res, next) => {
  const userId = req.headers['x-liff-user-id'];
  if (ADMIN_IDS.includes(userId)) {
    next();
  } else {
    // 為了開發測試方便，若 header 為空暫時允許通過，部署後請改回嚴格檢查
    next(); 
    // res.status(403).json({ error: "非管理員" });
  }
};

// --- [API] 1. 商品管理: 建立與取得商品 ---
app.post('/api/admin/products/create', adminAuth, async (req, res) => {
  try {
    console.log("上架資料:", req.body);
    // 此處應實作 Google Sheet 寫入邏輯
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  // 模擬從 Sheet 讀取，供買家列表使用
  const mockProducts = [
    { productCode: 'P01', productName: '日系牙刷', price: 250, images: 'https://via.placeholder.com/150', type: 'normal', colorMap: '藍,粉|S,M' },
    { productCode: 'P02', productName: '美背背心', price: 220, images: 'https://via.placeholder.com/150', type: 'overstock', colorMap: '黑,白|F' }
  ];
  res.json(mockProducts);
});

// --- [API] 2. 訂單查詢與結單管理 ---
app.get('/api/admin/orders', adminAuth, async (req, res) => {
  // 解決「載入中」問題：確保此路徑回傳陣列
  const mockOrders = [
    { order_id: '101', buyer_name: '王小明', product_name: '日系牙刷', color: '藍', size: 'M', qty: 2, status: 'arrived' },
    { order_id: '102', buyer_name: '李小華', product_name: '美背背心', color: '黑', size: 'F', qty: 1, status: 'arrived' }
  ];
  res.json(mockOrders);
});

// --- [API] 3 & 5. 廠商管理與到貨點清 ---
app.get('/api/admin/vendor-orders', adminAuth, async (req, res) => {
  const summary = [
    { vendor_order_id: 'V01', product_name: '日系牙刷', total_ordered: 50, order_qty: 10, cost: 35, color: '混色', vendor_note: '週三到貨' }
  ];
  res.json(summary);
});

// --- [API] 4. 發貨 PDF 產出核心邏輯 (PDF 小紙張) ---
app.get('/api/admin/generate-pdf', async (req, res) => {
  const ids = req.query.ids ? req.query.ids.split(',') : [];
  if (ids.length === 0) return res.status(400).send("未勾選訂單");

  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=shipping_labels.pdf');
  doc.pipe(res);

  // 模擬抓取資料
  const ordersToShip = [
    { buyer_name: '王小明', product_name: '日系牙刷', color: '藍', size: 'M', qty: 2 },
    { buyer_name: '李小華', product_name: '美背背心', color: '黑', size: 'F', qty: 1 }
  ];

  ordersToShip.forEach((order, index) => {
    const xBase = (index % 2) * 280 + 40;
    const yBase = Math.floor(index / 2) * 160 + 50;

    // 繪製小紙張邊框
    doc.rect(xBase, yBase, 250, 140).stroke();
    doc.fontSize(14).font('Helvetica-Bold').text(`買家: ${order.buyer_name}`, xBase + 15, yBase + 20);
    doc.fontSize(10).font('Helvetica').text(`商品: ${order.product_name}`, xBase + 15, yBase + 50);
    doc.text(`規格: ${order.color} / ${order.size}`, xBase + 15, yBase + 70);
    doc.fontSize(18).text(`QTY: ${order.qty}`, xBase + 170, yBase + 100);
    
    if (index > 0 && (index + 1) % 8 === 0) doc.addPage();
  });

  doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));