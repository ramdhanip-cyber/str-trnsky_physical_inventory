const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const postReq = require("./routes/postRoutes");
const fetchReq = require("./routes/fetchRoutes");
const auth = require("./routes/auth");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./database/db"); // PostgreSQL connection pool
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const inventoryRoutes = require("./routes/inventory");
require('dotenv').config();

const app = express();

// Get port from environment or default to 5310
const PORT = process.env.PORT || 5310;

// Debug: Log current working directory and file paths
console.log('Current working directory:', process.cwd());
console.log('Server file directory:', __dirname);
const distPath = path.join(__dirname, '/dist');
console.log('Expected dist path:', distPath);

// Check if dist folder exists
if (fs.existsSync(distPath)) {
  console.log('✅ Dist folder exists');
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    console.log('✅ index.html exists in dist folder');
  } else {
    console.log('❌ index.html NOT found in dist folder');
  }
} else {
  console.log('❌ Dist folder NOT found');
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS — merge hardcoded defaults with ALLOWCORSLIST from .env
const defaultCorsOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5310",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5310",
  "http://172.28.1.248:5173",
  "http://172.28.1.248:5310",
  "http://10.50.60.162:5310",
  "http://10.50.60.162:5173",
  "http://10.52.33.41:5310",
  "http://10.60.1.38:5310",
  "http://10.60.1.38:3000",
  "https://auxinvex.sss-steel.com",
  "https://auxinvex.sss-steel.com:443",
  "https://auxinvex.sss-steel.com:5310",
  "https://auxinvex.sss-steel.com/st2sss-T03/star-st2/star-inventory",
];

let envCorsOrigins = [];
try {
  if (process.env.ALLOWCORSLIST) {
    envCorsOrigins = JSON.parse(process.env.ALLOWCORSLIST);
  }
} catch (e) {
  console.warn('Could not parse ALLOWCORSLIST from .env:', e.message);
}

const corsOrigins = [...new Set([...defaultCorsOrigins, ...envCorsOrigins])];
console.log('CORS allowed origins:', corsOrigins);

// Allow any localhost / 127.0.0.1 origin regardless of port (Vite may pick 5173, 5174, ...)
const isLocalhostOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / non-browser requests (no Origin header)
      if (!origin || corsOrigins.includes(origin) || isLocalhostOrigin(origin)) {
        return callback(null, true);
      }
      console.warn('CORS blocked origin:', origin);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

  app.use(cookieParser());

// Session middleware
app.use(
    session({
      store: new pgSession({
        pool, // PostgreSQL connection
        tableName: "st_session", // Session table in PostgreSQL
      }),
      secret: process.env.SECRET || 'your-super-secret-key-for-development', // Replace with a strong secret
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        secure: false, // Set to `true` if using HTTPS
        httpOnly: true, // Prevents client-side access
      },
    })
  );

// Test route to verify server is working
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// API Routes - These must come BEFORE the static file serving
app.use("/services", postReq);
app.use("/services", fetchReq);
app.use("/services", auth);
app.use("/services/auth", authRoutes); // Mount auth routes under /services/auth
app.use("/auth", authRoutes); // Keep the original /auth route for backward compatibility
app.use("/api/inventory", inventoryRoutes);
app.use("/services", inventoryRoutes);

const APP_BASE_PATH = process.env.APP_BASE_PATH || '/star-inventory';

const serveIndexHtml = (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  console.log('Serving index.html from:', indexPath, 'for', req.path);

  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found at:', indexPath);
    return res.status(404).json({ error: 'Application not built properly' });
  }

  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
};

// Serve static files from the React app build under /star-inventory
console.log('Serving static files from:', distPath, 'at base path:', APP_BASE_PATH);
app.use(APP_BASE_PATH, express.static(distPath, { index: false }));

// Redirect legacy /login to the app login route
app.get('/login', (req, res) => {
  res.redirect(`${APP_BASE_PATH}/login`);
});

// SPA fallback for all /star-inventory routes
app.get(`${APP_BASE_PATH}/*`, serveIndexHtml);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const users = [];

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
