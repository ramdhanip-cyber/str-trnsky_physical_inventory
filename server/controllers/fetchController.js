const pool = require("../database/db");
const axios = require('axios');
const { getLocations } = require("../models/locationModel");
const { getSubLocationsByLocation } = require("../models/subLocationModel");
const dotenv = require("dotenv");


// Get all roles
exports.getRoles = async (req, res) => {
  try {
    const result = await pool.query("SELECT role_id, role_desc FROM st_roles");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching roles" });
  }
};

exports.getSession = (req, res) => {
    console.log("Session data in /auth/profile:", req.session); // Debugging
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({ user: req.session.user });
};

exports.getUsers = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.user_id, u.user_name, u.full_name, r.role_desc
        FROM st_users u, st_roles r WHERE u.role_id = r.role_id
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
};

exports.fetchLocations = async (req, res) => {
    try {
      const locations = await getLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching locations", error });
    }
};

exports.fetchSubLocations = async (req, res) => {
    try {
      const { location_id } = req.params;
      const subLocations = await getSubLocationsByLocation(location_id);
      res.json(subLocations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sub-locations", error });
    }
};

exports.fetchItems = async (req, res) => {
  try {
    const sqlQuery = "select * from intprd_rec where prd_invt_sts = 'S'";
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

// exports.assignLocation = async (req, res) => {
//   try {

//   }
// }