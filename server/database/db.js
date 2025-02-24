const { Pool } = require("pg")
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  idleTimeoutMillis: 60000
})

module.exports = {
  pool,
  query: (text, params, callback) => pool.query(text, params, callback)
}
