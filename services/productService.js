import { 
  getProducts, 
  updateProductDetail, 
  writeCell 
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
 * 新增商品
 */
export async function createProduct(productData) {
  console.log("Creating product:", productData);
}

/**
 * 切換商品狀態 (對齊 adminproduct.js 的需求)
 */
export async function updateProductStatus(productCode, isActive) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  
  // 假設 active 欄位在 E 欄
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
  
  // 假設 closed 欄位在 H 欄
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