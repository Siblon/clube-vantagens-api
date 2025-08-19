function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno';
  const code = err.code || status;
  res.status(status).json({ ok: false, error: message, code });
}

module.exports = errorHandler;
module.exports.errorHandler = errorHandler;
