// services/lockService.js
const locks = new Map();

/**
 * 嘗試取得鎖
 */
export function acquireLock(key) {
  if (locks.get(key)) return false;
  locks.set(key, true);
  return true;
}

/**
 * 釋放鎖
 */
export function releaseLock(key) {
  locks.delete(key);
}
