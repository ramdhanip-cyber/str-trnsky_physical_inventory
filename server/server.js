const express = require("express");
const cors = require("cors");
const postReq = require("./routes/postRoutes");
const fetchReq = require("./routes/fetchRoutes");
const auth = require("./routes/auth");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./database/db"); // PostgreSQL connection pool
require('dotenv').config();

const app = express();
app.use(express.json());
// app.use(cors());

app.use(
    cors({
      origin: "http://localhost:5173", // Match your frontend URL
      credentials: true,
    })
  );

// Session middleware
app.use(
    session({
      store: new pgSession({
        pool, // PostgreSQL connection
        tableName: "session", // Session table in PostgreSQL
      }),
      secret: process.env.SECRET, // Replace with a strong secret
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        secure: false, // Set to `true` if using HTTPS
        httpOnly: true, // Prevents client-side access
      },
    })
  );

app.use("/services", postReq);
app.use("/services", fetchReq);
app.use("/services", auth);

const users = [];

// app.post("/auth/signup", (req, res) => {
//   const { username, password } = req.body;
//   users.push({ id: users.length + 1, username, password, role: "user" });
//   res.json({ success: true, message: "User registered successfully!" });
// });

// app.post("/auth/login", (req, res) => {
//   const { username, password } = req.body;
//   const user = users.find((u) => u.username === username && u.password === password);
//   user ? res.json({ success: true, user }) : res.status(401).json({ success: false, message: "Invalid credentials" });
// });

app.listen(5000, () => console.log("Server running on port 5000"));
