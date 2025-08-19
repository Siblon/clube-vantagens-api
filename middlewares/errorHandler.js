// middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno';
  res.status(status).json({ error: message });
};

module.exports = errorHandler;
