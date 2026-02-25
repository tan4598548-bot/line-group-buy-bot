import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// 方案 A：解析環境變數中的 JSON 字串
let credentials = {};
try {
  credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
} catch (error) {
  console.error("❌ Google Service Account JSON 解析失敗，請檢查 .env 格式");
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 通用讀取
async function readSheet(range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return res.data.values || [];
}

// 通用寫入單格
export async function writeCell(sheet, cell, value) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!${cell}`,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
}

// =====================
// Products (對齊圖片 3)
// =====================
export async function getProducts() {
  const rows = await readSheet("Products!A:M");
  if (rows.length <= 1) return [];

  return rows.slice(1).map((r, i) => ({
    productCode: r[0],
    productName: r[1],
    colorMap: r[2],
    price: Number(r[3]),
    active: r[4] === "TRUE",
    closeDate: r[5],
    notified: r[6] === "TRUE",
    detailText: r[7],
    images: r[8],
    youtube: r[9],
    video: r[10],
    type: r[11] || "normal",
    totalStock: Number(r[12] || 0),
    _row: i + 2
  }));
}

export async function appendProduct(p) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Products!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        p.productCode, p.productName, p.colorMap, p.price, "TRUE",
        p.closeDate, "FALSE", p.detailText || "", p.images || "",
        p.youtube || "", p.video || "", p.type || "normal", p.totalStock || 0
      ]]
    }
  });
}

// =====================
// Orders (對齊圖片 3)
// =====================
export async function getOrders() {
  const rows = await readSheet("Orders!A:M");
  if (rows.length <= 1) return [];

  return rows.slice(1).map((r, i) => ({
    orderId: r[0],
    productCode: r[1],
    productName: r[2],
    type: r[3],
    lineUserId: r[4],
    buyerName: r[5],
    color: r[6],
    size: r[7],
    qty: Number(r[8]),
    price: Number(r[9]),
    status: r[10],
    note: r[11],
    createdAt: r[12],
    _row: i + 2
  }));
}

export async function appendOrder(o) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Orders!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        o.orderId, o.productCode, o.productName, o.type, o.lineUserId,
        o.buyerName, o.color, o.size, o.qty, o.price, o.status,
        o.note || "", new Date().toISOString()
      ]]
    }
  });
}

export async function updateOrderStatus(row, status) {
  await writeCell("Orders", `K${row}`, status);
}

export async function decreaseProductStock(productCode, qty) {
  const products = await getProducts();
  const p = products.find(i => i.productCode === productCode);
  if (p) {
    const newStock = Math.max(0, p.totalStock - qty);
    await writeCell("Products", `M${p._row}`, newStock);
  }
}

const sheetService = { 
  getProducts, appendProduct, getOrders, 
  appendOrder, updateOrderStatus, decreaseProductStock, writeCell 
};
export default sheetService;