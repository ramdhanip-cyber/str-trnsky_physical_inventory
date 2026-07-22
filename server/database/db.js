const { Pool } = require("pg")
require('dotenv').config();
const path = require('path');

// Load .env file from server directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Debug: Check if environment variables are loaded
console.log('=== Database Connection Debug ===');
console.log('PGUSER:', process.env.PGUSER);
console.log('PGHOST:', process.env.PGHOST);
console.log('PGDATABASE:', process.env.PGDATABASE);
console.log('PGPASSWORD type:', typeof process.env.PGPASSWORD);
console.log('PGPASSWORD value:', process.env.PGPASSWORD);
console.log('PGPORT:', process.env.PGPORT);
console.log('================================');

const pool = new Pool({
  user: process.env.PGUSER || 'inv_usr',
  host: process.env.PGHOST || '192.168.254.178',
  database: process.env.PGDATABASE || 'tst_str_inv_cnt_db',
  password: String(process.env.PGPASSWORD || 'inv_usr'),
  port: process.env.PGPORT || 5432,
  idleTimeoutMillis: 60000
})

pool.query(`
  SELECT
    current_user,
    current_database() AS database
`)
  .then((result) => {
    const row = result.rows[0];
    console.log('=== DB session ===', row);
  })
  .catch((error) => {
    console.error('DB session check failed:', error.message);
  });

module.exports = {
  pool,
  query: (text, params, callback) => pool.query(text, params, callback)
}
