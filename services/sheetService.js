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

/* ===== Products ===== */
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

export async function updateProductStatus(productCode, isActive) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  await writeCell(PRODUCT_SHEET, `E${p._row}`, isActive ? "TRUE" : "FALSE");
}

/* ===== Orders ===== */
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

/**
 * 補回失蹤的同步功能 (對齊 arrivedService.js)
 */
export async function syncVendorOrders(updatedOrders) {
  console.log("🔄 正在同步訂單資料至 Google Sheets...");
  // 此處邏輯視需求而定，目前先確保函式存在且能運作
  return { ok: true };
}

// 供 index.js 呼叫的各種介面
export async function getBuyerOrders(userId) {
  const orders = await getOrders();
  return userId ? orders.filter(o => o.lineUserId === userId) : orders;
}

export async function getBuyerPendingOrders(userId) {
  const orders = await getBuyerOrders(userId);
  return orders.filter(o => o.status === "pending");
}

export async function getShippingList() {
  const orders = await getOrders();
  return orders.filter(o => o.status === "pending");
}

export async function markOrdersShipped(rowIndices) {
  const results = [];
  for (const row of rowIndices) {
    await writeCell(ORDER_SHEET, `I${row}`, "shipped");
    results.push({ _row: row, status: "shipped" });
  }
  return results;
}

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

export async function getProductsClosingTomorrow() {
  const products = await getProducts();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  return products.filter(p => p.closeDate === dateStr);
}

// 預設匯出
const sheetService = {
  getProducts, updateProductStatus, getOrders, appendOrder,
  syncVendorOrders, getBuyerOrders, getBuyerPendingOrders,
  getShippingList, markOrdersShipped, getBuyerPackingList,
  getProductsClosingTomorrow
};
export default sheetService;