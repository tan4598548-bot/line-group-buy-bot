/**
 * lockService.js
 * 功能：管理是否鎖單
 */

let locked = false;

function lock() {
  locked = true;
  console.log('🔒 訂單已自動鎖定');
}

function unlock() {
  locked = false;
  console.log('🔓 訂單已解鎖');
}

function isLocked() {
  return locked;
}

module.exports = {
  lock,
  unlock,
  isLocked
};
