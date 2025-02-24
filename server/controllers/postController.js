const pool = require("../database/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createLocation } = require("../models/locationModel");
const { createSubLocation } = require("../models/subLocationModel");

// User Signup
exports.signup = async (req, res) => {
  const { username, password, role_id, full_name } = req.body;

  if (!username || !password || !role_id || !full_name) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if username exists
    const userExists = await pool.query("SELECT * FROM st_users WHERE user_name = $1", [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Insert user (Hash the password before storing in production)
    await pool.query(
      "INSERT INTO st_users (user_name, password, role_id, full_name) VALUES ($1, $2, $3, $4)",
      [username, password, role_id, full_name]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
  
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
  
    try {
      const result = await pool.query("SELECT * FROM st_users WHERE username = $1", [username]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
  
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.encrypted_password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
  
      // Store user info in session
      req.session.user = {
        user_id: user.user_id,
        username: user.username,
        role: user.role_id,
      };
  
      res.json({ success: true, user: req.session.user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  exports.logout = (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid"); // Remove session cookie
      res.json({ message: "Logged out successfully" });
    });
  };

  // Create new user
exports.createUser = async (req, res) => {
    const { user_name, full_name, password, role_id } = req.body;

    console.log(user_name,full_name, password, role_id)
  
    if (!user_name || !full_name || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    try {
      // Encrypt password (use bcrypt)
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const userResult = await pool.query(
        `INSERT INTO st_users (user_name, full_name, password, role_id) 
         VALUES ($1, $2, $3, $4) RETURNING user_id`,
        [user_name, full_name, hashedPassword, role_id]
      );
  
      res.json({ message: "User created successfully" });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
};
  
// Assign role to user
exports.assignRole = async (req, res) => {
    const { user_id, role_id } = req.body;
  
    if (!user_id || !role_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    try {
      await pool.query(
        `UPDATE st_users set role_id = $1 where user_id = $2;`,
        [role_id, user_id]
      );
      res.json({ message: "Role assigned successfully" });
    } catch (error) {
      console.error("Error assigning role:", error);
      res.status(500).json({ error: "Internal server error" });
    }
};
  
// Delete user
exports.deleteUser = async (req, res) => {
    const { user_id } = req.params;
  
    try {
      await pool.query(`DELETE FROM st_users WHERE user_id = $1`, [user_id]);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
};

exports.addLocation = async (req, res) => {
    try {
      const { location_desc, warehouse } = req.body;
      if (!location_desc || !warehouse) {
        return res.status(400).json({ message: "Location description and warehouse are required" });
      }
  
      const newLocation = await createLocation(location_desc, warehouse);
      res.status(201).json(newLocation);
    } catch (error) {
      res.status(500).json({ message: "Error creating location", error });
    }
  };

  exports.addSubLocation = async (req, res) => {
    try {
      const { location_id, sub_location_desc } = req.body;
      console.log (location_id, sub_location_desc);
      if (!location_id || !sub_location_desc) {
        return res.status(400).json({ message: "Location ID and sub-location description are required" });
      }
  
      const newSubLocation = await createSubLocation(location_id, sub_location_desc);
      res.status(201).json(newSubLocation);
    } catch (error) {
      res.status(500).json({ message: "Error creating sub-location", error });
    }
  };

  exports.deleteSubLocation = async (req,res) => {
    try {
        const { sub_location_id } = req.params;
        await pool.query("DELETE FROM st_sub_locations WHERE sub_location_id = $1", [sub_location_id]);
        res.status(200).json({ message: "Sub-location deleted successfully" });
      } catch (error) {
        console.error("Error deleting sub-location:", error);
        res.status(500).json({ error: "Server error while deleting sub-location" });
      }
  }

  exports.deleteLocation = async (req,res) => {
    try {
        const { location_id } = req.params;
        await pool.query("DELETE FROM st_locations WHERE location_id = $1", [location_id]);
        res.status(200).json({ message: "location deleted successfully" });
      } catch (error) {
        console.error("Error deleting location:", error);
        res.status(500).json({ error: "Server error while deleting location" });
      }
  }

  exports.assignUserToSubLocation = async (req, res) => {
    try {
      const { location_id, sub_location_id, user_id } = req.body;
      console.log (location_id, sub_location_id, user_id);
  
      // Validate input
      if (!location_id || !sub_location_id || !user_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      const assigned_at = new Date();
  
      // Insert into database
      const query = `
        INSERT INTO assigned_locations (location_id, sub_location_id, user_id, assigned_at)
        VALUES ($1, $2, $3, $4) RETURNING *;
      `;
      
      const values = [location_id, sub_location_id, user_id, assigned_at];
      const result = await pool.query(query, values);
  
      res.status(201).json({ message: "User assigned successfully", data: result.rows[0] });
    } catch (error) {
      console.error("Error assigning user:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
