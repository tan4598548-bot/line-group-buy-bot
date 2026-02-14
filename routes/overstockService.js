import sheetService from "./sheetService.js";

/**
 * 必須保證：
 * - 同一時間只會成功一人
 */
export async function buyOverstockItem({
  productCode,
  buyerLineId,
  buyerName
}) {
  return await sheetService.atomicBuyOverstock(
    productCode,
    buyerLineId,
    buyerName
  );
}
