const express = require('express');
const path = require('path');
const PDFDocument = require('pdfkit'); // 請確保已執行 npm install pdfkit
const app = express();

app.use(express.json());
app.use(express.static('public'));

// 模擬管理員名單 (請替換為您的 LINE User ID)
const ADMIN_IDS = ['U1234567890abcdef...', '您的實際ID']; 

// 權限檢查中間層
const adminAuth = (req, res, next) => {
  const userId = req.headers['x-liff-user-id'];
  if (ADMIN_IDS.includes(userId)) {
    next();
  } else {
    res.status(403).json({ error: "非管理員，拒絕訪問" });
  }
};

// --- [API] 1. 商品管理: 建立商品 ---
app.post('/api/admin/products/create', adminAuth, async (req, res) => {
  try {
    const { productName, price, cost, colorMap } = req.body;
    if (!productName || !price) return res.status(400).json({ error: "資料不完整" });
    // 這裡應接 Google Sheet 寫入邏輯
    console.log("上架商品:", req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- [API] 2. 訂單與廠商彙整: 取得資料 ---
app.get('/api/admin/orders', adminAuth, async (req, res) => {
  // 模擬從試算表抓取資料
  const mockOrders = [
    { order_id: '101', buyer_name: '王小明', product_name: '日系牙刷', color: '藍', size: 'M', qty: 2, status: 'arrived' },
    { order_id: '102', buyer_name: '李小華', product_name: '美背背心', color: '黑', size: 'F', qty: 1, status: 'arrived' }
  ];
  res.json(mockOrders);
});

app.get('/api/admin/vendor-orders', adminAuth, async (req, res) => {
  // 模擬廠商採購彙整資料
  const summary = [
    { product_name: '日系牙刷', total_ordered: 50, cost: 35, color: '混色', vendor_note: '預計週三到貨' }
  ];
  res.json(summary);
});

// --- [API] 4. 發貨 PDF 產出核心邏輯 ---
app.get('/api/admin/generate-pdf', async (req, res) => {
  const ids = req.query.ids ? req.query.ids.split(',') : [];
  if (ids.length === 0) return res.status(400).send("未勾選訂單");

  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=shipping_labels.pdf');
  doc.pipe(res);

  // 模擬抓取勾選的訂單詳情
  const ordersToShip = [
    { buyer_name: '測試買家', product_name: '示範商品', color: '紅', size: 'L', qty: 1 }
  ];

  ordersToShip.forEach((order, index) => {
    // 繪製標籤框格 (小紙張感)
    const yPos = 50 + (index * 150);
    doc.rect(50, yPos, 400, 120).stroke();
    doc.fontSize(16).text(`買家: ${order.buyer_name}`, 70, yPos + 20);
    doc.fontSize(12).text(`商品: ${order.product_name}`, 70, yPos + 50);
    doc.text(`規格: ${order.color} / ${order.size}`, 70, yPos + 70);
    doc.fontSize(20).text(`數量: ${order.qty}`, 350, yPos + 80);
  });

  doc.end();
});

// --- [API] 買家端: 獲取所有商品 ---
app.get('/api/products', async (req, res) => {
  // 這裡應從 Google Sheet 讀取
  res.json([{ productCode: 'P01', productName: '日系牙刷', price: 250, active: true, type: 'normal' }]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));