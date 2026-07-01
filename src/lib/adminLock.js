// https://discord.gg/Zg2XkS5hq9



let adminLockEnabled = false;

function isAdminLockEnabled() {
  return adminLockEnabled;
}

function toggleAdminLock() {
  adminLockEnabled = !adminLockEnabled;
  return adminLockEnabled;
}

function setAdminLock(state) {
  adminLockEnabled = state;
  return adminLockEnabled;
}

module.exports = {
  isAdminLockEnabled,
  toggleAdminLock,
  setAdminLock
};

