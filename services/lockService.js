const fs = require('fs');
const path = require('path');

const lockFile = path.join(__dirname, 'lock.json');

function readLock() {
  if (!fs.existsSync(lockFile)) {
    return { locked: false };
  }
  return JSON.parse(fs.readFileSync(lockFile, 'utf8'));
}

function saveLock(data) {
  fs.writeFileSync(lockFile, JSON.stringify(data, null, 2));
}

function isLocked() {
  return readLock().locked === true;
}

function lock() {
  saveLock({ locked: true, lockedAt: new Date().toISOString() });
}

function unlock() {
  saveLock({ locked: false });
}

module.exports = {
  isLocked,
  lock,
  unlock
};
