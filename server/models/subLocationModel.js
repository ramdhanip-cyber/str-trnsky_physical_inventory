const pool = require("../database/db");

const getSubLocationsByLocation = async (location_id) => {
  const res = await pool.query(
    "SELECT * FROM st_sub_locations WHERE location_id = $1 ORDER BY sub_location_id DESC",
    [location_id]
  );
  return res.rows;
};

const createSubLocation = async (location_id, sub_location_desc) => {
  const res = await pool.query(
    "INSERT INTO st_sub_locations (location_id, sub_location_desc) VALUES ($1, $2) RETURNING *",
    [location_id, sub_location_desc]
  );
  return res.rows[0];
};

module.exports = { getSubLocationsByLocation, createSubLocation };