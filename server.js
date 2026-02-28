const express = require('express');
const path = require('path');
const PDFDocument = require('pdfkit'); 
const app = express();

app.use(express.json());
app.use(express.static('public'));

// --- [核心邏輯] 模擬資料庫 (未來請串接 Google Sheet) ---
// 這裡的資料結構必須與您的前端網頁 ID 匹配，清單才會出現
let mockOrders = [
  { order_id: '101', buyer_name: '王小明', product_name: '日系牙刷', color: '藍', size: 'M', qty: 2, status: 'arrived' },
  { order_id: '102', buyer_name: '李小華', product_name: '美背背心', color: '黑', size: 'F', qty: 1, status: 'arrived' }
];

// --- [API] 1. 商品列表 (買家/管理員通用) ---
app.get('/api/products', async (req, res) => {
  res.json([
    { productCode: 'P01', productName: '日系牙刷', price: 250, type: 'normal', colorMap: '藍,粉|S,M' },
    { productCode: 'P02', productName: '美背背心', price: 220, type: 'overstock', colorMap: '黑,白|F' }
  ]);
});

// --- [API] 2. 訂單查詢 (解決 400 錯誤) ---
app.get('/api/admin/orders', async (req, res) => {
  // 確保回傳的是陣列，前端才能 .map() 渲染清單
  res.json(mockOrders);
});

// --- [API] 3 & 5. 點貨與廠商管理清單 ---
app.get('/api/admin/vendor-orders', async (req, res) => {
  // 這裡回傳的資料會顯示在「到貨點清」與「廠商管理」頁面
  res.json([
    { vendor_order_id: 'V01', product_name: '日系牙刷', order_qty: 10, color: '藍', cost: 35 },
    { vendor_order_id: 'V02', product_name: '美背背心', order_qty: 5, color: '黑', cost: 100 }
  ]);
});

// --- [API] 4. 發貨 PDF 產出邏輯 ---
app.get('/api/admin/generate-pdf', async (req, res) => {
  const ids = req.query.ids ? req.query.ids.split(',') : [];
  if (ids.length === 0) return res.status(400).send("未勾選訂單");

  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=shipping_labels.pdf');
  doc.pipe(res);

  // 過濾出被勾選的訂單
  const toShip = mockOrders.filter(o => ids.includes(o.order_id));

  toShip.forEach((order, index) => {
    const yPos = 50 + (index * 150);
    doc.rect(50, yPos, 400, 120).stroke();
    doc.fontSize(16).text(`買家: ${order.buyer_name}`, 70, yPos + 20);
    doc.fontSize(12).text(`商品: ${order.product_name} (${order.color}/${order.size})`, 70, yPos + 50);
    doc.fontSize(20).text(`數量: ${order.qty}`, 350, yPos + 80);
  });

  doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));