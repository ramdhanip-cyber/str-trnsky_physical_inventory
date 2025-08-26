const { pool } = require('./database/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Running reconciliation records table migration...');
    
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_reconciliation_records_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 