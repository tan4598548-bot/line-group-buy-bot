const vendorOrderService = require('./vendorOrderService');

let locked = false;

async function lock() {
  if (locked) return;

  locked = true;
  console.log('🔒 鎖單完成，開始產生廠商訂貨表');

  try {
    await vendorOrderService.exportVendorOrders();
    console.log('📄 廠商訂貨表已產生');
  } catch (err) {
    console.error('❌ 產生廠商訂貨表失敗', err);
  }
}

function unlock() {
  locked = false;
}

function isLocked() {
  return locked;
}

module.exports = {
  lock,
  unlock,
  isLocked
};
