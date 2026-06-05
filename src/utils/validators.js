function isValidId(id) {
  return /^-?\d+$/.test(id);
}

function isValidUsername(username) {
  if (!username) return false;
  return /^[a-zA-Z0-9_]{5,32}$/.test(username);
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

module.exports = {
  isValidId,
  isValidUsername,
  escapeHtml
};
