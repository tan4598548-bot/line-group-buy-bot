import express from "express";
import { buyOverstockItem } from "../services/overstockService.js";
import { notifyOverstockSuccess } from "../services/overstockNotifyService.js";

const router = express.Router();

/* =========================
   現貨出清搶購
========================= */
router.post("/buy", async (req, res) => {
  try {
    const {
      productCode,
      buyerLineId,
      buyerName
    } = req.body;

    /**
     * buyOverstockItem 內部必須：
     * - atomic check 庫存
     * - 先鎖，再扣
     */
    const result = await buyOverstockItem({
      productCode,
      buyerLineId,
      buyerName
    });

    // 搶到才推播
    await notifyOverstockSuccess({
      buyerLineId,
      buyerName,
      productName: result.productName,
      spec: result.spec,
      price: result.price
    });

    res.json({
      success: true,
      result
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

export default router;
