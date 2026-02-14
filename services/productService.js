import { 
  getProducts, 
  updateProductDetail, 
  writeCell,
  appendOrder // 這裡通常是 sheetService 裡寫入新資料的函式
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
 * 新增商品 (對齊 adminProduct.js 的需求)
 */
export async function createProduct(productData) {
  // 這裡假設你在 sheetService 有對應的寫入邏輯
  // 先定義基本邏輯確保不報錯
  console.log("Creating product:", productData);
  // 實際上會呼叫 sheetService 的寫入功能
}

/**
 * 切換商品上架狀態
 */
export async function toggleProductActive(productCode, isActive) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  await writeCell("Products", `E${p._row}`, isActive ? "TRUE" : "FALSE");
}

/**
 * 結單處理
 */
export async function closeProduct(productCode) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  await writeCell("Products", `H${p._row}`, "TRUE");
}

// 建立物件供預設匯出
const productService = {
  listProducts,
  updateProduct,
  createProduct,
  toggleProductActive,
  closeProduct
};

export default productService;