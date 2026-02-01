import { google } from "googleapis";

/* =========================
   Google Sheet 基本設定
========================= */

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const PRODUCT_SHEET = "Products";
const ORDER_SHEET = "Orders";

/* =========================
   共用工具
========================= */

async function readSheet(sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return res.data.values || [];
}

async function writeCell(sheetName, cell, value) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${cell}`,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
}

/* =========================
   Products
========================= */

export async function getProducts() {
  const rows = await readSheet(PRODUCT_SHEET);
  if (rows.length <= 1) return [];

  const headers = rows[0];
  return rows.slice(1).map((row, idx) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
    obj._rowNumber = idx + 2;
    return obj;
  });
}

export async function updateProductStatus(productCode, active) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");

  const headers = Object.keys(p).filter(k => !k.startsWith("_"));
  const col = headers.indexOf("active");
  const colLetter = String.fromCharCode(65 + col);

  await writeCell(PRODUCT_SHEET, `${colLetter}${p._rowNumber}`, active ? "TRUE" : "FALSE");
}

export async function markProductClosed(productCode) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");

  const headers = Object.keys(p).filter(k => !k.startsWith("_"));

  for (const field of ["closed", "active"]) {
    const col = headers.indexOf(field);
    if (col >= 0) {
      const colLetter = String.fromCharCode(65 + col);
      await writeCell(
        PRODUCT_SHEET,
        `${colLetter}${p._rowNumber}`,
        field === "closed" ? "TRUE" : "FALSE"
      );
    }
  }
}

/* =========================
   Orders
========================= */

async function mapOrderRows() {
  const rows = await readSheet(ORDER_SHEET);
  if (rows.length <= 1) return [];

  const headers = rows[0];
  return rows.slice(1).map(row => {
    const o = {};
    headers.forEach((h, i) => (o[h] = row[i] ?? ""));
    return o;
  });
}

export async function appendOrder(order) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${ORDER_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        order.userId,
        order.productCode,
        order.productName,
        Number(order.qty),
        Number(order.price),
        Number(order.subtotal),
        order.status,
        order.locked ? "TRUE" : "FALSE",
        order.createdAt
      ]]
    }
  });
}

export async function getBuyerOrders(userId) {
  const orders = await mapOrderRows();
  return userId ? orders.filter(o => o.userId === userId) : orders;
}

export async function getOrdersByUserAndProduct(userId, productCode) {
  const orders = await mapOrderRows();
  return orders.filter(
    o => o.userId === userId && o.productCode === productCode
  );
}

export async function getBuyerPendingOrders(userId) {
  const orders = await mapOrderRows();
  return orders.filter(o => o.userId === userId && o.status === "pending");
}

/* =========================
   出貨
========================= */

export async function getShippingList() {
  const orders = await mapOrderRows();
  return orders.filter(o => o.status === "pending");
}

export async function markOrdersShipped(orderIds) {
  const rows = await readSheet(ORDER_SHEET);
  const headers = rows[0];
  const statusCol = headers.indexOf("status");

  const shipped = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const orderId = `${row[0]}_${row[1]}`;

    if (orderIds.includes(orderId)) {
      const colLetter = String.fromCharCode(65 + statusCol);
      await writeCell(ORDER_SHEET, `${colLetter}${i + 1}`, "shipped");

      shipped.push({
        userId: row[0],
        productName: row[2],
        qty: row[3],
        price: row[4],
        subtotal: row[5]
      });
    }
  }

  return shipped;
}

/* =========================
   🆕 買家揀貨 PDF 用資料
========================= */

export async function getBuyerPackingList() {
  const orders = await mapOrderRows();

  // 只抓已出貨
  const shipped = orders.filter(o => o.status === "shipped");

  const map = {};

  for (const o of shipped) {
    if (!map[o.userId]) {
      map[o.userId] = [];
    }

    map[o.userId].push({
      productName: o.productName,
      quantity: Number(o.qty),
      price: Number(o.price)
    });
  }

  return map;
}
