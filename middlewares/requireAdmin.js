const requireAdmin = (req, res, next) => {
  const pin = req.headers['x-admin-pin'];
  if (!pin || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
};

module.exports = requireAdmin;
