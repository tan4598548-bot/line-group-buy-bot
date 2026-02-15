import { 
  getProducts, 
  updateProductDetail, 
  writeCell,
  appendProduct // 確保從 sheetService 匯入此功能
} from "./sheetService.js";

/**
 * 取得所有商品清單
 */
export async function listProducts() {
  return await getProducts();
}

/**
 * 更新商品資訊
 */
export async function updateProduct(productCode, data) {
  return await updateProductDetail(productCode, data);
}

/**
 * 新增商品 (對應 liff-admin-product.html 的請求)
 */
export async function createProduct(productData) {
  console.log("🚀 正在寫入新商品到 Google Sheets:", productData);
  
  // 將前端傳來的欄位對齊 appendProduct 預期格式
  const formattedData = {
    productCode: `P${Date.now()}`, // 生成唯一代碼
    productName: productData.name,
    price: productData.price,
    closeDate: productData.closeDate,
    colorMap: productData.colorMap || "" // 包含顏色與尺寸的字串
  };

  return await appendProduct(formattedData);
}

/**
 * 切換商品狀態 (對齊 adminproduct.js 的需求)
 */
export async function updateProductStatus(productCode, isActive) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  
  // 商品狀態位於 Products 工作表的 E 欄 (第 5 欄)
  await writeCell("Products", `E${p._row}`, isActive ? "TRUE" : "FALSE");
}

/**
 * 切換商品上架狀態 (別名供其他模組調用)
 */
export const toggleProductActive = updateProductStatus;

/**
 * 結單處理
 */
export async function closeProduct(productCode) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  
  // 結單狀態位於 Products 工作表的 H 欄 (第 8 欄)
  await writeCell("Products", `H${p._row}`, "TRUE");
}

// 建立物件供預設匯出
const productService = {
  listProducts,
  updateProduct,
  createProduct,
  updateProductStatus,
  toggleProductActive,
  closeProduct
};

export default productService;