const pool = require("../database/db");
const { runErpSql } = require("../database/erpOdbc");
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
    const { user_name, full_name, password } = req.body;

    console.log(user_name,full_name, password)

    if (!user_name || !full_name || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    try {
      // Check if username already exists
      const existingUser = await pool.query(
        "SELECT user_id FROM st_users WHERE user_name = $1",
        [user_name.toLowerCase()]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ 
          error: "Username already exists", 
          message: "A user with this username already exists. Please choose a different username." 
        });
      }

      // Encrypt password (use bcrypt)
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const userResult = await pool.query(
        `INSERT INTO st_users (user_name, full_name, password) 
         VALUES ($1, $2, $3) RETURNING user_id`,
        [user_name.toLowerCase(), full_name, hashedPassword]
      );
  
      res.json({ message: "User created successfully" });
    } catch (error) {
      console.error("Error creating user:", error);
      
      // Check for unique constraint violation
      if (error.code === '23505' && error.constraint === 'st_users_user_name_key') {
        return res.status(409).json({ 
          error: "Username already exists", 
          message: "A user with this username already exists. Please choose a different username." 
        });
      }
      
      res.status(500).json({ error: "Internal server error" });
    }
};

exports.updateUser = async (req, res) => {
  try {
    await pool.query('BEGIN'); // Start transaction
    
    const { user_id } = req.params;
    const { user_name, full_name, password } = req.body;

    console.log('UpdateUser - Received user_id:', user_id, 'Type:', typeof user_id);
    console.log('UpdateUser - Request body:', req.body);

    // Convert user_id to integer to ensure proper type matching
    const userIdInt = parseInt(user_id, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // 1. Check if user exists
    const userCheck = await pool.query(
      'SELECT user_id, user_name FROM st_users WHERE user_id = $1',
      [userIdInt]
    );
    
    if (userCheck.rows.length === 0) {
      console.log('User not found with ID:', userIdInt);
      
      // Debug: Let's see what users exist in the database
      const allUsers = await pool.query('SELECT user_id, user_name FROM st_users ORDER BY user_id');
      console.log('All users in database:', allUsers.rows);
      
      return res.status(404).json({ message: 'User not found' });
    }
    
    const currentUser = userCheck.rows[0];

    // 2. Check for username conflict if username is being changed
    if (user_name && user_name !== currentUser.user_name) {
      const usernameCheck = await pool.query(
        'SELECT user_id FROM st_users WHERE user_name = $1 AND user_id != $2',
        [user_name, userIdInt]
      );
      
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Username already in use' });
      }
    }

    // 3. Prepare update data
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (user_name) {
      updateFields.push(`user_name = $${paramCount++}`);
      updateValues.push(user_name.toLowerCase());
    }
    
    if (full_name) {
      updateFields.push(`full_name = $${paramCount++}`);
      updateValues.push(full_name);
    }

    // 4. Handle password update if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateFields.push(`password = $${paramCount++}`);
      updateValues.push(hashedPassword);
    }

    // 5. Only update if there are fields to update
    if (updateFields.length > 0) {
      const queryText = `
        UPDATE st_users 
        SET ${updateFields.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING user_id, user_name, full_name
      `;
      updateValues.push(userIdInt);

      const result = await pool.query(queryText, updateValues);
      
      if (result.rows.length === 0) {
        throw new Error('Update operation affected zero rows');
      }
    }

    await pool.query('COMMIT'); // Commit transaction
    res.status(200).json({ 
      message: 'User updated successfully',
      user: {
        user_id: userIdInt,
        user_name: user_name.toLowerCase() || currentUser.user_name,
        full_name: full_name || currentUser.full_name
      }
    });
    
  } catch (error) {
    await pool.query('ROLLBACK'); // Rollback on error
    console.error('Error updating user:', error);
    
    // Handle specific PostgreSQL errors
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ 
        message: 'Database constraint violation',
        detail: error.detail
      });
    }
    
    res.status(500).json({ 
      message: 'Error updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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
      // Convert user_id to integer
      const userIdInt = parseInt(user_id, 10);
      if (isNaN(userIdInt)) {
        return res.status(400).json({ 
          error: "Invalid user ID", 
          message: "User ID must be a valid number" 
        });
      }

      // Check if user exists
      const userCheck = await pool.query(
        'SELECT user_id, user_name FROM st_users WHERE user_id = $1',
        [userIdInt]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ 
          error: "User not found", 
          message: "The user you are trying to delete does not exist" 
        });
      }

      // Check for transactions linked to this user
      const transactionsCheck = await pool.query(
        'SELECT COUNT(*) as count FROM transactions WHERE counted_by = $1',
        [userIdInt]
      );
      
      const transactionCount = parseInt(transactionsCheck.rows[0].count);
      
      if (transactionCount > 0) {
        return res.status(409).json({ 
          error: "Cannot delete user", 
          message: `Cannot delete user because they have ${transactionCount} transaction(s) linked to them.` 
        });
      }

      // Check for other references (locations, sections, teams created by this user)
      const locationsCheck = await pool.query(
        'SELECT COUNT(*) as count FROM st_locations WHERE created_by = $1',
        [userIdInt]
      );
      
      const sectionsCheck = await pool.query(
        'SELECT COUNT(*) as count FROM st_sections WHERE created_by = $1',
        [userIdInt]
      );
      
      const teamsCheck = await pool.query(
        'SELECT COUNT(*) as count FROM teams WHERE created_by = $1',
        [userIdInt]
      );
      
      const reconciliationCheck = await pool.query(
        'SELECT COUNT(*) as count FROM reconciliation_records WHERE created_by = $1',
        [userIdInt]
      );
      
      const locationsCount = parseInt(locationsCheck.rows[0].count);
      const sectionsCount = parseInt(sectionsCheck.rows[0].count);
      const teamsCount = parseInt(teamsCheck.rows[0].count);
      const reconciliationCount = parseInt(reconciliationCheck.rows[0].count);
      
      if (locationsCount > 0 || sectionsCount > 0 || teamsCount > 0 || reconciliationCount > 0) {
        const references = [];
        if (locationsCount > 0) references.push(`${locationsCount} location(s)`);
        if (sectionsCount > 0) references.push(`${sectionsCount} section(s)`);
        if (teamsCount > 0) references.push(`${teamsCount} team(s)`);
        if (reconciliationCount > 0) references.push(`${reconciliationCount} reconciliation record(s)`);
        
        return res.status(409).json({ 
          error: "Cannot delete user", 
          message: `Cannot delete user because they have created: ${references.join(', ')}. Please reassign these items to another user first.` 
        });
      }

      // If no blocking references, proceed with deletion
      await pool.query(`DELETE FROM st_users WHERE user_id = $1`, [userIdInt]);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
};

