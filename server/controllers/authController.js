const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../database/db");

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.user_id, role: user.role_id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

// Login Function with Session Storage
exports.login = async (req, res) => {
  const { userName, password } = req.body;
  console.log(userName, password)

  try {
    const result = await pool.query(
      "SELECT * FROM st_users WHERE user_name = $1",
      [userName]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid credentials" });

    // Generate JWT Token
    const token = generateToken(user);

    // Store session in database
    const sessionResult = await pool.query(
      "INSERT INTO st_sessions (user_id, token) VALUES ($1, $2) RETURNING session_id",
      [user.user_id, token]
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    res.json({
      message: "Login successful",
      token,
      sessionId: sessionResult.rows[0].session_id,
      user: { id: user.user_id, role: user.role_id },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout Function
exports.logout = async (req, res) => {
  const token = req.cookies.token;

  if (!token) return res.status(400).json({ message: "No active session found" });

  try {
    await pool.query("DELETE FROM st_sessions WHERE token = $1", [token]);

    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });

  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ message: "Server error" });
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
