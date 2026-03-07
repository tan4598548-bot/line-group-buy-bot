import sheetService from "./sheetService.js";

/**
 * 取得商品清單
 */
export async function listProducts(filter) {
  const products = await sheetService.getProducts();
  if (!filter || filter === 'all') return products;
  // 支援根據狀態或類型過濾
  return products.filter(p => p.status === filter || p.type === filter);
}

/**
 * 建立新商品
 */
export async function createProduct(data) {
  const productData = {
    productCode: data.productCode || `P${Date.now()}`,
    productName: data.productName || data.name,
    price: Number(data.price) || 0,
    specSize: data.specSize || data.colorMap || "", // 統一規格欄位名
    closeDate: data.closeDate || "",
    description: data.description || data.detailText || "", // 統一描述欄位名
    images: data.images || "",
    youtube: data.youtube || "",
    video: data.video || "",
    type: data.type || "normal",
    status: data.status || "上架", // 預設上架
    isStock: data.isStock || "FALSE"
  };
  return await sheetService.appendProduct(productData);
}

/**
 * 更新商品資訊 (管理端修正用)
 */
export async function updateProduct(code, data) {
  try {
    return await sheetService.updateProduct(code, data);
  } catch (e) {
    console.error(`❌ [productService] 更新商品 ${code} 失敗:`, e.message);
    throw e;
  }
}

/**
 * 刪除商品
 */
export async function deleteProduct(code) {
  try {
    return await sheetService.deleteProduct(code);
  } catch (e) {
    console.error(`❌ [productService] 刪除商品 ${code} 失敗:`, e.message);
    throw e;
  }
}

export default { listProducts, createProduct, updateProduct, deleteProduct };