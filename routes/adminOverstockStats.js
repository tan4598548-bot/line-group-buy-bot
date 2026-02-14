import express from "express";
import adminAuth from "../middlewares/adminAuth.js";
import { getAllOverstockOrders } from "../services/overstockSheetService.js";

const router = express.Router();
router.use(adminAuth);

router.get("/stats", async (req, res) => {
  const orders = await getAllOverstockOrders();

  const totalRevenue = orders.reduce((s, o) => s + Number(o.price), 0);

  const byProduct = {};
  const byBuyer = {};

  orders.forEach(o => {
    byProduct[o.productName] = (byProduct[o.productName] || 0) + 1;
    byBuyer[o.buyerName] = (byBuyer[o.buyerName] || 0) + 1;
  });

  res.json({
    totalRevenue,
    productRank: byProduct,
    buyerRank: byBuyer
  });
});

export default router;
