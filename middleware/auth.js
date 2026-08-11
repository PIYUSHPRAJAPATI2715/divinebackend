const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

module.exports = async (req, res, next) => {
  console.log(`[AUTH] Path: ${req.originalUrl || req.path} | Method: ${req.method} | Authorization: ${req.header('Authorization') ? 'Present' : 'Missing'} | Origin: ${req.header('Origin') || req.header('Referer') || 'None'}`);

  // 1. If Authorization header is present, ALWAYS verify token first to set req.user!
  const authHeader = req.header('Authorization');
  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: false, message: 'Invalid token format. Must be Bearer <token>' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id || decoded._id;
      
      const User = require('../models/User');
      const Admin = require('../models/Admin');
      let userExists = null;
      if (decoded.role === 'admin') {
        userExists = await Admin.findById(userId);
      } else {
        userExists = await User.findById(userId);
      }
      if (!userExists) {
        return res.status(401).json({ status: false, message: 'User account no longer exists in database. Please register/login again.' });
      }

      req.user = {
        ...decoded,
        id: userId,
        _id: userId
      };
      return next();
    } catch (err) {
      return res.status(401).json({ status: false, message: 'Invalid or expired token.' });
    }
  }

  // 2. Allow public read access (GET requests) for client-side browsing if no portal token required
  const isPortalRoute = 
    (req.originalUrl && (
      req.originalUrl.startsWith('/api/ngo') || 
      req.originalUrl.startsWith('/api/teacher') || 
      req.originalUrl.startsWith('/api/donor') || 
      req.originalUrl.startsWith('/api/donors') || 
      req.originalUrl.startsWith('/api/admin') ||
      req.originalUrl.startsWith('/api/followers') ||
      req.originalUrl.startsWith('/api/following') ||
      req.originalUrl.startsWith('/api/social')
    )) || (req.path && (
      req.path.startsWith('/api/ngo') || 
      req.path.startsWith('/api/teacher') || 
      req.path.startsWith('/api/donor') || 
      req.path.startsWith('/api/donors') || 
      req.path.startsWith('/api/admin') ||
      req.path.startsWith('/api/followers') ||
      req.path.startsWith('/api/following') ||
      req.path.startsWith('/api/social') ||
      req.path.startsWith('/ngo') ||
      req.path.startsWith('/teacher') ||
      req.path.startsWith('/donor') ||
      req.path.startsWith('/donors') ||
      req.path.startsWith('/admin')
    ));

  const isCategoryPublic = (req.originalUrl && (
    req.originalUrl.includes('campaign-categories') ||
    req.originalUrl.includes('fundraiser-categories')
  ));

  if (req.method === 'GET' && (!isPortalRoute || isCategoryPublic)) {
    return next();
  }

  // 3. Allow dashboard web requests (localhost, Render, or Vercel)
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

  if (isDashboardOrigin && !isUserAuthRoute && !isPortalRoute) {
    return next();
  }

  // 4. Otherwise, token is required and missing
  return res.status(401).json({ status: false, message: 'Access denied. No token provided.' });
};
