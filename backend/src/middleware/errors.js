function notFound(req, res) {
  res.status(404).json({ error: 'The requested endpoint was not found.' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err.message);
  res.status(status).json({ error: status >= 500 ? (status === 503 ? err.message : 'Something went wrong. Please try again.') : err.message });
}

module.exports = { notFound, errorHandler };
