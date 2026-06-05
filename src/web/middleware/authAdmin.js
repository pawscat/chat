const { ROLES } = require('../../utils/constants');

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.redirect('/admin/login');
}

function requireSuperAdmin(req, res, next) {
  if (req.session && req.session.adminId && req.session.adminRole === ROLES.SUPER_ADMIN) {
    return next();
  }
  res.status(403).send("Forbidden: Super Admin only");
}

module.exports = {
  requireAdmin,
  requireSuperAdmin
};
