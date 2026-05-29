const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

module.exports = (req, res, next) => {
  // 1. Allow public read access (GET requests) for client-side browsing
  if (req.method === 'GET') {
    return next();
  }

  // 2. Allow dashboard web requests (localhost or Render) to maintain panel compatibility
  const origin = req.headers.origin || req.headers.referer || '';
  if (
    origin.includes('localhost') || 
    origin.includes('render.com') || 
    origin.includes('onrender.com')
  ) {
    return next();
  }

  // 3. Get token from Authorization header for all other API clients (e.g., mobile app)
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  // 2. Check if it is a Bearer token format
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Invalid token format. Must be Bearer <token>' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 3. Verify Token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach decoded user payload (e.g. user id) to the request object
    req.user = decoded;
    
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