exports.addLocation = async (req, res) => {
    try {
      const { location_desc, warehouse, branch } = req.body;
      if (!location_desc || !warehouse) {
        return res.status(400).json({ message: "Location description and warehouse are required" });
      }

      const newLocation = await createLocation(location_desc, warehouse, branch ?? null);
      res.status(201).json(newLocation);
    } catch (error) {
      res.status(500).json({ message: "Error creating location", error });
    }
  };

  exports.addSubLocation = async (req, res) => {
    try {
      const { location_id, section_desc } = req.body;
      console.log (location_id, section_desc);
      if (!location_id || !section_desc) {
        return res.status(400).json({ message: "Location ID and sub-location description are required" });
      }
  
      const newSubLocation = await createSubLocation(location_id, section_desc);
      res.status(201).json(newSubLocation);
    } catch (error) {
      res.status(500).json({ message: "Error creating sub-location", error });
    }
  };

  exports.deleteSubLocation = async (req,res) => {
    try {
        console.log("=== DELETE SECTION REQUEST ===");
        console.log("Request params:", req.params);
        console.log("Request URL:", req.url);
        console.log("Request method:", req.method);
        
        // Handle both parameter names for backward compatibility
        const { sub_location_id, section_id } = req.params;
        const idToDelete = section_id || sub_location_id;
        
        console.log("ID to delete:", idToDelete);
        
        if (!idToDelete) {
            console.log("ERROR: No section ID provided");
            return res.status(400).json({ error: "Section ID is required" });
        }
        
        // Check if section exists and has any related data before deletion
        const checkQuery = "SELECT section_id, section_desc FROM st_sections WHERE section_id = $1";
        const checkResult = await pool.query(checkQuery, [idToDelete]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: "Section not found" });
        }
        
        // Check if section has any transactions
        const transactionCheck = await pool.query(
            "SELECT COUNT(*) as count FROM transactions WHERE section_id = $1", 
            [idToDelete]
        );
        
        console.log(`Transaction count for section ${idToDelete}:`, transactionCheck.rows[0].count);
        
        if (parseInt(transactionCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                error: "Cannot delete section. This section has transactions recorded. Please complete or remove all transactions before deleting." 
            });
        }
        
        // Check if section has any assigned locations
        const assignmentCheck = await pool.query(
            "SELECT COUNT(*) as count FROM assigned_locations WHERE sub_location_id = $1", 
            [idToDelete]
        );
        
        if (parseInt(assignmentCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                error: "Cannot delete section. This section has assigned teams or checkers. Please unassign all teams before deleting." 
            });
        }
        
        // Delete the section
        console.log("Executing delete query for section ID:", idToDelete);
        await pool.query("DELETE FROM st_sections WHERE section_id = $1", [idToDelete]);
        console.log("Section deleted successfully:", idToDelete);
        res.status(200).json({ message: "Section deleted successfully" });
      } catch (error) {
        console.error("Error deleting section:", error);
        res.status(500).json({ error: "Server error while deleting section" });
      }
  }

  exports.deleteLocation = async (req, res) => {
    try {
      const { location_id } = req.params;
      console.log('Deleting location:', location_id);
      
      // Start transaction
      await pool.query('BEGIN');
      
      // Check if there are any transactions linked to this location
      const transactionCheck = await pool.query(
        'SELECT COUNT(*) as count FROM transactions WHERE location_id = $1',
        [location_id]
      );
      
      const transactionCount = parseInt(transactionCheck.rows[0].count);
      
      if (transactionCount > 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Cannot delete location. There are ${transactionCount} transaction(s) linked to this physical inventory.`,
          hasTransactions: true,
          transactionCount 
        });
      }
      
      // Delete assigned items for this location
      await pool.query("DELETE FROM assigned_items WHERE location_id = $1", [location_id]);
      
      // Delete assigned locations (team assignments)
      await pool.query("DELETE FROM assigned_locations WHERE location_id = $1", [location_id]);
      
      // Delete all sections for this location
      await pool.query("DELETE FROM st_sections WHERE location_id = $1", [location_id]);
      
      // Finally, delete the location
      await pool.query("DELETE FROM st_locations WHERE location_id = $1", [location_id]);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      console.log('Location deleted successfully:', location_id);
      res.status(200).json({ 
        message: "Physical inventory deleted successfully",
        success: true 
      });
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error("Error deleting location:", error);
      res.status(500).json({ 
        error: "Server error while deleting physical inventory",
        message: error.message 
      });
    }
  }

  exports.assignUserToSubLocation = async (req, res) => {
    try {
      const { location_id, sub_location_id, team_id, status } = req.body;
      console.log (location_id, sub_location_id, team_id, status);
  
      // Validate input
      if (!location_id || !sub_location_id || !team_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      // Check if section is already assigned to any team
      const checkQuery = `
        SELECT al.id, al.team_id, t.team_name 
        FROM assigned_locations al
        JOIN teams t ON al.team_id = t.team_id
        WHERE al.location_id = $1 AND al.sub_location_id = $2
      `;
      
      const checkResult = await pool.query(checkQuery, [location_id, sub_location_id]);
      
      if (checkResult.rows.length > 0) {
        const existingAssignment = checkResult.rows[0];
        return res.status(409).json({ 
          error: "Section already assigned", 
          message: `This section is already assigned to team: ${existingAssignment.team_name}`,
          existingTeam: existingAssignment.team_name,
          existingTeamId: existingAssignment.team_id
        });
      }
  
      const assigned_at = new Date();
  
      // Insert into database
      const query = `
        INSERT INTO assigned_locations (location_id, sub_location_id, team_id, assigned_at, status)
        VALUES ($1, $2, $3, $4, $5) RETURNING *;
      `;
      
      const values = [location_id, sub_location_id, team_id, assigned_at, status];
      const result = await pool.query(query, values);
  
      res.status(201).json({ message: "Team assigned successfully", data: result.rows[0] });
    } catch (error) {
      console.error("Error assigning team:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  exports.assignForms = async (req, res) => {
    const { location_id, items } = req.body;

    console.log(location_id, items);

    // Ensure the data is valid
    if (!location_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid data provided' });
    }

    try {
        // Trim spaces from each item
        const trimmedItems = items.map(item => item.trim());

        // Check which items are already assigned
        const existingItemsQuery = `
            SELECT item_name FROM assigned_items 
            WHERE location_id = $1 AND item_name = ANY($2::text[])
        `;
        const existingItemsResult = await pool.query(existingItemsQuery, [location_id, trimmedItems]);
        const existingItems = existingItemsResult.rows.map(row => row.item_name);

        // Filter out already assigned items
        const newItems = trimmedItems.filter(item => !existingItems.includes(item));

        if (newItems.length === 0) {
            return res.json({ 
                success: true, 
                message: "All selected items are already assigned to this location",
                alreadyAssigned: existingItems,
                newlyAssigned: []
            });
        }

        // Insert only the new items
        const insertQuery = `
            INSERT INTO assigned_items (location_id, item_name) 
            VALUES ${newItems.map((_, index) => `($1, $${index + 2})`).join(', ')}
        `;
        
        await pool.query(insertQuery, [location_id, ...newItems]);

        return res.json({ 
            success: true, 
            message: `Successfully assigned ${newItems.length} new item(s)`,
            alreadyAssigned: existingItems,
            newlyAssigned: newItems
        });
    } catch (error) {
        console.error('Error assigning items:', error);
        return res.status(500).json({ error: 'Error assigning items. Please try again.' });
    }
};

exports.deleteItem = async (req, res) => {
  const { itemId } = req.body;

  console.log(itemId);

  try {

      const query = `
          DELETE FROM assigned_items where id = $1;
      `;

      await pool.query(query, [itemId]);

      return res.json({ success: true, message: "Items removed successfully" });
  } catch (error) {
      console.error('Error removing items:', error);
      return res.status(500).json({ error: 'Error removing items. Please try again.' });
  }
};

exports.deleteAssignedItem = async (req, res) => {
  const { location_id, item_id } = req.params;

  console.log("=== DELETE ASSIGNED ITEM ===");
  console.log("Location ID:", location_id);
  console.log("Item ID:", item_id);

  try {
      // Verify the item exists and belongs to the specified location
      const checkQuery = `
          SELECT id, item_name FROM assigned_items 
          WHERE id = $1 AND location_id = $2;
      `;
      
      const checkResult = await pool.query(checkQuery, [item_id, location_id]);
      
      if (checkResult.rows.length === 0) {
          return res.status(404).json({ 
              error: "Item not found or does not belong to this location" 
          });
      }

      // Delete the item
      const deleteQuery = `
          DELETE FROM assigned_items 
          WHERE id = $1 AND location_id = $2;
      `;

      await pool.query(deleteQuery, [item_id, location_id]);

      console.log(`Item ${item_id} deleted successfully from location ${location_id}`);

      return res.json({ 
          success: true, 
          message: "Item removed successfully",
          deletedItem: checkResult.rows[0]
      });
  } catch (error) {
      console.error('Error removing assigned item:', error);
      return res.status(500).json({ 
          error: 'Error removing item. Please try again.' 
      });
  }
};

exports.deleteAssignedLocation = async (req, res) => {
  const { location_id } = req.params;

  console.log("=== DELETE ALL ASSIGNED ITEMS ===");
  console.log("Location ID:", location_id);

  try {
      // Get count of items before deletion for logging
      const countQuery = `
          SELECT COUNT(*) as count FROM assigned_items 
          WHERE location_id = $1;
      `;
      
      const countResult = await pool.query(countQuery, [location_id]);
      const itemCount = parseInt(countResult.rows[0].count);

      // Delete all assigned items for the location
      const deleteQuery = `
          DELETE FROM assigned_items 
          WHERE location_id = $1;
      `;

      const deleteResult = await pool.query(deleteQuery, [location_id]);

      console.log(`${itemCount} items deleted for location ${location_id}`);

      return res.json({ 
          success: true, 
          message: `${itemCount} items removed successfully`,
          deletedCount: itemCount
      });
  } catch (error) {
      console.error('Error removing all assigned items:', error);
      return res.status(500).json({ 
          error: 'Error removing items. Please try again.' 
      });
  }
};

exports.postTeams = async (req, res) => {
    const { teamName, tagRange, userRoles } = req.body;

    const current_tag = tagRange.from;
  
    try {
      await pool.query('BEGIN');

      // Validate team name is not empty
      if (!teamName || teamName.trim() === '') {
        await pool.query('ROLLBACK');
        return res.status(400).json({ 
          success: false,
          message: "Team name is required" 
        });
      }

      // Validate tag range values
      if (tagRange.from === undefined || tagRange.to === undefined) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ 
          success: false,
          message: "Tag range (from and to) is required" 
        });
      }

      const tagFrom = parseInt(tagRange.from);
      const tagTo = parseInt(tagRange.to);

      if (isNaN(tagFrom) || isNaN(tagTo)) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ 
          success: false,
          message: "Tag range must be valid numbers" 
        });
      }

      // Allow 0-0 as default, otherwise tagFrom must be less than tagTo
      if (tagFrom !== 0 || tagTo !== 0) {
        if (tagFrom >= tagTo) {
          await pool.query('ROLLBACK');
          return res.status(400).json({ 
            success: false,
            message: "Tag 'from' must be less than tag 'to'" 
          });
        }
      }

      // Check for duplicate team name
      const existingTeamName = await pool.query(
        'SELECT team_id FROM teams WHERE LOWER(team_name) = LOWER($1)',
        [teamName.trim()]
      );

      if (existingTeamName.rows.length > 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ 
          success: false,
          message: "Team name already exists. Please choose a different name." 
        });
      }

      // Check for tag range conflicts (skip if both are 0, as 0-0 is the default/unassigned value)
      if (tagFrom !== 0 || tagTo !== 0) {
        const existingTagRanges = await pool.query(`
          SELECT team_id, team_name, tag_from, tag_to 
          FROM teams 
          WHERE (
            ($1 BETWEEN CAST(tag_from AS INTEGER) AND CAST(tag_to AS INTEGER)) OR
            ($2 BETWEEN CAST(tag_from AS INTEGER) AND CAST(tag_to AS INTEGER)) OR
            (CAST(tag_from AS INTEGER) BETWEEN $1 AND $2) OR
            (CAST(tag_to AS INTEGER) BETWEEN $1 AND $2)
          )
        `, [tagFrom, tagTo]);

        if (existingTagRanges.rows.length > 0) {
          const conflictingTeam = existingTagRanges.rows[0];
          await pool.query('ROLLBACK');
          return res.status(400).json({ 
            success: false,
            message: `Tag range ${tagFrom}-${tagTo} conflicts with existing team "${conflictingTeam.team_name}" (${conflictingTeam.tag_from}-${conflictingTeam.tag_to}). Please choose a different range.`
          });
        }
      }

      // Get the highest tag_to value to suggest next available range (skip if tagFrom is 0, as 0-0 is default/unassigned)
      if (tagFrom !== 0 || tagTo !== 0) {
        const maxTagResult = await pool.query(`
          SELECT MAX(CAST(tag_to AS INTEGER)) as max_tag_to 
          FROM teams 
          WHERE tag_to IS NOT NULL AND tag_to != ''
        `);

        const maxTagTo = maxTagResult.rows[0].max_tag_to;
        if (maxTagTo && tagFrom <= maxTagTo) {
          const suggestedFrom = maxTagTo + 1;
          await pool.query('ROLLBACK');
          return res.status(400).json({ 
            success: false,
            message: `Tag range already in use. Next available range starts from ${suggestedFrom}. Please use ${suggestedFrom} or higher for tag 'from'.`
          });
        }
      }

      // Validate that no duplicate user-role combinations exist within the new team
      const userRoleCombinations = userRoles.map(ur => `${ur.userId}-${ur.roleId}`);
      const uniqueCombinations = new Set(userRoleCombinations);
      
      if (userRoleCombinations.length !== uniqueCombinations.size) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ 
          success: false,
          message: "Duplicate user-role combinations are not allowed within the same team" 
        });
      }

      console.log('About to insert team with:', { teamName, tagRange, current_tag });

      // Insert into teams table
      const teamResult = await pool.query(
        "INSERT INTO teams (team_name, tag_from, tag_to, current_tag) VALUES ($1, $2, $3, $4) RETURNING team_id",
        [teamName.trim(), tagRange.from, '10000000', current_tag]
      );
      
      if (!teamResult.rows || teamResult.rows.length === 0) {
        throw new Error('Team creation failed - no team_id returned');
      }
      
      const teamId = teamResult.rows[0].team_id;
      console.log('Team created successfully with ID:', teamId);

      // Verify the team exists before creating members
      const verifyTeam = await pool.query('SELECT team_id FROM teams WHERE team_id = $1', [teamId]);
      if (verifyTeam.rows.length === 0) {
        throw new Error(`Team with ID ${teamId} was not found after creation`);
      }

      console.log('About to insert team members:', userRoles);

      // Insert team members into team_members table one by one for better error handling
      for (const { userId, roleId } of userRoles) {
        console.log(`Inserting member: userId=${userId}, roleId=${roleId}, teamId=${teamId}`);
        await pool.query(
          "INSERT INTO team_members (team_id, user_id, role_id) VALUES ($1, $2, $3)",
          [teamId, userId, roleId]
        );
      }
      
      console.log('Team members created successfully');
      
      await pool.query('COMMIT');
  
      res.status(201).json({ 
        success: true,
        message: "Team created successfully", 
        teamId 
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error("Error creating team:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        detail: error.detail
      });
      res.status(500).json({ 
        success: false,
        error: "Internal server error",
        message: error.message
      });
    }
};

exports.updateTeam = async (req, res) => {
    const { team_id } = req.params;
    const { team_name, tag_from, tag_to, members } = req.body;

    try {
        await pool.query('BEGIN');

        // Check if team exists
        const teamCheck = await pool.query(
            "SELECT team_id FROM teams WHERE team_id = $1",
            [team_id]
        );

        if (teamCheck.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: "Team not found" 
            });
        }

        // Update team basic info
        await pool.query(
            "UPDATE teams SET team_name = $1, tag_from = $2, tag_to = $3 WHERE team_id = $4",
            [team_name, tag_from, tag_to, team_id]
        );

        // Get current team members and clean up duplicates
        const currentMembers = await pool.query(
            "SELECT user_id, role_id FROM team_members WHERE team_id = $1",
            [team_id]
        );
        
        // Clean up duplicate entries in team_members table
        console.log('Cleaning up duplicate team members...');
        await pool.query(
            `DELETE FROM team_members 
             WHERE team_id = $1 
             AND id NOT IN (
                 SELECT MIN(id) 
                 FROM team_members 
                 WHERE team_id = $1 
                 GROUP BY user_id, role_id
             )`,
            [team_id]
        );
        
        // Get cleaned up current members
        const cleanedCurrentMembers = await pool.query(
            "SELECT user_id, role_id FROM team_members WHERE team_id = $1",
            [team_id]
        );
        
        console.log('Members before cleanup:', currentMembers.rows.length);
        console.log('Members after cleanup:', cleanedCurrentMembers.rows.length);

        // Validate that no duplicate user-role combinations exist within the updated team
        const userRoleCombinations = members.map(m => `${m.user_id}-${m.role_id}`);
        const uniqueCombinations = new Set(userRoleCombinations);
        
        if (userRoleCombinations.length !== uniqueCombinations.size) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: "Duplicate user-role combinations are not allowed within the same team" 
            });
        }

        // Find members to remove (in current but not in new)
        const currentMemberKeys = cleanedCurrentMembers.rows.map(m => `${m.user_id}-${m.role_id}`);
        const newMemberKeys = members.map(m => `${m.user_id}-${m.role_id}`);
        
        console.log('=== TEAM UPDATE DEBUG ===');
        console.log('Team ID:', team_id);
        console.log('Current members from DB (cleaned):', cleanedCurrentMembers.rows);
        console.log('New members from request:', members);
        console.log('Current member keys:', currentMemberKeys);
        console.log('New member keys:', newMemberKeys);
        
        // Simple comparison: find members to remove (in current but not in new)
        const membersToRemove = cleanedCurrentMembers.rows.filter(m => {
            const memberKey = `${m.user_id}-${m.role_id}`;
            const shouldRemove = !newMemberKeys.includes(memberKey);
            console.log(`Checking member ${memberKey}: shouldRemove = ${shouldRemove}`);
            return shouldRemove;
        });

        // Find members to add (in new but not in current)
        const membersToAdd = members.filter(m => {
            const memberKey = `${m.user_id}-${m.role_id}`;
            const shouldAdd = !currentMemberKeys.includes(memberKey);
            console.log(`Checking new member ${memberKey}: shouldAdd = ${shouldAdd}`);
            return shouldAdd;
        });

        console.log('Members to remove:', membersToRemove);
        console.log('Members to add:', membersToAdd);
        console.log('=== END DEBUG ===');

        // Remove members that are no longer in the team
        for (const member of membersToRemove) {
            await pool.query(
                "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 AND role_id = $3",
                [team_id, member.user_id, member.role_id]
            );
        }

        // Add new members
        for (const { user_id, role_id } of membersToAdd) {
            await pool.query(
                "INSERT INTO team_members (team_id, user_id, role_id) VALUES ($1, $2, $3)",
                [team_id, user_id, role_id]
            );
        }

        await pool.query('COMMIT');

        res.status(200).json({ 
            success: true, 
            message: "Team updated successfully",
            changes: {
                removed: membersToRemove.length,
                added: membersToAdd.length
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error("Error updating team:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error",
            error: error.message 
        });
    }
};

exports.PostTransactions = async (req, res) => {
  try {
    await pool.query('BEGIN');

    // 1. FIRST get and lock the current tag
    const tagQuery = `
      SELECT current_tag 
      FROM teams 
      WHERE team_id = $1 
      FOR UPDATE`; // FOR UPDATE locks the row
    
    const tagResult = await pool.query(tagQuery, [req.body.team_id]);
    const currentTag = tagResult.rows[0].current_tag;

    // 2. Validate tag range
    const teamQuery = `SELECT tag_from, tag_to FROM teams WHERE team_id = $1`;
    const teamResult = await pool.query(teamQuery, [req.body.team_id]);
    
    if (!teamResult.rows || teamResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }
    
    const { tag_from, tag_to } = teamResult.rows[0];

    if (currentTag > tag_to) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: "Tag range exhausted, Please check with the Admin"
      });
    }

    // 3. Check transaction count for this location/section/team
    const checkAssignmentQuery = `
      SELECT COUNT(*) as transaction_count
      FROM transactions
      WHERE location_id = $1 
        AND section_id = $2
        AND team_id = $3
    `;
    const checkResult = await pool.query(checkAssignmentQuery, [
      req.body.location_id,
      req.body.section_id,
      req.body.team_id
    ]);
    const transactionCount = parseInt(checkResult.rows[0].transaction_count, 10);

    // 4. Insert transaction
    const transactionQuery = `
      INSERT INTO transactions (
        tag_id, form, type, grade, size, finish, ext_finish, 
        width, length, sys_tag_no, remarks, count_type, qty,
        counted_by, team_id, location_id, section_id, mill, heat, ad_cmts, role, location, page_number, serial_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING transaction_id
    `;
    
    const sysTagNo = req.body.sys_tag_no != null && String(req.body.sys_tag_no).trim() !== ''
      ? String(req.body.sys_tag_no).trim()
      : null;

    const transactionResult = await pool.query(transactionQuery, [
      currentTag,
      req.body.form,
      req.body.type,
      req.body.grade,
      req.body.size,
      req.body.finish,
      req.body.ext_finish,
      req.body.width,
      req.body.length,
      sysTagNo,
      req.body.remarks,
      req.body.count_type,
      req.body.qty,
      req.body.counted_by,
      req.body.team_id,
      req.body.location_id,
      req.body.section_id,
      req.body.mill,
      req.body.heat,
      req.body.ad_cmts,
      req.body.role,
      req.body.location,
      req.body.page_number || null,
      req.body.serial_number || null
    ]);

    const transactionId = transactionResult.rows[0].transaction_id;
    console.log(transactionId);

    // 5. Update the tag pointer
    const newTag = currentTag + 1;
    await pool.query(`
      UPDATE teams 
      SET current_tag = $1 
      WHERE team_id = $2`, 
      [newTag, req.body.team_id]
    );

    // 6. Update assigned_locations status based on transaction count
    const updateAssignmentQuery = `
      UPDATE assigned_locations
      SET status = CASE 
                    WHEN $1 != 0 THEN 'Counting in progress by Counter' 
                    ELSE status 
                  END
      WHERE location_id = $2
        AND sub_location_id = $3
        AND team_id = $4
        AND status = 'Not Initiated by Counter'
      RETURNING id
    `;
    
    try {
      const updateResult = await pool.query(updateAssignmentQuery, [
        transactionCount, // Now $1
        req.body.location_id, // $2
        req.body.section_id, // $3
        req.body.team_id // $4
      ]);
      console.log('Update result:', updateResult.rows); // Log the result
    } catch (updateError) {
      console.error('Detailed update error:', {
        query: updateAssignmentQuery,
        parameters: [
          transactionCount,
          req.body.location_id,
          req.body.section_id,
          req.body.team_id
        ],
        error: updateError
      });
      throw updateError; // Re-throw to be caught by the outer catch
    }

    // 7. Insert bundles if they exist
    let bundles = [];
    if (req.body.count_type === 'bundle' && req.body.bundles && req.body.bundles.length > 0) {
      const bundleQuery = `
        INSERT INTO bundles (
          transaction_id, tag_id, num_of_bundle, bundle_count
        ) VALUES ${req.body.bundles.map((_, i) => 
          `($${i*4 + 1}, $${i*4 + 2}, $${i*4 + 3}, $${i*4 + 4})`
        ).join(',')}
        RETURNING id, num_of_bundle, bundle_count
      `;
      
      const bundleValues = req.body.bundles.flatMap(bundle => [
        transactionId,
        req.body.tag_id,
        bundle.num_of_bundle,
        bundle.bundle_count
      ]);

      const bundleResult = await pool.query(bundleQuery, bundleValues);
      bundles = bundleResult.rows;
    }

    await pool.query('COMMIT');

    // 8. Return success response with transaction ID
    res.status(201).json({
      success: true,
      id: transactionId,
      transaction_id: transactionId, // Also include transaction_id for compatibility
      bundles,
      statusUpdated: transactionCount === 0 // Indicates if status was updated
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  }
};

exports.updateTeamTagPointer = async (req, res) => {
  
  try {
    const teamId = req.params.team_id;
    const { next_tag } = req.body;

    // Validate input
    if (!Number.isInteger(next_tag)) {
      return res.status(400).json({
        success: false,
        message: "Valid numeric next_tag is required"
      });
    }

    // Update current_tag in teams table
    const updateQuery = `
      UPDATE teams
      SET current_tag = $1
      WHERE team_id = $2
      RETURNING tag_from, tag_to, current_tag
    `;
    const updateResult = await pool.query(updateQuery, [next_tag, teamId]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    res.json({
      success: true,
      tag_from: parseInt(updateResult.rows[0].tag_from),
      tag_to: parseInt(updateResult.rows[0].tag_to),
      current_tag: parseInt(updateResult.rows[0].current_tag)
    });

  } catch (error) {
    console.error('Error updating tag range:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.updateLocationStatus = async (req, res) => {
  const { location_id, section_id } = req.params;
  
  try {
    await pool.query('BEGIN');

    const updateQuery = `
      UPDATE assigned_locations 
      SET status = 'Count Completed'
      WHERE location_id = $1 
      AND sub_location_id = $2
      RETURNING *;
    `;

    const { rows } = await pool.query(updateQuery, [
      location_id, 
      section_id,
      // req.user.id // assuming you have user info from auth
    ]);

    if (rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'No matching assigned location found'
      });
    }

    await pool.query('COMMIT');
    res.status(200).json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Complete checker verification for a location and section
exports.completeCheckerVerification = async (req, res) => {
  const { location_id, section_id } = req.body;
  
  if (!location_id || !section_id) {
    return res.status(400).json({
      success: false,
      message: 'Location ID and Section ID are required'
    });
  }

  try {
    await pool.query('BEGIN');

    const updateQuery = `
      UPDATE assigned_locations 
      SET status = 'Completed'
      WHERE location_id = $1 
      AND sub_location_id = $2
      RETURNING *;
    `;

    const { rows } = await pool.query(updateQuery, [location_id, section_id]);

    if (rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'No matching assigned location found'
      });
    }

    await pool.query('COMMIT');
    res.status(200).json({
      success: true,
      message: 'Checker verification completed successfully',
      data: rows[0]
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error completing checker verification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.enableChecker = async (req, res) => {
  
  const { location_id, sectionId } = req.params;
  
  try {
    // Update the status in assigned_location table
    const updateQuery = `
      UPDATE assigned_locations
      SET status = 'Assigned Checker' 
      WHERE location_id = $1 AND sub_location_id = $2
      RETURNING *`;
    
    const { rows } = await pool.query(updateQuery, [location_id, sectionId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    res.json({ 
      success: true,
      message: 'Checker enabled successfully',
      data: rows[0]
    });
    
  } catch (error) {
    console.error('Error enabling checker:', error);
    res.status(500).json({ error: 'Failed to enable checker' });
  }
};

exports.PostCheckerTransactions = async (req, res) => {
  try {
    await pool.query('BEGIN');

    // 4. Insert transaction
    const transactionQuery = `
      INSERT INTO transactions (
        tag_id, form, type, grade, size, finish, ext_finish, 
        width, length, remarks, count_type, qty,
        counted_by, team_id, location_id, section_id, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING transaction_id
    `;
    
    const transactionResult = await pool.query(transactionQuery, [
      req.body.tag_id,
      req.body.form,
      req.body.type,
      req.body.grade,
      req.body.size,
      req.body.finish,
      req.body.ext_finish,
      req.body.width,
      req.body.length,
      req.body.remarks,
      req.body.count_type,
      req.body.qty,
      req.body.counted_by,
      req.body.team_id,
      req.body.location_id,
      req.body.section_id,
      req.body.location
    ]);

    const transactionId = transactionResult.rows[0].transaction_id;
    console.log(transactionId);
    
    try {
      const updateResult = await pool.query(updateAssignmentQuery, [
        transactionCount, // Now $1
        req.body.location_id, // $2
        req.body.section_id, // $3
        req.body.team_id // $4
      ]);
      console.log('Update result:', updateResult.rows); // Log the result
    } catch (updateError) {
      console.error('Detailed update error:', {
        query: updateAssignmentQuery,
        parameters: [
          transactionCount,
          req.body.location_id,
          req.body.section_id,
          req.body.team_id
        ],
        error: updateError
      });
      throw updateError; // Re-throw to be caught by the outer catch
    }

    // 7. Insert bundles if they exist
    let bundles = [];
    if (req.body.count_type === 'bundle' && req.body.bundles && req.body.bundles.length > 0) {
      const bundleQuery = `
        INSERT INTO bundles (
          transaction_id, tag_id, num_of_bundle, bundle_count
        ) VALUES ${req.body.bundles.map((_, i) => 
          `($${i*4 + 1}, $${i*4 + 2}, $${i*4 + 3}, $${i*4 + 4})`
        ).join(',')}
        RETURNING id, num_of_bundle, bundle_count
      `;
      
      const bundleValues = req.body.bundles.flatMap(bundle => [
        transactionId,
        req.body.tag_id,
        bundle.num_of_bundle,
        bundle.bundle_count
      ]);

      const bundleResult = await pool.query(bundleQuery, bundleValues);
      bundles = bundleResult.rows;
    }

    await pool.query('COMMIT');

    // 8. Return success response with transaction ID
    res.status(201).json({
      success: true,
      id: transactionId,
      bundles,
      statusUpdated: transactionCount === 0 // Indicates if status was updated
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  }
};

// New dedicated endpoint for updating transactions in checker review page
// New endpoint specifically for counter review transaction updates
exports.updateCounterReviewTransaction = async (req, res) => {
  try {
    console.log('Counter Review - Received transaction update request:', req.body);
    console.log('Transaction ID from params:', req.params.transaction_id);
    
    const transactionId = req.params.transaction_id;
    const {
      tag_id,
      sys_tag_no,
      form,
      grade,
      size,
      finish,
      ext_finish,
      width,
      length,
      mill,
      heat,
      location,
      type,
      remarks,
      ad_cmts,
      page_number,
      serial_number,
      qty
    } = req.body;

    // Validate required fields
    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        error: "Transaction ID is required" 
      });
    }

    console.log('Updating counter review transaction:', {
      transactionId,
      form,
      grade,
      size,
      finish,
      ext_finish,
      width,
      length,
      mill,
      heat,
      remarks,
      qty
    });

    // Update the transaction with the new data
    const updateQuery = `
      UPDATE transactions 
      SET 
        tag_id = COALESCE($2, tag_id),
        sys_tag_no = COALESCE($3, sys_tag_no),
        form = COALESCE($4, form),
        grade = COALESCE($5, grade),
        size = COALESCE($6, size),
        finish = COALESCE($7, finish),
        ext_finish = COALESCE($8, ext_finish),
        width = COALESCE($9, width),
        length = COALESCE($10, length),
        mill = COALESCE($11, mill),
        heat = COALESCE($12, heat),
        location = COALESCE($13, location),
        type = COALESCE($14, type),
        remarks = COALESCE($15, remarks),
        ad_cmts = COALESCE($16, ad_cmts),
        page_number = COALESCE($17, page_number),
        serial_number = COALESCE($18, serial_number),
        qty = COALESCE($19, qty),
        updated_at = NOW()
      WHERE transaction_id = $1
      RETURNING *`;

    const { rows } = await pool.query(updateQuery, [
      transactionId,
      tag_id,
      sys_tag_no,
      form,
      grade,
      size,
      finish,
      ext_finish,
      width,
      length,
      mill,
      heat,
      location,
      type,
      remarks,
      ad_cmts,
      page_number,
      serial_number,
      qty
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found"
      });
    }

    console.log('Counter review transaction updated successfully:', rows[0]);

    res.json({
      success: true,
      message: "Counter review transaction updated successfully",
      data: rows[0]
    });

  } catch (error) {
    console.error('Error updating counter review transaction:', error);
    res.status(500).json({
      success: false,
      error: "Failed to update counter review transaction",
      details: error.message
    });
  }
};

exports.updateTransactionById = async (req, res) => {
  try {
    console.log('Received transaction update request:', req.body);
    console.log('Headers:', req.headers);
    
    const {
      transaction_id,
      tag_id,
      form,
      type,
      grade,
      size,
      width,
      finish,
      ext_finish,
      length,
      count_type,
      qty,
      location_id,
      section_id,
      location,
      mill,
      heat,
      remarks,
      ad_cmts,
      bundles
    } = req.body;

    // Get role and user from headers
    const role = req.headers['x-selected-role'] || null;
    const counted_by = req.headers['x-selected-user'] || null;
    const now = new Date().toISOString();

    // Validate required fields
    if (!transaction_id) {
      return res.status(400).json({ 
        success: false, 
        error: "Transaction ID is required" 
      });
    }

    await pool.query('BEGIN');

    // Calculate total quantity and checker count
    let totalQty = qty;
    let calculatedCheckerCount = qty;
    
    if (count_type === 'bundle' && bundles && Array.isArray(bundles)) {
      totalQty = bundles.reduce((sum, bundle) => sum + (bundle.num_of_bundle * bundle.bundle_count), 0);
      calculatedCheckerCount = totalQty;
    }

    // Update the transaction
    const updateTxQuery = `
      UPDATE transactions SET
        tag_id = $1,
        form = $2,
        type = $3,
        grade = $4,
        size = $5,
        width = $6,
        finish = $7,
        ext_finish = $8,
        length = $9,
        count_type = $10,
        qty = $11,
        location_id = $12,
        section_id = $13,
        updated_at = $14,
        checker_count = $15,
        mill = $16,
        heat = $17,
        ad_cmts = $18,
        remarks = $19,
        location = $20
      WHERE transaction_id = $21
      RETURNING transaction_id, tag_id, form, type, grade, size, width, finish, ext_finish, length, count_type, qty, location_id, section_id, mill, heat, ad_cmts, remarks, location, updated_at
    `;
    
    const txValues = [
      tag_id, form, type, grade, size, width, finish, ext_finish, length,
      count_type, totalQty, location_id, section_id, now,
      calculatedCheckerCount, mill, heat, ad_cmts, remarks, location, transaction_id
    ];
    
    console.log('Update query parameters:', {
      tag_id, form, type, grade, size, width, finish, ext_finish, length,
      count_type, totalQty, location_id, section_id, now,
      calculatedCheckerCount, mill, heat, ad_cmts, remarks, location, transaction_id
    });
    
    const updateResult = await pool.query(updateTxQuery, txValues);
    console.log('Transaction update result:', updateResult.rows);

    if (updateResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: "Transaction not found" 
      });
    }

    // Update bundles if count_type is bundle
    if (count_type === 'bundle' && bundles && Array.isArray(bundles) && bundles.length > 0) {
      // First delete existing bundles
      await pool.query(
        'DELETE FROM bundles WHERE transaction_id = $1',
        [transaction_id]
      );

      // Then insert new bundles
      const bundleInsertQuery = `
        INSERT INTO bundles (
          transaction_id, tag_id, num_of_bundle, bundle_count, created_at
        ) VALUES ${bundles.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
      `;
      
      const bundleValues = bundles.flatMap(bundle => [
        transaction_id, bundle.tag_id, bundle.num_of_bundle, bundle.bundle_count, now
      ]);
      
      await pool.query(bundleInsertQuery, bundleValues);
    }

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: "Transaction updated successfully",
      transaction: updateResult.rows[0]
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Update transaction error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update transaction", 
      details: error.message 
    });
  }
};

async function syncCounterTransactionFromChecker({
  originalTransactionId,
  tagId,
  form,
  type,
  grade,
  size,
  width,
  finish,
  ext_finish,
  length,
  count_type,
  qty,
  checker_count,
  location_id,
  section_id,
  location,
  bundles,
  remarks,
  mill,
  heat,
  ad_cmts,
  now
}) {
  let counterTxId = originalTransactionId || null;

  if (!counterTxId && tagId !== undefined && tagId !== null) {
    const counterLookup = await pool.query(
      `SELECT transaction_id
       FROM transactions
       WHERE tag_id = $1 AND role = 'Counter'
       ORDER BY created_at DESC
       LIMIT 1`,
      [tagId]
    );
    counterTxId = counterLookup.rows[0]?.transaction_id || null;
  }

  if (!counterTxId) return null;

  await pool.query(
    `UPDATE transactions SET
      form = $2,
      type = $3,
      grade = $4,
      size = $5,
      width = $6,
      finish = $7,
      ext_finish = $8,
      length = $9,
      count_type = $10,
      qty = $11,
      checker_count = $12,
      location_id = $13,
      section_id = $14,
      location = $15,
      remarks = $16,
      mill = $17,
      heat = $18,
      ad_cmts = $19,
      verified = true,
      updated_at = $20
    WHERE transaction_id = $1 AND role = 'Counter'`,
    [
      counterTxId,
      form,
      type,
      grade,
      size,
      width,
      finish,
      ext_finish,
      length,
      count_type,
      qty,
      checker_count,
      location_id,
      section_id,
      location,
      remarks,
      mill,
      heat,
      ad_cmts,
      now
    ]
  );

  await pool.query('DELETE FROM bundles WHERE transaction_id = $1', [counterTxId]);
  if (count_type === 'bundle' && bundles && Array.isArray(bundles) && bundles.length > 0) {
    const bundleInsertQuery = `
      INSERT INTO bundles (
        transaction_id, tag_id, num_of_bundle, bundle_count, created_at
      ) VALUES ${bundles.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
    `;

    const bundleValues = bundles.flatMap(bundle => [
      counterTxId,
      tagId,
      bundle.num_of_bundle,
      bundle.bundle_count,
      now
    ]);

    await pool.query(bundleInsertQuery, bundleValues);
  }

  return counterTxId;
}

exports.updateTransactions = async (req, res) => {
  try {
            const {
          tag_id,
          form,
          type,
          grade,
          size,
          width,
          finish,
          ext_finish,
          length,
          count_type,
          checker_count,
          location_id,
          section_id,
          location,
          bundles,
          remarks,
          mill,
          heat,
          ad_cmts
        } = req.body;

    // Get role and user from headers
    const role = req.headers['x-selected-role'] || null;
    const counted_by = req.headers['x-selected-user'] || null;
    const now = new Date().toISOString();

    await pool.query('BEGIN');

    // Check if this is a Checker updating an existing transaction
    if (role === 'Checker') {
      const existingTxQuery = `
        SELECT transaction_id FROM transactions 
        WHERE tag_id = $1 AND role = 'Checker'
        ORDER BY created_at DESC LIMIT 1
      `;
      const existingTxResult = await pool.query(existingTxQuery, [tag_id]);

      if (existingTxResult.rows.length > 0) {
        // UPDATE EXISTING TRANSACTION
        const existingTxId = existingTxResult.rows[0].transaction_id;
        
        // Calculate total quantity and checker count
        let totalQty;
        let calculatedCheckerCount;
        if (count_type === 'bundle' && bundles && Array.isArray(bundles)) {
          totalQty = bundles.reduce((sum, bundle) => sum + (bundle.num_of_bundle * bundle.bundle_count), 0);
          calculatedCheckerCount = totalQty; // For bundle type, checker_count should equal the calculated total
        } else {
          totalQty = checker_count || 0;
          calculatedCheckerCount = checker_count || 0;
        }

        // Update transaction
        const updateTxQuery = `
          UPDATE transactions SET
            form = $1,
            type = $2,
            grade = $3,
            size = $4,
            width = $5,
            finish = $6,
            ext_finish = $7,
            length = $8,
            count_type = $9,
            qty = $10,
            location_id = $11,
            section_id = $12,
            updated_at = $13,
            checker_count = $14,
            mill = $15,
            heat = $16,
            ad_cmts = $17,
            remarks = $18,
            location = $19
          WHERE transaction_id = $20
          RETURNING transaction_id
        `;
        
        const txValues = [
          form, type, grade, size, width, finish, ext_finish, length,
          count_type, totalQty, location_id, section_id, now,
          calculatedCheckerCount, mill, heat, ad_cmts, remarks, location, existingTxId
        ];
        
        await pool.query(updateTxQuery, txValues);

        // Update bundles if count_type is bundle
        if (count_type === 'bundle' && bundles && Array.isArray(bundles) && bundles.length > 0) {
          // First delete existing bundles
          await pool.query(
            'DELETE FROM bundles WHERE transaction_id = $1',
            [existingTxId]
          );

          // Then insert new bundles
          const bundleInsertQuery = `
            INSERT INTO bundles (
              transaction_id, tag_id, num_of_bundle, bundle_count, created_at
            ) VALUES ${bundles.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
          `;
          
          const bundleValues = bundles.flatMap(bundle => [
            existingTxId, tag_id, bundle.num_of_bundle, bundle.bundle_count, now
          ]);
          
          await pool.query(bundleInsertQuery, bundleValues);
        }

        // Note: Removed checker_activity_logs insertion as requested

        await syncCounterTransactionFromChecker({
          tagId: tag_id,
          form,
          type,
          grade,
          size,
          width,
          finish,
          ext_finish,
          length,
          count_type,
          qty: totalQty,
          checker_count: calculatedCheckerCount,
          location_id,
          section_id,
          location,
          bundles,
          remarks,
          mill,
          heat,
          ad_cmts,
          now
        });

        await pool.query('COMMIT');
        return res.status(200).json({
          success: true,
          message: 'Transaction updated and counter verified successfully',
          transaction_id: existingTxId
        });
      }
    }

    // INSERT NEW TRANSACTION (for non-Checker or new Checker records)
    const newTxQuery = `
      INSERT INTO transactions (
        tag_id, form, type, grade, size, width, finish, ext_finish, length,
        count_type, qty, location_id, section_id, counted_by, created_at,
        team_id, updated_at, checker_count, mill, heat, ad_cmts, role, remarks, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING transaction_id
    `;

    // Calculate total quantity and checker count
    let totalQty;
    let calculatedCheckerCount;
    if (count_type === 'bundle' && bundles && Array.isArray(bundles)) {
      totalQty = bundles.reduce((sum, bundle) => sum + (bundle.num_of_bundle * bundle.bundle_count), 0);
      calculatedCheckerCount = totalQty; // For bundle type, checker_count should equal the calculated total
    } else {
      totalQty = checker_count || 0;
      calculatedCheckerCount = checker_count || 0;
    }

    const txValues = [
      tag_id, form, type, grade, size, width, finish, ext_finish, length,
      count_type, totalQty, location_id, section_id, counted_by, now,
      req.body.team_id, now, calculatedCheckerCount, mill, heat, ad_cmts, role, remarks, location
    ];

    const newTxResult = await pool.query(newTxQuery, txValues);
    const newTxId = newTxResult.rows[0].transaction_id;

    // Insert bundles if count_type is bundle
    if (count_type === 'bundle' && bundles && Array.isArray(bundles) && bundles.length > 0) {
      const bundleInsertQuery = `
        INSERT INTO bundles (
          transaction_id, tag_id, num_of_bundle, bundle_count, created_at
        ) VALUES ${bundles.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
      `;
      
      const bundleValues = bundles.flatMap(bundle => [
        newTxId, tag_id, bundle.num_of_bundle, bundle.bundle_count, now
      ]);
      
      await pool.query(bundleInsertQuery, bundleValues);
    }

    // If this is a Checker transaction, verify the original counter transaction
    if (role === 'Checker') {
      const verifyCounterQuery = `
        UPDATE transactions SET 
          verified = true
        WHERE tag_id = $1 AND role = 'Counter'
      `;
      await pool.query(verifyCounterQuery, [tag_id]);
    }

    await pool.query('COMMIT');
    res.status(201).json({
      success: true,
      message: role === 'Checker' ? 'Transaction created and counter verified successfully' : 'Transaction created successfully',
      transaction_id: newTxId
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process transaction',
      error: error.message
    });
  }
};

// Update counter transaction
exports.updateCounterTransaction = async (req, res) => {
  try {
    const {
      id, // Use the transaction ID to identify the specific transaction
      tag_id,
      form,
      type,
      grade,
      size,
      width,
      finish,
      ext_finish,
      length,
      count_type,
      qty,
      location_id,
      section_id,
      bundles,
      remarks,
      mill,
      heat,
      ad_cmts
    } = req.body;

    // Get role and user from headers
    const role = req.headers['x-selected-role'] || 'Counter';
    const counted_by = req.headers['x-selected-user'] || null;
    const now = new Date().toISOString();

    await pool.query('BEGIN');

    // Use the transaction ID to find the specific transaction
    if (!id) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required for update'
      });
    }

    // Verify the transaction exists and is a counter transaction
    const existingTxQuery = `
      SELECT transaction_id FROM transactions 
      WHERE transaction_id = $1 AND role = 'Counter'
    `;
    const existingTxResult = await pool.query(existingTxQuery, [id]);

    if (existingTxResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Counter transaction not found'
      });
    }

    const existingTxId = existingTxResult.rows[0].transaction_id;

    // Update the counter transaction
    const updateQuery = `
      UPDATE transactions SET
        form = $2,
        type = $3,
        grade = $4,
        size = $5,
        width = $6,
        finish = $7,
        ext_finish = $8,
        length = $9,
        count_type = $10,
        qty = $11,
        mill = $12,
        heat = $13,
        ad_cmts = $14,
        remarks = $15,
        updated_at = $16
      WHERE transaction_id = $1
      RETURNING transaction_id
    `;

    const updateValues = [
      existingTxId, form, type, grade, size, width, finish, ext_finish, length,
      count_type, qty, mill, heat, ad_cmts, remarks, now
    ];

    await pool.query(updateQuery, updateValues);

    // Update bundles if count_type is bundle
    if (count_type === 'bundle' && bundles && Array.isArray(bundles)) {
      // Delete existing bundles
      await pool.query('DELETE FROM bundles WHERE transaction_id = $1', [existingTxId]);
      
      // Insert new bundles
      if (bundles.length > 0) {
        const bundleInsertQuery = `
          INSERT INTO bundles (
            transaction_id, tag_id, num_of_bundle, bundle_count, created_at
          ) VALUES ${bundles.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
        `;
        
        const bundleValues = bundles.flatMap(bundle => [
          existingTxId, tag_id, bundle.num_of_bundle, bundle.bundle_count, now
        ]);
        
        await pool.query(bundleInsertQuery, bundleValues);
      }
    }

    await pool.query('COMMIT');
    res.status(200).json({
      success: true,
      message: 'Counter transaction updated successfully',
      transaction_id: existingTxId
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating counter transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update counter transaction',
      error: error.message
    });
  }
};

exports.verifyTransactions = async (req, res) => {
  const { transaction_id } = req.body;
  
  try {
    await pool.query('BEGIN');

    // Get transaction details before verification
    const getTransactionQuery = `
      SELECT t.*, l.location_desc, s.section_desc, tm.team_name
      FROM transactions t
      JOIN st_locations l ON t.location_id = l.location_id
      JOIN st_sections s ON t.section_id = s.section_id
      JOIN teams tm ON t.team_id = tm.team_id
      WHERE t.transaction_id = $1
    `;
    
    const transactionResult = await pool.query(getTransactionQuery, [transaction_id]);
    
    if (transactionResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    // Get role and user from headers or body
    const role = req.headers['x-selected-role'] || req.body.role || 'Checker';
    const counted_by = req.headers['x-selected-user'] || req.body.verified_by || req.body.counted_by;

    // Update transaction to verified with role and counted_by
    const updateQuery = `
      UPDATE transactions 
      SET 
        verified = true
      WHERE transaction_id = $1
      RETURNING *`;
    
    const { rows } = await pool.query(updateQuery, [transaction_id]);
    
    // Note: Removed checker_activity_logs insertion as requested

    await pool.query('COMMIT');
    
    res.json({ 
      success: true,
      message: 'Transaction verified successfully',
      data: rows[0]
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error verifying transaction:', error);
    res.status(500).json({ 
      error: 'Failed to verify transaction',
      details: error.message 
    });
  }
};

// Quick verify for marked items from checker_sku_item
exports.quickVerifyMarkedItem = async (req, res) => {
  const { checker_sku_item_id, original_transaction_id } = req.body;
  const checker_user_id = req.headers['x-selected-user'] || req.body.counted_by || req.user?.user_id;
  
  if (!checker_sku_item_id) {
    return res.status(400).json({ 
      error: "checker_sku_item_id is required" 
    });
  }

  try {
    await pool.query('BEGIN');

    // 1. Get the checker_sku_item details
    const getCheckerSkuItemQuery = `
      SELECT * FROM checker_sku_item WHERE id = $1
    `;
    const checkerSkuResult = await pool.query(getCheckerSkuItemQuery, [checker_sku_item_id]);
    
    if (checkerSkuResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Checker SKU item not found' });
    }

    const checkerSkuItem = checkerSkuResult.rows[0];

    // Use transaction_id from checker_sku_item if original_transaction_id not provided
    const txIdToUse = original_transaction_id || checkerSkuItem.transaction_id;
    
    if (!txIdToUse) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Original transaction ID not found in checker_sku_item' });
    }

    // 2. Get the original counter transaction
    const getOriginalTxQuery = `
      SELECT * FROM transactions WHERE transaction_id = $1 AND role = 'Counter'
    `;
    const originalTxResult = await pool.query(getOriginalTxQuery, [txIdToUse]);
    
    if (originalTxResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Original counter transaction not found' });
    }

    const originalTransaction = originalTxResult.rows[0];
    const checkerCount = originalTransaction.qty; // checker_count = qty

    // 3. Update checker_sku_item: set verified=true, verified_at, checker_count
    const updateCheckerSkuQuery = `
      UPDATE checker_sku_item
      SET verified = true,
          verified_at = CURRENT_TIMESTAMP,
          checker_count = $1
      WHERE id = $2
      RETURNING *
    `;
      await pool.query(updateCheckerSkuQuery, [checkerCount, checker_sku_item_id]);

    // 4. Update recheck_items: mark as verified (if exists)
    // Find recheck_item by matching fields
    const updateRecheckQuery = `
      UPDATE recheck_items
      SET status = 'Completed',
          rechecked_by = $1,
          rechecked_at = CURRENT_TIMESTAMP
      WHERE location_id = $2
        AND form = $3
        AND grade = $4
        AND size = $5
        AND finish = $6
        AND ext_finish = COALESCE($7, ext_finish)
        AND width = COALESCE($8, width)
        AND length = COALESCE($9, length)
        AND status != 'Completed'
      RETURNING id
    `;
    await pool.query(updateRecheckQuery, [
      checker_user_id,
      checkerSkuItem.location_id,
      checkerSkuItem.form,
      checkerSkuItem.grade,
      checkerSkuItem.size,
      checkerSkuItem.finish,
      checkerSkuItem.ext_finish,
      checkerSkuItem.width,
      checkerSkuItem.length
    ]);

    // 5. Create new transaction with role='Checker'
    const createCheckerTxQuery = `
      INSERT INTO transactions (
        tag_id, form, grade, size, finish, ext_finish, width, length,
        count_type, qty, checker_count, location_id, section_id, team_id,
        counted_by, role, verified, mill, heat, type, remarks, location, sys_tag_no, page_number, serial_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *
    `;
    const newCheckerTx = await pool.query(createCheckerTxQuery, [
      originalTransaction.tag_id,
      originalTransaction.form,
      originalTransaction.grade,
      originalTransaction.size,
      originalTransaction.finish,
      originalTransaction.ext_finish,
      originalTransaction.width,
      originalTransaction.length,
      originalTransaction.count_type || 'piece',
      originalTransaction.qty,
      checkerCount, // checker_count = qty
      originalTransaction.location_id,
      originalTransaction.section_id,
      originalTransaction.team_id,
      checker_user_id,
      'Checker',
      true,
      originalTransaction.mill,
      originalTransaction.heat,
      originalTransaction.type,
      originalTransaction.remarks,
      originalTransaction.location,
      originalTransaction.sys_tag_no, // sys_tag_no must come from the original counter transaction
      originalTransaction.page_number || null,
      originalTransaction.serial_number || null
    ]);

    await syncCounterTransactionFromChecker({
      originalTransactionId: txIdToUse,
      tagId: originalTransaction.tag_id,
      form: originalTransaction.form,
      type: originalTransaction.type,
      grade: originalTransaction.grade,
      size: originalTransaction.size,
      width: originalTransaction.width,
      finish: originalTransaction.finish,
      ext_finish: originalTransaction.ext_finish,
      length: originalTransaction.length,
      count_type: originalTransaction.count_type || 'piece',
      qty: originalTransaction.qty,
      checker_count: checkerCount,
      location_id: originalTransaction.location_id,
      section_id: originalTransaction.section_id,
      location: originalTransaction.location,
      bundles: [],
      remarks: originalTransaction.remarks,
      mill: originalTransaction.mill,
      heat: originalTransaction.heat,
      ad_cmts: originalTransaction.ad_cmts,
      now: new Date().toISOString()
    });

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: 'Item quick verified successfully',
      data: {
        checker_sku_item: checkerSkuItem,
        new_checker_transaction: newCheckerTx.rows[0],
        original_transaction_id: txIdToUse
      }
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error quick verifying marked item:', error);
    res.status(500).json({ 
      error: 'Failed to quick verify item',
      details: error.message 
    });
  }
};

// Edit and verify marked item - similar to quick verify but with edited values
exports.editAndVerifyMarkedItem = async (req, res) => {
  const { 
    checker_sku_item_id, 
    original_transaction_id,
    // Edited values
    sys_tag_no,
    form,
    grade,
    size,
    finish,
    ext_finish,
    width,
    length,
    mill,
    heat,
    type,
    remarks,
    location,
    checker_count,
    bundles
  } = req.body;
  const checker_user_id = req.headers['x-selected-user'] || req.body.counted_by || req.user?.user_id;
  
  if (!checker_sku_item_id) {
    return res.status(400).json({ 
      error: "checker_sku_item_id is required" 
    });
  }

  try {
    await pool.query('BEGIN');

    // 1. Get the checker_sku_item details
    const getCheckerSkuItemQuery = `
      SELECT * FROM checker_sku_item WHERE id = $1
    `;
    const checkerSkuResult = await pool.query(getCheckerSkuItemQuery, [checker_sku_item_id]);
    
    if (checkerSkuResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Checker SKU item not found' });
    }

    const checkerSkuItem = checkerSkuResult.rows[0];

    // Use transaction_id from checker_sku_item if original_transaction_id not provided
    const txIdToUse = original_transaction_id || checkerSkuItem.transaction_id;
    
    if (!txIdToUse) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Original transaction ID not found in checker_sku_item' });
    }

    // 2. Get the original counter transaction
    const getOriginalTxQuery = `
      SELECT * FROM transactions WHERE transaction_id = $1 AND role = 'Counter'
    `;
    const originalTxResult = await pool.query(getOriginalTxQuery, [txIdToUse]);
    
    if (originalTxResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Original counter transaction not found' });
    }

    const originalTransaction = originalTxResult.rows[0];
    
    // Use edited checker_count if provided, otherwise use qty from original transaction
    const finalCheckerCount = checker_count !== undefined ? checker_count : originalTransaction.qty;

    // 3. Update checker_sku_item with edited values and set verified=true
    // Use edited values if provided, otherwise keep existing values
    const updateCheckerSkuQuery = `
      UPDATE checker_sku_item
      SET verified = true,
          verified_at = CURRENT_TIMESTAMP,
          checker_count = $1,
          form = COALESCE($2, form),
          grade = COALESCE($3, grade),
          size = COALESCE($4, size),
          finish = COALESCE($5, finish),
          ext_finish = COALESCE($6, ext_finish),
          width = COALESCE($7, width),
          length = COALESCE($8, length),
          mill = COALESCE($9, mill),
          heat = COALESCE($10, heat),
          type = COALESCE($11, type),
          location = COALESCE($12, location)
      WHERE id = $13
      RETURNING *
    `;
    await pool.query(updateCheckerSkuQuery, [
      finalCheckerCount,
      form || null,
      grade || null,
      size || null,
      finish || null,
      ext_finish || null,
      width !== undefined ? width : null,
      length !== undefined ? length : null,
      mill || null,
      heat || null,
      type || null,
      location || null,
      checker_sku_item_id
    ]);

    // 4. Update recheck_items: mark as verified (if exists)
    // Use edited values if provided, otherwise use values from checker_sku_item
    const updateRecheckQuery = `
      UPDATE recheck_items
      SET status = 'Completed',
          rechecked_by = $1,
          rechecked_at = CURRENT_TIMESTAMP
      WHERE location_id = $2
        AND form = $3
        AND grade = $4
        AND size = $5
        AND finish = $6
        AND ext_finish = COALESCE($7, ext_finish)
        AND width = $8
        AND length = $9
        AND status != 'Completed'
      RETURNING id
    `;
    await pool.query(updateRecheckQuery, [
      checker_user_id,
      checkerSkuItem.location_id,
      form || checkerSkuItem.form,
      grade || checkerSkuItem.grade,
      size || checkerSkuItem.size,
      finish || checkerSkuItem.finish,
      ext_finish || checkerSkuItem.ext_finish,
      width || checkerSkuItem.width,
      length || checkerSkuItem.length
    ]);

    // 5. Calculate total qty for bundle count type
    let totalQty = finalCheckerCount;
    if (bundles && Array.isArray(bundles) && bundles.length > 0) {
      totalQty = bundles.reduce((sum, bundle) => 
        sum + (bundle.num_of_bundle * bundle.bundle_count), 0
      );
    }

    // 6. Update existing Checker transaction for this tag_id if present,
    // otherwise create a new Checker transaction.
    const findExistingCheckerTxQuery = `
      SELECT transaction_id
      FROM transactions
      WHERE tag_id = $1
        AND role = 'Checker'
        AND location_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const existingCheckerTxResult = await pool.query(findExistingCheckerTxQuery, [
      originalTransaction.tag_id,
      originalTransaction.location_id
    ]);

    let checkerTxRow;
    if (existingCheckerTxResult.rows.length > 0) {
      const existingCheckerTxId = existingCheckerTxResult.rows[0].transaction_id;
      const updateCheckerTxQuery = `
        UPDATE transactions
        SET form = $1,
            grade = $2,
            size = $3,
            finish = $4,
            ext_finish = $5,
            width = $6,
            length = $7,
            count_type = $8,
            qty = $9,
            checker_count = $10,
            location_id = $11,
            section_id = $12,
            team_id = $13,
            counted_by = $14,
            verified = true,
            mill = $15,
            heat = $16,
            type = $17,
            remarks = $18,
            location = $19,
            sys_tag_no = $20,
            page_number = $21,
            serial_number = $22,
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $23
        RETURNING *
      `;
      const updatedCheckerTx = await pool.query(updateCheckerTxQuery, [
        form || originalTransaction.form,
        grade || originalTransaction.grade,
        size || originalTransaction.size,
        finish || originalTransaction.finish,
        ext_finish || originalTransaction.ext_finish,
        width || originalTransaction.width,
        length || originalTransaction.length,
        originalTransaction.count_type || 'piece',
        totalQty,
        finalCheckerCount,
        originalTransaction.location_id,
        originalTransaction.section_id,
        originalTransaction.team_id,
        checker_user_id,
        mill || originalTransaction.mill,
        heat || originalTransaction.heat,
        type || originalTransaction.type,
        remarks || originalTransaction.remarks,
        location || originalTransaction.location,
        sys_tag_no || originalTransaction.sys_tag_no,
        originalTransaction.page_number || null,
        originalTransaction.serial_number || null,
        existingCheckerTxId
      ]);
      checkerTxRow = updatedCheckerTx.rows[0];
    } else {
      const createCheckerTxQuery = `
        INSERT INTO transactions (
          tag_id, form, grade, size, finish, ext_finish, width, length,
          count_type, qty, checker_count, location_id, section_id, team_id,
          counted_by, role, verified, mill, heat, type, remarks, location, sys_tag_no, page_number, serial_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        RETURNING *
      `;
      const newCheckerTx = await pool.query(createCheckerTxQuery, [
        originalTransaction.tag_id,
        form || originalTransaction.form,
        grade || originalTransaction.grade,
        size || originalTransaction.size,
        finish || originalTransaction.finish,
        ext_finish || originalTransaction.ext_finish,
        width || originalTransaction.width,
        length || originalTransaction.length,
        originalTransaction.count_type || 'piece',
        totalQty,
        finalCheckerCount,
        originalTransaction.location_id,
        originalTransaction.section_id,
        originalTransaction.team_id,
        checker_user_id,
        'Checker',
        true,
        mill || originalTransaction.mill,
        heat || originalTransaction.heat,
        type || originalTransaction.type,
        remarks || originalTransaction.remarks,
        location || originalTransaction.location,
        sys_tag_no || originalTransaction.sys_tag_no,
        originalTransaction.page_number || null,
        originalTransaction.serial_number || null
      ]);
      checkerTxRow = newCheckerTx.rows[0];
    }

    // 7. Replace bundles for the checker transaction when editing.
    // This prevents duplicate bundle lines if the checker row already existed.
    await pool.query(
      'DELETE FROM bundles WHERE transaction_id = $1',
      [checkerTxRow.transaction_id]
    );
    if (bundles && Array.isArray(bundles) && bundles.length > 0) {
      const bundleInsertQuery = `
        INSERT INTO bundles (transaction_id, tag_id, num_of_bundle, bundle_count)
        VALUES ${bundles.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
      `;
      const bundleValues = bundles.flatMap((bundle) => [
        checkerTxRow.transaction_id,
        originalTransaction.tag_id,
        bundle.num_of_bundle,
        bundle.bundle_count
      ]);
      await pool.query(bundleInsertQuery, bundleValues);
    }

    await syncCounterTransactionFromChecker({
      originalTransactionId: txIdToUse,
      tagId: originalTransaction.tag_id,
      form: form || originalTransaction.form,
      type: type || originalTransaction.type,
      grade: grade || originalTransaction.grade,
      size: size || originalTransaction.size,
      width: width || originalTransaction.width,
      finish: finish || originalTransaction.finish,
      ext_finish: ext_finish || originalTransaction.ext_finish,
      length: length || originalTransaction.length,
      count_type: originalTransaction.count_type || 'piece',
      qty: totalQty,
      checker_count: finalCheckerCount,
      location_id: originalTransaction.location_id,
      section_id: originalTransaction.section_id,
      location: location || originalTransaction.location,
      bundles: bundles || [],
      remarks: remarks || originalTransaction.remarks,
      mill: mill || originalTransaction.mill,
      heat: heat || originalTransaction.heat,
      ad_cmts: originalTransaction.ad_cmts,
      now: new Date().toISOString()
    });

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: 'Item edited and verified successfully',
      data: {
        checker_sku_item: checkerSkuItem,
        new_checker_transaction: checkerTxRow,
        original_transaction_id: txIdToUse
      }
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error editing and verifying marked item:', error);
    res.status(500).json({ 
      error: 'Failed to edit and verify item',
      details: error.message 
    });
  }
};

// Unverify marked item - reverses the quick verify process
exports.unverifyMarkedItem = async (req, res) => {
  const { checker_sku_item_id, original_transaction_id } = req.body;
  const checker_user_id = req.headers['x-selected-user'] || req.body.counted_by || req.user?.user_id;
  
  if (!checker_sku_item_id) {
    return res.status(400).json({ 
      error: "checker_sku_item_id is required" 
    });
  }

  try {
    await pool.query('BEGIN');

    // 1. Get the checker_sku_item details
    const getCheckerSkuItemQuery = `
      SELECT * FROM checker_sku_item WHERE id = $1
    `;
    const checkerSkuResult = await pool.query(getCheckerSkuItemQuery, [checker_sku_item_id]);
    
    if (checkerSkuResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Checker SKU item not found' });
    }

    const checkerSkuItem = checkerSkuResult.rows[0];

    // Use transaction_id from checker_sku_item if original_transaction_id not provided
    const txIdToUse = original_transaction_id || checkerSkuItem.transaction_id;
    
    if (!txIdToUse) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Original transaction ID not found in checker_sku_item' });
    }

    // 2. Get the original counter transaction to find its tag_id
    const getOriginalTxQuery = `
      SELECT tag_id FROM transactions WHERE transaction_id = $1 AND role = 'Counter' LIMIT 1
    `;
    const originalTxResult = await pool.query(getOriginalTxQuery, [txIdToUse]);
    
    let deletedCheckerTxId = null;
    if (originalTxResult.rows.length > 0) {
      const tagId = originalTxResult.rows[0].tag_id;
      
      // Find and delete the checker transaction (role = 'Checker' with same tag_id)
      // If checker_user_id is provided, match it; otherwise delete the most recent one
      let getCheckerTxQuery = '';
      let checkerTxParams = [];
      
      if (checker_user_id) {
        getCheckerTxQuery = `
          SELECT transaction_id FROM transactions 
          WHERE tag_id = $1
            AND role = 'Checker'
            AND counted_by = $2
          ORDER BY created_at DESC
          LIMIT 1
        `;
        checkerTxParams = [tagId, checker_user_id];
      } else {
        getCheckerTxQuery = `
          SELECT transaction_id FROM transactions 
          WHERE tag_id = $1
            AND role = 'Checker'
          ORDER BY created_at DESC
          LIMIT 1
        `;
        checkerTxParams = [tagId];
      }
      
      const checkerTxResult = await pool.query(getCheckerTxQuery, checkerTxParams);
      
      if (checkerTxResult.rows.length > 0) {
        deletedCheckerTxId = checkerTxResult.rows[0].transaction_id;
        const deleteCheckerTxQuery = `DELETE FROM transactions WHERE transaction_id = $1`;
        await pool.query(deleteCheckerTxQuery, [deletedCheckerTxId]);
      }
    }

    // 3. Update checker_sku_item: set verified=false, verified_at=null, checker_count=null
    const updateCheckerSkuQuery = `
      UPDATE checker_sku_item
      SET verified = false,
          verified_at = NULL,
          checker_count = NULL
      WHERE id = $1
      RETURNING *
    `;
    await pool.query(updateCheckerSkuQuery, [checker_sku_item_id]);

    // 4. Update recheck_items: set status back to pending (or original status)
    const updateRecheckQuery = `
      UPDATE recheck_items
      SET status = 'Pending',
          rechecked_by = NULL,
          rechecked_at = NULL
      WHERE location_id = $1
        AND form = $2
        AND grade = $3
        AND size = $4
        AND finish = $5
        AND ext_finish = COALESCE($6, ext_finish)
        AND width = COALESCE($7, width)
        AND length = COALESCE($8, length)
        AND status = 'Completed'
      RETURNING id
    `;
    await pool.query(updateRecheckQuery, [
      checkerSkuItem.location_id,
      checkerSkuItem.form,
      checkerSkuItem.grade,
      checkerSkuItem.size,
      checkerSkuItem.finish,
      checkerSkuItem.ext_finish,
      checkerSkuItem.width,
      checkerSkuItem.length
    ]);

    // 5. Update original counter transaction to verified=false
    const updateOriginalTxQuery = `
      UPDATE transactions
      SET verified = false
      WHERE transaction_id = $1 AND role = 'Counter'
      RETURNING *
    `;
    await pool.query(updateOriginalTxQuery, [txIdToUse]);

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: 'Item unverified successfully',
      data: {
        checker_sku_item_id: checker_sku_item_id,
        deleted_checker_transaction_id: deletedCheckerTxId,
        original_transaction_id: txIdToUse
      }
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error unverifying marked item:', error);
    res.status(500).json({ 
      error: 'Failed to unverify item',
      details: error.message 
    });
  }
};

exports.unverifyTransactions = async (req, res) => {
  const { transaction_id, tag_id } = req.body;
  
  console.log('Unverify request received:', { transaction_id, tag_id, body: req.body });
  
  try {
    await pool.query('BEGIN');

    // Get transaction details before unverification
    const getTransactionQuery = `
      SELECT t.*, l.location_desc, s.section_desc, tm.team_name
      FROM transactions t
      JOIN st_locations l ON t.location_id = l.location_id
      JOIN st_sections s ON t.section_id = s.section_id
      JOIN teams tm ON t.team_id = tm.team_id
      WHERE t.transaction_id = $1
    `;
    
    const transactionResult = await pool.query(getTransactionQuery, [transaction_id]);
    
    if (transactionResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    // Get role and user from headers or body
    const role = req.headers['x-selected-role'] || req.body.role || 'Checker';
    const counted_by = req.headers['x-selected-user'] || req.body.unverified_by || req.body.counted_by;

    // When unverifying, we need to find and remove the checker transaction
    // that was created when this counter transaction was verified
    // The checker transaction will have the same tag_id but role = 'Checker'
    
    // Use the tag_id from the request body or from the transaction
    const tagIdToFind = req.body.tag_id || transaction.tag_id;
    
    // Find the checker transaction with the same tag_id
    const findCheckerTransactionQuery = `
      SELECT transaction_id FROM transactions 
      WHERE tag_id = $1 AND role = 'Checker'
      ORDER BY created_at DESC LIMIT 1
    `;
    
    console.log('Looking for checker transaction with tag_id:', tagIdToFind);
    const checkerTransactionResult = await pool.query(findCheckerTransactionQuery, [tagIdToFind]);
    console.log('Found checker transactions:', checkerTransactionResult.rows);
    
    let rows;
    let deletedCheckerTransactionId = null;
    
    if (checkerTransactionResult.rows.length > 0) {
      // Found a checker transaction to remove
      deletedCheckerTransactionId = checkerTransactionResult.rows[0].transaction_id;
      console.log('Deleting checker transaction ID:', deletedCheckerTransactionId);
      
      // Remove associated bundles first (due to foreign key constraint)
      const bundleDeleteResult = await pool.query('DELETE FROM bundles WHERE transaction_id = $1', [deletedCheckerTransactionId]);
      console.log('Deleted bundles count:', bundleDeleteResult.rowCount);
      
      // Remove associated checker activity logs (due to foreign key constraint)
      const activityLogDeleteResult = await pool.query('DELETE FROM checker_activity_logs WHERE transaction_id = $1', [deletedCheckerTransactionId]);
      console.log('Deleted activity logs count:', activityLogDeleteResult.rowCount);
      
      // Remove the checker transaction entirely
      const deleteQuery = `
        DELETE FROM transactions 
        WHERE transaction_id = $1
        RETURNING *`;
      
      const deleteResult = await pool.query(deleteQuery, [deletedCheckerTransactionId]);
      console.log('Deleted transaction result:', deleteResult.rows);
      rows = deleteResult.rows;
      
      // Also update the counter transaction to unverified
      console.log('Updating counter transaction to unverified, transaction_id:', transaction_id);
      const counterUpdateResult = await pool.query(`
        UPDATE transactions 
        SET verified = false
        WHERE transaction_id = $1
      `, [transaction_id]);
      console.log('Counter transaction update result:', counterUpdateResult.rowCount, 'rows affected');
    } else {
      // No checker transaction found, just unverify the counter transaction
      console.log('No checker transaction found, just unverifying counter transaction:', transaction_id);
      const updateQuery = `
        UPDATE transactions 
        SET 
          verified = false
        WHERE transaction_id = $1
        RETURNING *`;
      
      const updateResult = await pool.query(updateQuery, [transaction_id]);
      console.log('Counter transaction unverify result:', updateResult.rowCount, 'rows affected');
      rows = updateResult.rows;
    }
    
    // Note: Removed checker_activity_logs insertion as requested

    await pool.query('COMMIT');
    
    res.json({ 
      success: true,
      message: deletedCheckerTransactionId ? 'Checker transaction removed successfully' : 'Transaction unverified successfully',
      data: rows[0],
      deleted: !!deletedCheckerTransactionId,
      deletedCheckerTransactionId: deletedCheckerTransactionId
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error unverifying transaction:', error);
    res.status(500).json({ 
      error: 'Failed to unverify transaction',
      details: error.message 
    });
  }
};

exports.enableCheckerSKU = async (req, res) => {
  const { location_id } = req.params;
  const { items } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    await pool.query('BEGIN');

    // Insert into checker_sku_item table
    const insertQuery = `
      INSERT INTO checker_sku_item (
        location_id,
        form,
        grade,
        size,
        finish,
        ext_finish,
        width,
        length,
        mill,
        heat,
        system_qty,
        counted_qty,
        variance,
        status,
        verified
      ) VALUES ${items.map((_, i) => `(
        $${i * 15 + 1},
        $${i * 15 + 2},
        $${i * 15 + 3},
        $${i * 15 + 4},
        $${i * 15 + 5},
        $${i * 15 + 6},
        $${i * 15 + 7},
        $${i * 15 + 8},
        $${i * 15 + 9},
        $${i * 15 + 10},
        $${i * 15 + 11},
        $${i * 15 + 12},
        $${i * 15 + 13},
        $${i * 15 + 14},
        $${i * 15 + 15}
      )`).join(',')}
      RETURNING *
    `;

    const values = items.flatMap(item => [
      location_id,
      item.form,
      item.grade,
      item.size,
      item.finish,
      item.ext_finish || '',
      item.width || '',
      item.length || '',
      item.mill || '',
      item.heat || '',
      item.system_qty,
      item.counted_qty,
      item.variance,
      item.status,
      false // verified
    ]);

    const result = await pool.query(insertQuery, values);

    // Update location status
    const updateLocationQuery = `
      UPDATE assigned_locations
      SET status = 'Assigned Checker'
      WHERE location_id = $1
    `;
    await pool.query(updateLocationQuery, [location_id]);

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: 'Checker enabled successfully for selected items',
      data: result.rows
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error enabling checker for SKUs:', error);
    res.status(500).json({ error: 'Failed to enable checker' });
  }
};

exports.enableRecheckItems = async (req, res) => {
  const { location_id } = req.params;
  const { items, recheck_reason } = req.body;
  
  console.log('enableRecheckItems called with:', {
    location_id,
    itemsCount: items?.length,
    recheck_reason,
    items: items?.slice(0, 2) // Log first 2 items for debugging
  });
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  // Extract user_id from JWT token
  let currentUserId = null;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
      
      const decoded = jwt.verify(token, JWT_SECRET);
      currentUserId = decoded.userId;
      console.log('Extracted user ID from token:', currentUserId);
    }
  } catch (jwtError) {
    console.error('JWT verification failed:', jwtError);
    // Continue without user ID - we'll use null
  }

  try {
    await pool.query('BEGIN');

    const results = [];
    
    console.log('Processing', items.length, 'items for recheck. Current user ID:', currentUserId);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`Processing item ${i + 1}/${items.length}:`, {
        form: item.form,
        grade: item.grade,
        size: item.size,
        finish: item.finish
      });
      
      // Create a unique key for the item
      const itemKey = `${item.form}-${item.grade}-${item.size}-${item.finish}-${item.ext_finish}-${item.width}-${item.length}-${item.mill}-${item.heat}`;
      
      // Check if item already exists in recheck_items
      const existingItemQuery = `
        SELECT id, status FROM recheck_items 
        WHERE location_id = $1 
        AND form = $2 
        AND grade = $3 
        AND size = $4 
        AND finish = $5 
        AND ext_finish = $6 
        AND width = $7 
        AND length = $8 
        AND mill = $9 
        AND heat = $10
      `;
      
      const existingResult = await pool.query(existingItemQuery, [
        location_id,
        item.form,
        item.grade,
        item.size,
        item.finish,
        item.ext_finish || '',
        item.width || '',
        item.length || '',
        item.mill || '',
        item.heat || ''
      ]);

      console.log(`Item ${i + 1} existing check result:`, {
        found: existingResult.rows.length > 0,
        existingId: existingResult.rows[0]?.id
      });

      if (existingResult.rows.length > 0) {
        // Update existing item
        const existingItem = existingResult.rows[0];
        const updateQuery = `
          UPDATE recheck_items 
          SET 
            system_qty = $1,
            counted_qty = $2,
            variance = $3,
            status = 'Rechecking in Progress',
            recheck_reason = $4,
            marked_by = $5,
            marked_at = NOW(),
            original_transaction_ids = $6
          WHERE id = $7
          RETURNING *
        `;
        
        const updateResult = await pool.query(updateQuery, [
          item.system_qty,
          item.counted_qty,
          item.variance,
          recheck_reason || 'Marked for rechecking',
          currentUserId,
          JSON.stringify(item.original_transaction_ids || []),
          existingItem.id
        ]);
        
        console.log(`Item ${i + 1} updated successfully:`, updateResult.rows[0]?.id);
        
        results.push({
          action: 'updated',
          item: updateResult.rows[0]
        });
      } else {
        // Insert new item
        const insertQuery = `
          INSERT INTO recheck_items (
            location_id,
            form,
            grade,
            size,
            finish,
            ext_finish,
            width,
            length,
            mill,
            heat,
            system_qty,
            counted_qty,
            variance,
            status,
            recheck_reason,
            marked_by,
            original_transaction_ids
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *
        `;

        const insertResult = await pool.query(insertQuery, [
          location_id,
          item.form,
          item.grade,
          item.size,
          item.finish,
          item.ext_finish || '',
          item.width || '',
          item.length || '',
          item.mill || '',
          item.heat || '',
          item.system_qty,
          item.counted_qty,
          item.variance,
          'Rechecking in Progress',
          recheck_reason || 'Marked for rechecking',
          currentUserId,
          JSON.stringify(item.original_transaction_ids || [])
        ]);
        
        console.log(`Item ${i + 1} inserted successfully:`, insertResult.rows[0]?.id);
        
        results.push({
          action: 'inserted',
          item: insertResult.rows[0]
        });
      }
    }

    await pool.query('COMMIT');

    const updatedCount = results.filter(r => r.action === 'updated').length;
    const insertedCount = results.filter(r => r.action === 'inserted').length;

    console.log('Recheck operation completed:', {
      totalProcessed: results.length,
      updated: updatedCount,
      inserted: insertedCount
    });

    res.json({
      success: true,
      message: `Recheck enabled successfully: ${insertedCount} new items, ${updatedCount} updated items`,
      data: results
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error enabling recheck for items:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to enable recheck', details: error.message });
  }
};

exports.getRecheckItems = async (req, res) => {
  const { location_id } = req.params;
  
  if (!location_id) {
    return res.status(400).json({ error: 'Location ID is required' });
  }

  try {
    const query = `
      SELECT 
        id,
        location_id,
        form,
        grade,
        size,
        finish,
        ext_finish,
        width,
        length,
        mill,
        heat,
        system_qty,
        counted_qty,
        variance,
        status,
        recheck_reason,
        marked_by,
        marked_at,
        rechecked_by,
        rechecked_at,
        recheck_count,
        original_transaction_ids
      FROM recheck_items 
      WHERE location_id = $1 AND status != 'deleted'
      ORDER BY marked_at DESC
    `;
    
    const result = await pool.query(query, [location_id]);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching recheck items:', error);
    res.status(500).json({ error: 'Failed to fetch recheck items' });
  }
};

exports.updateRecheckItem = async (req, res) => {
  const { location_id } = req.params;
  const { 
    form, grade, size, finish, ext_finish, width, length, mill, heat,
    counted_qty, variance, remarks 
  } = req.body;
  
  console.log('Update recheck item request:', {
    location_id,
    form,
    grade,
    size,
    finish,
    ext_finish,
    width,
    length,
    mill,
    heat,
    counted_qty,
    variance,
    remarks
  });
  
  if (!location_id || !form) {
    console.log('Validation failed:', { location_id, form, grade, size, finish });
    return res.status(400).json({ error: 'Location ID and form are required' });
  }

  try {
    // Determine the new status based on variance
    let newStatus = 'Rechecking in Progress';
    if (variance === 0) {
      newStatus = 'Rechecked';
    } else if (variance > 0) {
      newStatus = 'Overcount';
    } else {
      newStatus = 'Undercount';
    }

    const query = `
      UPDATE recheck_items 
      SET 
        counted_qty = $1,
        variance = $2,
        status = $3,
        recheck_reason = COALESCE($4, recheck_reason),
        recheck_count = recheck_count + 1,
        rechecked_at = NOW()
      WHERE location_id = $5 
      AND form = $6 
      AND grade = $7 
      AND size = $8 
      AND finish = $9 
      AND ext_finish = $10 
      AND width = $11 
      AND length = $12 
      AND mill = $13 
      AND heat = $14
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      counted_qty,
      variance,
      newStatus,
      remarks,
      location_id,
      form,
      grade,
      size,
      finish,
      ext_finish || '',
      width || '',
      length || '',
      mill || '',
      heat || ''
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recheck item not found' });
    }
    
    res.json({
      success: true,
      message: 'Recheck item updated successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating recheck item:', error);
    res.status(500).json({ error: 'Failed to update recheck item' });
  }
};

exports.removeRecheckItems = async (req, res) => {
  const { location_id } = req.params;
  const { items } = req.body;
  
  console.log('removeRecheckItems called with:', {
    location_id,
    itemsCount: items?.length,
    items: items?.slice(0, 2) // Log first 2 items for debugging
  });
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    await pool.query('BEGIN');

    const results = [];
    
    console.log('Processing', items.length, 'items for removal from recheck.');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`Processing item ${i + 1}/${items.length} for removal:`, {
        form: item.form,
        grade: item.grade,
        size: item.size,
        finish: item.finish
      });
      
      // Delete item from recheck_items
      const deleteQuery = `
        DELETE FROM recheck_items 
        WHERE location_id = $1 
        AND form = $2 
        AND grade = $3 
        AND size = $4 
        AND finish = $5 
        AND ext_finish = $6 
        AND width = $7 
        AND length = $8 
        AND mill = $9 
        AND heat = $10
        RETURNING id
      `;
      
      const deleteResult = await pool.query(deleteQuery, [
        location_id,
        item.form,
        item.grade,
        item.size,
        item.finish,
        item.ext_finish || '',
        item.width || '',
        item.length || '',
        item.mill || '',
        item.heat || ''
      ]);
      
      if (deleteResult.rows.length > 0) {
        console.log(`Item ${i + 1} removed successfully:`, deleteResult.rows[0].id);
        results.push({
          action: 'removed',
          item_id: deleteResult.rows[0].id
        });
      } else {
        console.log(`Item ${i + 1} not found for removal`);
        results.push({
          action: 'not_found',
          item: { form: item.form, grade: item.grade, size: item.size }
        });
      }
    }

    await pool.query('COMMIT');

    const removedCount = results.filter(r => r.action === 'removed').length;
    const notFoundCount = results.filter(r => r.action === 'not_found').length;

    console.log('Remove recheck operation completed:', {
      totalProcessed: results.length,
      removed: removedCount,
      notFound: notFoundCount
    });

    res.json({
      success: true,
      message: `Removed ${removedCount} items from recheck status${notFoundCount > 0 ? `, ${notFoundCount} items not found` : ''}`,
      data: results
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error removing recheck items:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to remove recheck items', details: error.message });
  }
};

exports.verifyCheckerSKU = async (req, res) => {
  const { item_id, checker_count, verified } = req.body;
  
  if (!item_id || checker_count === undefined || verified === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const query = `
      UPDATE checker_sku_item
      SET checker_count = $1, verified = $2, verified_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [checker_count, verified, item_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({
      success: true,
      message: 'Item verified successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error verifying SKU item:', error);
    res.status(500).json({ error: 'Failed to verify item' });
  }
};

exports.updateCheckerStatus = async (req, res) => {
  const { location_id, section_id } = req.params;
  try {
    await pool.query('BEGIN');
    const updateQuery = `
      UPDATE assigned_locations 
      SET status = 'Completed'
      WHERE location_id = $1 
      AND sub_location_id = $2
      RETURNING *;
    `;
    const { rows } = await pool.query(updateQuery, [location_id, section_id]);
    if (rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'No matching assigned location found'
      });
    }
    await pool.query('COMMIT');
    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.assignCheckerToSection = async (req, res) => {
  const { location_id, section_id, user_id } = req.body;
  try {
    await pool.query('BEGIN');

    // 1. Get team_id for this section/location
    const teamResult = await pool.query(
      'SELECT team_id FROM assigned_locations WHERE location_id = $1 AND sub_location_id = $2',
      [location_id, section_id]
    );
    if (teamResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'No team assigned for this section/location' });
    }
    const team_id = teamResult.rows[0].team_id;

    // 2. Get role_id for checker
    const roleResult = await pool.query(
      "SELECT role_id FROM st_roles WHERE LOWER(role_desc) = 'checker'"
    );
    const role_id = roleResult.rows.length > 0 ? roleResult.rows[0].role_id : 6;

    // 3. Check if user already has the checker role in this team
    const existingCheckerResult = await pool.query(
      'SELECT role_id FROM team_members WHERE team_id = $1 AND user_id = $2 AND role_id = $3',
      [team_id, user_id, role_id]
    );

    if (existingCheckerResult.rows.length === 0) {
      // User doesn't have checker role yet, add it as an additional role
      await pool.query(
        'INSERT INTO team_members (team_id, user_id, role_id) VALUES ($1, $2, $3)',
        [team_id, user_id, role_id]
      );
    }
    // If user already has checker role, do nothing (preserve existing roles)

    // 4. Update assigned_locations status
    await pool.query(
      "UPDATE assigned_locations SET status = 'Assigned Checker' WHERE location_id = $1 AND sub_location_id = $2",
      [location_id, section_id]
    );

    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error assigning checker:', error);
    res.status(500).json({ error: 'Failed to assign checker' });
  }
};

// Helper function to log checker activities
const logCheckerActivity = async (pool, logData) => {
  const {
    location_id,
    section_id,
    team_id,
    checker_user_id,
    activity_type,
    transaction_id,
    tag_id,
    old_values,
    new_values,
    activity_description
  } = logData;

  const logQuery = `
    INSERT INTO checker_activity_logs (
      location_id, section_id, team_id, checker_user_id,
      activity_type, transaction_id, tag_id, old_values, new_values, activity_description
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING log_id
  `;

  const logValues = [
    location_id,
    section_id,
    team_id,
    checker_user_id,
    activity_type,
    transaction_id,
    tag_id,
    old_values ? JSON.stringify(old_values) : null,
    new_values ? JSON.stringify(new_values) : null,
    activity_description
  ];

  try {
    const result = await pool.query(logQuery, logValues);
    console.log(`Logged checker activity: ${activity_type} - ${activity_description}`);
    return result.rows[0].log_id;
  } catch (error) {
    console.error('Error logging checker activity:', error);
    // Don't throw error to avoid breaking the main transaction
    return null;
  }
};

exports.addLineItem = async (req, res) => {
  try {
    console.log('🔍 addLineItem called with body:', req.body);
    console.log('🔍 team_id:', req.body.team_id, 'type:', typeof req.body.team_id);
    
    await pool.query('BEGIN');

    // 1. FIRST get and lock the current tag
    const tagQuery = `
      SELECT current_tag 
      FROM teams 
      WHERE team_id = $1 
      FOR UPDATE`; // FOR UPDATE locks the row
    
    const tagResult = await pool.query(tagQuery, [req.body.team_id]);
    
    if (!tagResult.rows || tagResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }
    
    const currentTag = tagResult.rows[0].current_tag;

    // 2. Validate tag range
    const teamQuery = `SELECT tag_from, tag_to FROM teams WHERE team_id = $1`;
    const teamResult = await pool.query(teamQuery, [req.body.team_id]);
    
    if (!teamResult.rows || teamResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }
    
    const { tag_from, tag_to } = teamResult.rows[0];

    if (currentTag > tag_to) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: "Tag range exhausted, Please check with the Admin"
      });
    }

    // 3. Insert transaction
    const transactionQuery = `
      INSERT INTO transactions (
        tag_id, form, type, grade, size, finish, ext_finish, 
        width, length, remarks, count_type, qty,
        counted_by, team_id, location_id, section_id, mill, heat, ad_cmts, sys_tag_no, role, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING transaction_id
    `;
    
    const transactionResult = await pool.query(transactionQuery, [
      currentTag,
      req.body.form,
      req.body.type,
      req.body.grade,
      req.body.size,
      req.body.finish,
      req.body.ext_finish,
      req.body.width,
      req.body.length,
      req.body.remarks,
      req.body.count_type,
      req.body.qty,
      req.body.counted_by,
      req.body.team_id,
      req.body.location_id,
      req.body.section_id,
      req.body.mill,
      req.body.heat,
      req.body.ad_cmts,
      req.body.sys_tag_no,
      req.body.role,
      req.body.location
    ]);

    const transactionId = transactionResult.rows[0].transaction_id;
    console.log(transactionId);

    // 4. Update the tag pointer
    const newTag = currentTag + 1;
    await pool.query(`
      UPDATE teams 
      SET current_tag = $1 
      WHERE team_id = $2`, 
      [newTag, req.body.team_id]
    );

    // 5. Insert bundles if they exist
    let bundles = [];
    if (req.body.count_type === 'bundle' && req.body.bundles && req.body.bundles.length > 0) {
      const bundleQuery = `
        INSERT INTO bundles (
          transaction_id, tag_id, num_of_bundle, bundle_count
        ) VALUES ${req.body.bundles.map((_, i) => 
          `($${i*4 + 1}, $${i*4 + 2}, $${i*4 + 3}, $${i*4 + 4})`
        ).join(',')}
        RETURNING id, num_of_bundle, bundle_count
      `;
      
      const bundleValues = req.body.bundles.flatMap(bundle => [
        transactionId,
        currentTag,
        bundle.num_of_bundle,
        bundle.bundle_count
      ]);

      const bundleResult = await pool.query(bundleQuery, bundleValues);
      bundles = bundleResult.rows;
    }

    // Note: Removed checker_activity_logs insertion as requested

    await pool.query('COMMIT');

    // 7. Return success response with transaction ID
    res.status(201).json({
      success: true,
      id: transactionId,
      bundles,
      tag_id: currentTag
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating line item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create line item',
      error: error.message
    });
  }
};

exports.deleteTeam = async (req, res) => {
  const { team_id } = req.params;

  try {
    await pool.query('BEGIN');

    // Check if team exists
    const teamCheck = await pool.query(
      'SELECT team_id FROM teams WHERE team_id = $1',
      [team_id]
    );

    if (teamCheck.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if team has any transactions
    const transactionCheck = await pool.query(
      'SELECT COUNT(*) FROM transactions WHERE team_id = $1',
      [team_id]
    );

    if (parseInt(transactionCheck.rows[0].count) > 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot delete team: Team has existing transactions. Only teams without transactions can be deleted.'
      });
    }

    // Check if team has any assigned locations
    const assignedLocationsCheck = await pool.query(
      'SELECT COUNT(*) FROM assigned_locations WHERE team_id = $1',
      [team_id]
    );

    if (parseInt(assignedLocationsCheck.rows[0].count) > 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot delete team: Team has assigned locations. Please unassign all locations first.'
      });
    }

    // Delete team members first (due to foreign key constraint)
    await pool.query(
      'DELETE FROM team_members WHERE team_id = $1',
      [team_id]
    );

    // Delete the team
    await pool.query(
      'DELETE FROM teams WHERE team_id = $1',
      [team_id]
    );

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team',
      error: error.message
    });
  }
};

exports.unassignTeamFromSection = async (req, res) => {
  const { location_id, section_id } = req.params;
  
  try {
    await pool.query('BEGIN');

    // Check if assignment exists
    const assignmentCheck = await pool.query(
      'SELECT * FROM assigned_locations WHERE location_id = $1 AND sub_location_id = $2',
      [location_id, section_id]
    );

    if (assignmentCheck.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ 
        error: "No team assignment found for this section." 
      });
    }

    const assignment = assignmentCheck.rows[0];

    // Check if section has any transactions - prevent unassignment if transactions exist
    const transactionCheck = await pool.query(
      "SELECT COUNT(*) as count FROM transactions WHERE location_id = $1 AND section_id = $2", 
      [location_id, section_id]
    );

    console.log(`Transaction count for unassign - location ${location_id}, section ${section_id}:`, transactionCheck.rows[0].count);

    if (parseInt(transactionCheck.rows[0].count) > 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ 
        error: "Cannot unassign team. This section has transactions recorded. Teams cannot be unassigned after counting has started." 
      });
    }

    // Delete the assignment
    await pool.query(
      'DELETE FROM assigned_locations WHERE location_id = $1 AND sub_location_id = $2',
      [location_id, section_id]
    );

    await pool.query('COMMIT');

    res.status(200).json({ 
      success: true,
      message: "Team unassigned successfully from section." 
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error unassigning team from section:", error);
    res.status(500).json({ 
      error: "Server error while unassigning team from section.",
      details: error.message 
    });
  }
};

