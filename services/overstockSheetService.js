import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });
const SID = process.env.SPREADSHEET_ID;
const ORDER_SHEET = "OverstockOrders";

export async function getAllOverstockOrders() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SID,
    range: ORDER_SHEET
  });
  const [h, ...rows] = res.data.values;
  return rows.map(r => Object.fromEntries(h.map((k,i)=>[k,r[i]])));
}

export async function markOverstockOrdersShipped(orderIds) {
  const data = await getAllOverstockOrders();
  for (let i=0;i<data.length;i++) {
    if (orderIds.includes(data[i].orderId)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SID,
        range: `${ORDER_SHEET}!H${i+2}`,
        valueInputOption: "RAW",
        requestBody: { values: [["shipped"]] }
      });
    }
  }
}

