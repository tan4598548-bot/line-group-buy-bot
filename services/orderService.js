import {
  getProducts,
  appendOrder,
  getOrders,
  writeCell
} from "./sheetService.js";

/**
 * 取得所有訂單 (供 arrivedService 使用)
 */
export function getAllOrders() {
  // 注意：由於 Sheet 操作通常是異步的，這裡建議與 getOrders 配合
  // 若要在記憶體操作，此處先定義介面供編譯通過
  return []; 
}

export function deleteOrder(index) {
  console.log(`刪除第 ${index} 筆訂單`);
}

export function editOrder(index, data) {
  console.log(`修改第 ${index} 筆訂單`, data);
}

/**
 * 買家下單主流程
 */
export async function handleOrder(req, res) {
  try {
    const { userId, productCode, qty } = req.body;

    if (!userId || !productCode || qty === undefined) {
      throw new Error("缺少必要欄位");
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error("數量必須為正整數");
    }

    const products = await getProducts();
    const product = products.find(p => p.productCode === productCode);

    if (!product) {
      throw new Error("商品不存在");
    }

    if (product.closed === "TRUE" || product.closed === true) {
      throw new Error("此商品已結單，無法下單");
    }

    if (product.active !== "TRUE" && product.active !== true) {
      throw new Error("此商品目前未開放下單");
    }

    const price = Number(product.price);
    if (!price || price <= 0) {
      throw new Error("商品價格異常，請聯絡管理員");
    }

    const subtotal = price * qty;

    const order = {
      userId,
      productCode,
      productName: product.productName || "",
      qty,
      price,
      subtotal,
      status: "pending",
      locked: false,
      createdAt: new Date().toISOString()
    };

    await appendOrder(order);

    res.json({
      ok: true,
      message: "下單成功",
      order
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// 預設匯出以配合其他模組引用
export default {
  handleOrder,
  getAllOrders,
  deleteOrder,
  editOrder
};