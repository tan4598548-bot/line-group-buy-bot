import * as sheet from "./sheetService.js";

export async function handleOrder(req, res) {
  try {
    const { productCode, qty, lineUserId, buyerName, type, color, size } = req.body;
    const products = await sheet.getProducts();
    const p = products.find(x => x.productCode === productCode);

    if (!p || !p.active) throw new Error("商品已結單或不存在");

    // 需求 4a-2: 現貨搶購鎖定
    if (p.type === "overstock") {
      if (p.totalStock < qty) return res.status(400).json({ ok: false, error: "現貨庫存不足" });
      await sheet.decreaseProductStock(productCode, qty);
    }

    const orderId = `ORD${Date.now()}`;
    await sheet.appendOrder({
      orderId, productCode, productName: p.productName, type: p.type,
      lineUserId, buyerName, color, size, qty: Number(qty),
      price: p.price, status: "ordered"
    });

    res.json({ ok: true, orderId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

export async function getBuyerOrders(userId) {
  const orders = await sheet.getOrders();
  return orders.filter(o => o.lineUserId === userId);
}

export default { handleOrder, getBuyerOrders };