import {
  getProducts,
  appendOrder,
  getOrders,
  writeCell
} from "./sheetService.js";

/**
 * 取得所有訂單 (對齊 arrivedService 使用)
 * 注意：因讀取 Sheet 是異步的，此處改為 async 確保能抓到真實資料
 */
export async function getAllOrders() {
  try {
    return await getOrders();
  } catch (error) {
    console.error("取得訂單失敗:", error);
    return [];
  }
}

/**
 * 刪除訂單
 * 實際上會根據行號 (index 或 _row) 去操作 Sheet
 */
export async function deleteOrder(index) {
  // 這裡 index 建議傳入的是 Sheet 中的 row 編號
  console.log(`正在刪除 Sheet 第 ${index} 列訂單`);
  await writeCell("Orders", `I${index}`, "deleted"); // 範例：將狀態改為已刪除
}

/**
 * 修改訂單
 */
export async function editOrder(index, data) {
  console.log(`正在修改 Sheet 第 ${index} 列訂單`, data);
  // 根據 data 內容更新對應欄位，此處為介面實作
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

    // 檢查結單與上架狀態 (相容字串與布林值)
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

    // 呼叫 sheetService 的寫入功能
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

// 預設匯出以配合 adminRoutes 或其他模組引用
const orderService = {
  handleOrder,
  getAllOrders,
  deleteOrder,
  editOrder
};
export default orderService;