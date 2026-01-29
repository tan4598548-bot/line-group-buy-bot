import { 
  getProducts,
  appendOrder,
  getOrdersByUserAndProduct
} from "./sheetService.js";

/**
 * 買家下單主流程（含完整防呆）
 */
export async function handleOrder(req, res) {
  try {
    const { userId, productCode, qty } = req.body;

    /* =====================
       G-0 基本欄位檢查
    ===================== */
    if (!userId || !productCode || qty === undefined) {
      throw new Error("缺少必要欄位");
    }

    /* =====================
       G-3 防亂填數量
    ===================== */
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error("數量必須為正整數");
    }

    /* =====================
       取得商品資料（唯一真相）
    ===================== */
    const products = await getProducts();
    const product = products.find(p => p.code === productCode);

    if (!product) {
      throw new Error("商品不存在");
    }

    /* =====================
       G-2 防結單後偷下
    ===================== */
    if (product.closed === true) {
      throw new Error("此商品已結單，無法下單");
    }

    /* =====================
       G-4 防下架仍可下單
    ===================== */
    if (product.active !== true) {
      throw new Error("此商品目前未開放下單");
    }

    /* =====================
       G-1 防重複下單
       同 user + product + pending
    ===================== */
    const existingOrders = await getOrdersByUserAndProduct(
      userId,
      productCode
    );

    const hasPending = existingOrders.some(
      o => o.status === "pending"
    );

    if (hasPending) {
      throw new Error("你已經下過此商品，請勿重複下單");
    }

    /* =====================
       G-5 價格鎖定（超重要）
    ===================== */
    const price = Number(product.price);
    if (!price || price <= 0) {
      throw new Error("商品價格異常，請聯絡管理員");
    }

    const subtotal = price * qty;

    /* =====================
       建立訂單（寫死價格）
    ===================== */
    const order = {
      userId,
      productCode,
      productName: product.name,
      qty,
      price,           // 🔒 下單當下價格
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
