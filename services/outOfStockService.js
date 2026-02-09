// services/outOfStockService.js
import { read, update, append } from "./sheetService.js";

const STOCK_SHEET = "Overstock";
const STOCK_ORDER_SHEET = "OverstockOrders";

export async function buyOverstockItem(overstockId, buyerId, buyerName) {
  const rows = await read(STOCK_SHEET);
  const headers = rows[0];

  const idCol = headers.indexOf("overstock_id");
  const qtyCol = headers.indexOf("qty");
  const statusCol = headers.indexOf("status");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === overstockId) {
      const qty = Number(rows[i][qtyCol]);

      if (qty <= 0 || rows[i][statusCol] !== "available") {
        return { success: false };
      }

      // 🔥 扣庫存
      await update(STOCK_SHEET, `${String.fromCharCode(65 + qtyCol)}${i + 1}`, qty - 1);

      if (qty - 1 === 0) {
        await update(
          STOCK_SHEET,
          `${String.fromCharCode(65 + statusCol)}${i + 1}`,
          "sold"
        );
      }

      // 🔥 記錄訂單
      await append(STOCK_ORDER_SHEET, [
        overstockId,
        buyerId,
        buyerName,
        1,
        new Date().toISOString()
      ]);

      return { success: true };
    }
  }

  return { success: false };
}
