const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

module.exports = (req, res, next) => {
  console.log(`[AUTH] Path: ${req.originalUrl || req.path} | Method: ${req.method} | Authorization: ${req.header('Authorization') ? 'Present' : 'Missing'} | Origin: ${req.header('Origin') || req.header('Referer') || 'None'}`);

  // 1. Allow public read access (GET requests) for client-side browsing, but protect admin, ngo, and teacher portal endpoints
  const isPortalRoute = 
    (req.originalUrl && (
      req.originalUrl.startsWith('/api/ngo') || 
      req.originalUrl.startsWith('/api/teacher') || 
      req.originalUrl.startsWith('/api/donor') || 
      req.originalUrl.startsWith('/api/donors') || 
      req.originalUrl.startsWith('/api/admin')
    )) || (req.path && (
      req.path.startsWith('/api/ngo') || 
      req.path.startsWith('/api/teacher') || 
      req.path.startsWith('/api/donor') || 
      req.path.startsWith('/api/donors') || 
      req.path.startsWith('/api/admin') ||
      req.path.startsWith('/ngo') ||
      req.path.startsWith('/teacher') ||
      req.path.startsWith('/donor') ||
      req.path.startsWith('/donors') ||
      req.path.startsWith('/admin')
    ));

  if (req.method === 'GET' && !isPortalRoute) {
    return next();
  }

  // 2. If Authorization header is present, we must ALWAYS verify it!
  const authHeader = req.header('Authorization');
  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: false, message: 'Invalid token format. Must be Bearer <token>' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ status: false, message: 'Invalid or expired token.' });
    }
  }

  // 3. Allow dashboard web requests (localhost, Render, or Vercel) to maintain panel compatibility,
  // but ONLY for endpoints that do not strictly require user context (i.e. not register or profile-setup).
  const origin = req.headers.origin || req.headers.referer || '';
  const isDashboardOrigin = 
    origin.includes('localhost') || 
    origin.includes('render.com') || 
    origin.includes('onrender.com') ||
    origin.includes('vercel.app');

  const isUserAuthRoute = 
    req.path === '/register' || 
    req.path === '/profile-setup' || 
    req.originalUrl.includes('/register') || 
    req.originalUrl.includes('/profile-setup');

  if (isDashboardOrigin && !isUserAuthRoute) {
    return next();
  }

  // 4. Otherwise, token is required and missing
  return res.status(401).json({ status: false, message: 'Access denied. No token provided.' });
};
