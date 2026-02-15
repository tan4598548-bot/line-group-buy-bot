import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const PRODUCT_SHEET = "Products";
const ORDER_SHEET = "Orders";

async function readSheet(sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return res.data.values || [];
}

export async function writeCell(sheet, cell, value) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!${cell}`,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
}

/* ===== Products 相關 ===== */
export async function getProducts() {
  const rows = await readSheet(PRODUCT_SHEET);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r, i) => ({
    productCode: r[0], productName: r[1], colorMap: r[2],
    price: Number(r[3]), active: r[4] === "TRUE",
    closeDate: r[5], reminded: r[6] === "TRUE",
    closed: r[7] === "TRUE", _row: i + 2,
  }));
}

export async function updateProductDetail(productCode, data) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  if (data.productName) await writeCell(PRODUCT_SHEET, `B${p._row}`, data.productName);
}

export async function updateProductStatus(productCode, isActive) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  await writeCell(PRODUCT_SHEET, `E${p._row}`, isActive ? "TRUE" : "FALSE");
}

export async function markProductClosed(productCode) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  await writeCell(PRODUCT_SHEET, `H${p._row}`, "TRUE");
}

/* ===== Orders 相關 ===== */
export async function getOrders() {
  const rows = await readSheet(ORDER_SHEET);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r, i) => ({
    lineUserId: r[0], buyerName: r[1], productCode: r[2],
    productName: r[3], color: r[4], size: r[5],
    qty: Number(r[6]), price: Number(r[7]),
    status: r[8], _row: i + 2,
  }));
}

export async function appendOrder(order) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${ORDER_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        order.userId, order.buyerName || "", order.productCode,
        order.productName, order.color || "", order.size || "",
        order.qty, order.price, order.status || "pending",
        new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
      ]],
    },
  });
}

// 供 arrivedService.js 呼叫
export async function syncVendorOrders(updatedOrders) {
  console.log("🔄 執行訂單同步...");
  return { ok: true };
}

/* ===== index.js 需要的各類清單功能 ===== */

// 1. 取得特定買家訂單
export async function getBuyerOrders(userId) {
  const orders = await getOrders();
  return userId ? orders.filter(o => o.lineUserId === userId) : orders;
}

// 2. 取得待出貨清單 (供 shippingService 使用)
export async function getPendingOrders() {
  const orders = await getOrders();
  return orders.filter(o => o.status === "pending");
}

// 3. 供 index.js 的 /api/admin/shipping-list 呼叫
export async function getShippingList() {
  return await getPendingOrders();
}

// 4. 供 index.js 的 /api/buyer/pending 呼叫
export async function getBuyerPendingOrders(userId) {
  const orders = await getBuyerOrders(userId);
  return orders.filter(o => o.status === "pending");
}

// 5. 修正重點：具名匯出 getBuyerPackingList
export async function getBuyerPackingList() {
  const orders = await getOrders();
  const packingMap = {};
  orders.forEach(o => {
    if (!packingMap[o.lineUserId]) packingMap[o.lineUserId] = [];
    packingMap[o.lineUserId].push({
      productName: o.productName, quantity: o.qty, price: o.price
    });
  });
  return packingMap;
}

// 6. 標記已出貨
export async function markOrdersShipped(rowIndices) {
  for (const row of rowIndices) {
    await writeCell(ORDER_SHEET, `I${row}`, "shipped");
  }
}

// 7. 結單提醒
export async function getProductsClosingTomorrow() {
  const products = await getProducts();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  return products.filter(p => p.closeDate === dateStr);
}

// 預設匯出
const sheetService = {
  getProducts, updateProductDetail, updateProductStatus, markProductClosed,
  getOrders, getPendingOrders, appendOrder, syncVendorOrders,
  getBuyerOrders, getBuyerPendingOrders, getShippingList, markOrdersShipped,
  getBuyerPackingList, getProductsClosingTomorrow, writeCell
};
export default sheetService;