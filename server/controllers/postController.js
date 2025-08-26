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
    const { user_name, full_name, password } = req.body;

    console.log(user_name,full_name, password)
  
    if (!user_name || !full_name || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    try {
      // Encrypt password (use bcrypt)
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const userResult = await pool.query(
        `INSERT INTO st_users (user_name, full_name, password) 
         VALUES ($1, $2, $3) RETURNING user_id`,
        [user_name, full_name, hashedPassword]
      );
  
      res.json({ message: "User created successfully" });
    } catch (error) {
      console.error("Error creating user:", error);
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
      updateValues.push(user_name);
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
        user_name: user_name || currentUser.user_name,
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
      await pool.query(`DELETE FROM st_users WHERE user_id = $1`, [user_id]);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
};

exports.addLocation = async (req, res) => {
    try {
      const { location_desc, warehouse, branch } = req.body;
      if (!location_desc || !warehouse || !branch) {
        return res.status(400).json({ message: "Location description and warehouse are required" });
      }
  
      const newLocation = await createLocation(location_desc, warehouse, branch);
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

        // Prepare query for inserting items while avoiding duplicates
        const query = `
            INSERT INTO assigned_items (location_id, item_name) 
            SELECT $1, unnest($2::text[]) 
            WHERE NOT EXISTS (
                SELECT 1 FROM assigned_items WHERE location_id = $1 AND item_name = ANY($2::text[])
            );
        `;

        await pool.query(query, [location_id, trimmedItems]);

        return res.json({ success: true, message: "Items assigned successfully" });
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

exports.postTeams = async (req, res) => {
    const { teamName, tagRange, userRoles } = req.body;

    const current_tag = tagRange.from;
  
    try {
      // Insert into teams table
      const teamResult = await pool.query(
        "INSERT INTO teams (team_name, tag_from, tag_to, current_tag) VALUES ($1, $2, $3, $4) RETURNING team_id",
        [teamName, tagRange.from, tagRange.to, current_tag]
      );
      const teamId = teamResult.rows[0].team_id;
  
      // Insert team members into team_members table
      const insertPromises = userRoles.map(({ userId, roleId }) =>
        pool.query(
          "INSERT INTO team_members (team_id, user_id, role_id) VALUES ($1, $2, $3)",
          [teamId, userId, roleId]
        )
      );
  
      // await Promise.all(insertPromises);
  
      res.status(201).json({ message: "Team created successfully", teamId });
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ error: "Internal server error" });
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

        // Delete existing team members
        await pool.query(
            "DELETE FROM team_members WHERE team_id = $1",
            [team_id]
        );

        // Insert new team members
        if (members && members.length > 0) {
            const insertPromises = members.map(({ user_id, role_id }) =>
                pool.query(
                    "INSERT INTO team_members (team_id, user_id, role_id) VALUES ($1, $2, $3)",
                    [team_id, user_id, role_id]
                )
            );

            await Promise.all(insertPromises);
        }

        await pool.query('COMMIT');

        res.status(200).json({ 
            success: true, 
            message: "Team updated successfully" 
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
        width, length, remarks, count_type, qty,
        counted_by, team_id, location_id, section_id, mill, heat, ad_cmts, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
      req.body.role
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
        counted_by, team_id, location_id, section_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
      req.body.section_id
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
            remarks = $18
          WHERE transaction_id = $19
          RETURNING transaction_id
        `;
        
        const txValues = [
          form, type, grade, size, width, finish, ext_finish, length,
          count_type, totalQty, location_id, section_id, now,
          calculatedCheckerCount, mill, heat, ad_cmts, remarks, existingTxId
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

        // Log the transaction modification
        const selectedUser = req.headers['x-selected-user'] || req.body.counted_by;
        await logCheckerActivity(pool, {
          location_id: req.body.location_id,
          section_id: req.body.section_id,
          team_id: req.body.team_id,
          checker_user_id: selectedUser,
          activity_type: 'transaction_modified',
          transaction_id: existingTxId,
          tag_id: req.body.tag_id,
          old_values: {
            form: req.body.form,
            grade: req.body.grade,
            size: req.body.size,
            finish: req.body.finish,
            ext_finish: req.body.ext_finish,
            width: req.body.width,
            length: req.body.length,
            count_type: req.body.count_type,
            qty: req.body.qty,
            bundles: req.body.bundles || []
          },
          new_values: {
            form: req.body.form,
            grade: req.body.grade,
            size: req.body.size,
            finish: req.body.finish,
            ext_finish: req.body.ext_finish,
            width: req.body.width,
            length: req.body.length,
            count_type: req.body.count_type,
            qty: req.body.qty,
            bundles: req.body.bundles || []
          },
          activity_description: `Transaction modified: Tag ${req.body.tag_id}, ${req.body.form} ${req.body.grade} ${req.body.size}`
        });

        // Verify the original counter transaction
        const verifyCounterQuery = `
          UPDATE transactions SET 
            verified = true
          WHERE tag_id = $1 AND role = 'Counter'
        `;
        await pool.query(verifyCounterQuery, [tag_id]);

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
        team_id, updated_at, checker_count, mill, heat, ad_cmts, role, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
      req.body.team_id, now, calculatedCheckerCount, mill, heat, ad_cmts, role, remarks
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
    
    // Log the verification activity
    const selectedUser = req.headers['x-selected-user'] || req.body.verified_by;
    await logCheckerActivity(pool, {
      location_id: transaction.location_id,
      section_id: transaction.section_id,
      team_id: transaction.team_id,
      checker_user_id: selectedUser,
      activity_type: 'transaction_verified',
      transaction_id: transaction_id,
      tag_id: transaction.tag_id,
      old_values: { verified: false },
      new_values: { verified: true },
      activity_description: `Transaction verified: Tag ${transaction.tag_id}, ${transaction.form} ${transaction.grade} ${transaction.size}`
    });

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
    
    // Log the unverification activity
    const selectedUser = req.headers['x-selected-user'] || req.body.unverified_by;
    await logCheckerActivity(pool, {
      location_id: transaction.location_id,
      section_id: transaction.section_id,
      team_id: transaction.team_id,
      checker_user_id: selectedUser,
      activity_type: deletedCheckerTransactionId ? 'checker_transaction_removed' : 'transaction_unverified',
      transaction_id: deletedCheckerTransactionId || transaction_id,
      tag_id: tagIdToFind,
      old_values: { verified: true },
      new_values: { verified: false },
      activity_description: deletedCheckerTransactionId 
        ? `Checker transaction removed: Tag ${tagIdToFind}, ${transaction.form} ${transaction.grade} ${transaction.size}`
        : `Transaction unverified: Tag ${tagIdToFind}, ${transaction.form} ${transaction.grade} ${transaction.size}`
    });

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
        counted_by, team_id, location_id, section_id, mill, heat, ad_cmts, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
      req.body.role
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

    // 6. Log the new line item activity
    const selectedUser = req.headers['x-selected-user'] || req.body.counted_by;
    await logCheckerActivity(pool, {
      location_id: req.body.location_id,
      section_id: req.body.section_id,
      team_id: req.body.team_id,
      checker_user_id: selectedUser,
      activity_type: 'new_line_added',
      transaction_id: transactionId,
      tag_id: currentTag,
      old_values: null,
      new_values: {
        form: req.body.form,
        grade: req.body.grade,
        size: req.body.size,
        finish: req.body.finish,
        ext_finish: req.body.ext_finish,
        width: req.body.width,
        length: req.body.length,
        count_type: req.body.count_type,
        qty: req.body.qty,
        bundles: req.body.bundles || []
      },
      activity_description: `New line item added: Tag ${currentTag}, ${req.body.form} ${req.body.grade} ${req.body.size}`
    });

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