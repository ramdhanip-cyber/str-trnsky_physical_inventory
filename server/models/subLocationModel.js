const pool = require("../database/db");

const getSubLocationsByLocation = async (location_id) => {
  const res = await pool.query(
    "SELECT * FROM st_sections WHERE location_id = $1 ORDER BY section_id DESC",
    [location_id]
  );
  return res.rows;
};

const createSubLocation = async (location_id, section_desc) => {
  const res = await pool.query(
    "INSERT INTO st_sections (location_id, section_desc) VALUES ($1, $2) RETURNING *",
    [location_id, section_desc]
  );
  return res.rows[0];
};

module.exports = { getSubLocationsByLocation, createSubLocation };