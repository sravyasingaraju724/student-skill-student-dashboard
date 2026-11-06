require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./src/routes/auth');
const skillRoutes = require('./src/routes/skills');
const dashboardRoutes = require('./src/routes/dashboard');
const { notFound, errorHandler } = require('./src/middleware/errors');
console.log('authRoutes:', typeof authRoutes);
console.log('skillRoutes:', typeof skillRoutes);
console.log('dashboardRoutes:', typeof dashboardRoutes);
console.log('notFound:', typeof notFound);
console.log('errorHandler:', typeof errorHandler);

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many authentication attempts. Please wait and try again.' } }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'student-skill-tracking-dashboard-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('*path', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
if (require.main === module) app.listen(port, () => console.log(`Student Skill Tracking Dashboard running at http://localhost:${port}`));
module.exports = app;
