/**
 * 鎖單服務
 * true = 已截止
 */

let locked = false;

function lock() {
  locked = true;
  console.log('🔒 Orders locked');
}

function unlock() {
  locked = false;
  console.log('🔓 Orders unlocked');
}

function isLocked() {
  return locked;
}

module.exports = {
  lock,
  unlock,
  isLocked
};