// Get adjustment data based on selected items
exports.getAdjustmentData = async (req, res) => {
  try {
    const { selectedItems, branch, warehouse } = req.body;
    
    if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Selected items are required" 
      });
    }

    if (!branch || !warehouse) {
      return res.status(400).json({ 
        success: false, 
        error: "Branch and warehouse are required" 
      });
    }

    console.log('Getting adjustment data for items:', selectedItems.length);
    console.log('Branch:', branch, 'Warehouse:', warehouse);
    console.log('First item data:', selectedItems[0]);
    
    // Build dynamic query based on selected items
    const conditions = selectedItems.map((item) => {
      // Trim all string values to remove extra spaces
      const trimmedForm = (item.form || '').toString().trim();
      const trimmedSize = (item.size || '').toString().trim();
      const trimmedGrade = (item.grade || '').toString().trim();
      const trimmedFinish = (item.finish || '').toString().trim();
      const trimmedExtFinish = (item.ext_finish || '').toString().trim();
      const trimmedBranch = (branch || '').toString().trim();
      const trimmedWarehouse = (warehouse || '').toString().trim();
      
      console.log('Trimmed values:', {
        form: `'${trimmedForm}'`,
        size: `'${trimmedSize}'`,
        grade: `'${trimmedGrade}'`,
        finish: `'${trimmedFinish}'`,
        extFinish: `'${trimmedExtFinish}'`,
        branch: `'${trimmedBranch}'`,
        warehouse: `'${trimmedWarehouse}'`
      });
      
      // Build conditions with trimmed values
      const itemConditions = [
        `TRIM(prd_frm) = '${trimmedForm}'`,
        `TRIM(prd_size) = '${trimmedSize}'`,
        `TRIM(prd_grd) = '${trimmedGrade}'`,
        `TRIM(prd_fnsh) = '${trimmedFinish}'`,
        `TRIM(prd_ef_svar) = '${trimmedExtFinish}'`,
        `prd_wdth = ${item.width || 0}`,
        `prd_lgth = ${item.length || 0}`,
        `TRIM(prd_brh) = '${trimmedBranch}'`,
        `TRIM(prd_whs) = '${trimmedWarehouse}'`
      ];
      
      return `(${itemConditions.join(' AND ')})`;
    });

    // Combine all conditions with OR
    const whereClause = conditions.join(' OR ');

    const query = `
      SELECT 
        prd_itm_ctl_no,
        prd_brh,
        prd_frm,
        prd_grd,
        prd_size,
        prd_fnsh,
        prd_ef_svar,
        prd_wdth,
        prd_lgth,
        prd_mill,
        prd_heat,
        prd_whs,
        prd_loc,
        prd_invt_typ,
        prd_invt_qlty,
        prd_invt_sts,
        prd_ohd_pcs,
        prd_ohd_wgt,
        prd_ohd_qty
      FROM intprd_rec 
      WHERE ${whereClause}
      ORDER BY prd_frm, 
        CASE 
          WHEN prd_size ~ '^[0-9]+\.?[0-9]*$' THEN CAST(prd_size AS NUMERIC)
          ELSE 999999999
        END ASC,
        prd_size ASC
    `;

    console.log('Adjustment query:', query);

    const response = { data: await runErpSql(query, { timeoutSeconds: 60 }) };

    console.log('ERP ODBC Response Data:', response.data);
    
    // Handle the OAuth API response structure - data is in response.data.Data (capital D)
    const responseData = response.data?.Data || response.data || [];
    console.log('Extracted Data:', responseData);
    console.log('Response Data Length:', responseData.length);

    if (responseData && responseData.length > 0) {
      res.json({
        success: true,
        data: responseData,
        count: responseData.length
      });
    } else {
      res.json({
        success: true,
        data: [],
        count: 0,
        message: "No adjustment data found"
      });
    }

  } catch (error) {
    console.error('Get adjustment data error:', error);
    console.error('Error details:', { message: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to get adjustment data",
      details: error.message,
    });
  }
};

