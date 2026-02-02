import express from "express";

// services（全部用你現有的）
import productService from "../services/productService.js";
import orderService from "../services/orderService.js";
import arrivedService from "../services/arrivedService.js";
import shippingService from "../services/shippingService.js";
import vendorService from "../services/vendorService.js";
import lockService from "../services/lockService.js";
import outOfStockService from "../services/outOfStockService.js";

const router = express.Router();

/* =====================================================
 * 管理員身份確認
 * ===================================================== */
router.get("/me", async (req, res) => {
  try {
    // LIFF 驗證通常在前端做，這裡只回成功
    res.json({ ok: true, role: "admin" });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/* =====================================================
 * 商品管理
 * ===================================================== */

// 新增 / 上架商品
router.post("/products", async (req, res) => {
  try {
    const result = await productService.createProduct(req.body);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 商品列表
router.get("/products", async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.json({ ok: true, products });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/* =====================================================
 * 訂單管理
 * ===================================================== */

// 查詢訂單
router.get("/orders", async (req, res) => {
  try {
    const orders = await orderService.getOrders(req.query);
    res.json({ ok: true, orders });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 刪除錯訂
router.delete("/orders/:orderId", async (req, res) => {
  try {
    await orderService.deleteOrder(req.params.orderId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/* =====================================================
 * 廠商到貨 / 點貨
 * ===================================================== */

router.post("/vendor/arrival", async (req, res) => {
  try {
    const result = await arrivedService.recordArrival(req.body);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/* =====================================================
 * 發貨（PDF）
 * ===================================================== */

router.post("/shipping/pdf", async (req, res) => {
  try {
    const pdfUrl = await shippingService.generateBuyerPackingPdf(req.body);
    res.json({ ok: true, pdfUrl });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/* =====================================================
 * 廠商 / 成本
 * ===================================================== */

router.post("/vendor/cost", async (req, res) => {
  try {
    const result = await vendorService.updateCost(req.body);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/* =====================================================
 * 系統控制
 * ===================================================== */

// 鎖單
router.post("/system/lock", async (req, res) => {
  try {
    await lockService.lock();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 斷貨通知
router.post("/system/out-of-stock", async (req, res) => {
  try {
    await outOfStockService.notify(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

export default router;
