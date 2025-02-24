const express = require("express");
const { login, logout, verifyToken } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);
// router.post("/logout", logout);
// router.get("/verify", authMiddleware, (req, res) => {
//   res.json({ message: "Session is valid", user: req.user });
// });

module.exports = router;
