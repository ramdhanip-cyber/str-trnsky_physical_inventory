const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../database/db");

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

exports.registerUser = async (req, res) => {
    const { user_name, full_name, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO st_users (user_name, full_name, password) VALUES ($1, $2, $3) RETURNING user_id',
            [user_name, full_name, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].user_id });
    } catch (error) {
        res.status(500).json({ error: 'User registration failed' });
    }
};

exports.loginUser = async (req, res) => {
  const { user_name, password } = req.body;
  console.log(user_name, password);
  console.log(typeof user_name, typeof password);

  try {
      // Query to check if user exists
      const user = await pool.query('SELECT * FROM st_users WHERE user_name = LOWER($1)', [user_name]);
      console.log(user.rows[0].password);

      // Check if user exists and password matches
      if (user.rows.length === 0) {
          return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.rows[0].password);
      if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Get full_name from the user data
      const full_name = user.rows[0].full_name;
      const user_id = user.rows[0].user_id;

      const role = await pool.query('SELECT DISTINCT b.role_desc from st_users a, st_roles b, teams c, team_members d where a.user_id = d.user_id and b.role_id = d.role_id and d.team_id = c.team_id and d.user_id = $1', [user_id]);

      const roleDesc = role.rows.map(row => row.role_desc);

      // Generate JWT token
      const token = jwt.sign({ userId: user.rows[0].user_id }, JWT_SECRET, { expiresIn: '1h' });

      // Insert session information into the database
      await pool.query(
          'INSERT INTO st_sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
          [user.rows[0].user_id, token]
      );

      // Return the token and full_name in the response
      return res.json({ token, full_name, user_id, roleDesc });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Login failed' });
  }
};

exports.logoutUser = async (req, res) => {
    const token = req.header('Authorization')?.split(' ')[1];

    try {
        await pool.query('DELETE FROM st_sessions WHERE token = $1', [token]);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
};

// Verify Token with Session Validation
exports.verifyToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const session = await pool.query(
      "SELECT * FROM st_sessions WHERE token = $1",
      [token]
    );

    if (session.rows.length === 0) {
      return res.status(403).json({ message: "Session expired or invalid" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ message: "Forbidden" });

      req.user = decoded;
      next();
    });

  } catch (error) {
    console.error("Session Validation Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
