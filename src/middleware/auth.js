function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Kein Zugriff',
      message: 'Diese Seite ist nur für Admins zugänglich.',
      user: req.session.user
    });
  }
  next();
}

function attachUser(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  next();
}

module.exports = { requireLogin, requireAdmin, attachUser };
