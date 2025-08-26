const pool = require("../database/db");

const getLocations = async () => {
  const res = await pool.query("SELECT * FROM st_locations ORDER BY location_id DESC");
  return res.rows;
};

const createLocation = async (location_desc, warehouse, branch) => {
  const res = await pool.query(
    "INSERT INTO st_locations (location_desc, warehouse, branch) VALUES ($1, $2, $3) RETURNING *",
    [location_desc, warehouse, branch]
  );
  return res.rows[0];
};

module.exports = { getLocations, createLocation };
