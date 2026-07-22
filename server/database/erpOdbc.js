const { pool } = require("./db");

/**
 * Runs ERP/inventory SQL (intprd_rec, etc.) on the same Postgres pool as app tables.
 * Returns { Data: rows } to match the legacy HTTP SQL API shape used by controllers.
 * @param {string} sql
 * @param {{ timeoutSeconds?: number }} [opts]
 */
async function runErpSql(sql, opts = {}) {
  const timeoutSeconds = opts.timeoutSeconds ?? 120;

  if (timeoutSeconds <= 0) {
    const result = await pool.query(sql);
    return { Data: result.rows };
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`ERP query timed out after ${timeoutSeconds}s`)),
      timeoutSeconds * 1000
    );

    pool
      .query(sql)
      .then((result) => {
        clearTimeout(timer);
        resolve({ Data: result.rows });
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** Same pool as server/database/db.js */
function getErpPool() {
  return Promise.resolve(pool);
}

module.exports = { runErpSql, getErpPool };