exports.createBulkSections = async (req, res) => {
  try {
    const { location_id, sections } = req.body;
    console.log('Bulk creating sections:', { location_id, sections });
    
    if (!location_id || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ message: "Location ID and sections array are required" });
    }

    const createdSections = [];
    const skippedSections = [];
    
    // Use a transaction to ensure all sections are created or none
    await pool.query('BEGIN');
    
    try {
      for (const section_desc of sections) {
        if (!section_desc || typeof section_desc !== 'string') {
          throw new Error(`Invalid section description: ${section_desc}`);
        }
        
        // Check if section already exists
        const trimmedSectionDesc = section_desc.trim();
        console.log(`Checking if section "${trimmedSectionDesc}" exists for location ${location_id}...`);
        
        const existingSection = await pool.query(
          "SELECT section_id FROM st_sections WHERE location_id = $1 AND section_desc = $2",
          [location_id, trimmedSectionDesc]
        );
        
        if (existingSection.rows.length > 0) {
          console.log(`Section "${trimmedSectionDesc}" already exists (ID: ${existingSection.rows[0].section_id}), skipping...`);
          skippedSections.push(trimmedSectionDesc);
          continue;
        }
        
        console.log(`Section "${trimmedSectionDesc}" does not exist, creating...`);
        
        const newSubLocation = await pool.query(
          "INSERT INTO st_sections (location_id, section_desc) VALUES ($1, $2) RETURNING *",
          [location_id, section_desc]
        );
        
        createdSections.push(newSubLocation.rows[0]);
      }
      
      await pool.query('COMMIT');
      
      const response = {
        message: `${createdSections.length} sections created successfully`,
        sections: createdSections,
        created: createdSections.length,
        skipped: skippedSections.length,
        skippedSections: skippedSections
      };
      
      if (skippedSections.length > 0) {
        response.message += `, ${skippedSections.length} sections already existed`;
      }
      
      res.status(201).json(response);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating bulk sections:', error);
    res.status(500).json({ message: "Error creating sections", error: error.message });
  }
};

exports.updateTransactionTagId = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { tag_id } = req.body;
    
    if (!transactionId || !tag_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Transaction ID and tag_id are required' 
      });
    }
    
    const query = `
      UPDATE transactions 
      SET tag_id = $1 
      WHERE transaction_id = $2
    `;
    
    await pool.query(query, [tag_id, transactionId]);
    
    res.json({ 
      success: true, 
      message: 'Transaction tag_id updated successfully' 
    });
  } catch (error) {
    console.error('Error updating transaction tag_id:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update transaction tag_id', 
      error: error.message 
    });
  }
};