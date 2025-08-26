const jwt = require('jsonwebtoken');
const pool = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const jwtAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authorization header with Bearer token is required" });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session exists in database
    const session = await pool.query(
      "SELECT * FROM st_sessions WHERE token = $1 AND expires_at > NOW()",
      [token]
    );

    if (session.rows.length === 0) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }

    // Add user info to request
    req.user = decoded;
    req.userId = decoded.userId;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('JWT Auth Error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token" });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(500).json({ error: "Authentication failed" });
  }
};

module.exports = { jwtAuthMiddleware }; 