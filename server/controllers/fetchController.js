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
        SELECT u.user_id, u.user_name, u.full_name
        FROM st_users u
        ORDER BY u.user_id
      `);
      console.log('getUsers - Returning users:', result.rows);
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

exports.fetchLocationsById = async (req, res) => {
  const { location_id } = req.params;
  console.log('Fetching location by ID:', location_id);
  
  try {
    const result = await pool.query(
      'SELECT location_desc, warehouse, branch FROM st_locations WHERE location_id = $1',
      [location_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Location not found" });
    }
    
    console.log('Location data:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching location:", error);
    res.status(500).json({ message: "Error fetching location", error: error.message });
  }
};

// Similar fixes for the other two functions
exports.fetchSectionsById = async (req, res) => {
  const { section_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT section_desc FROM st_sections WHERE section_id = $1',
      [section_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Section not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching section:", error);
    res.status(500).json({ message: "Error fetching section", error: error.message });
  }
};

exports.fetchTeamsById = async (req, res) => {
  const { team_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT team_name FROM teams WHERE team_id = $1',
      [team_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ message: "Error fetching team", error: error.message });
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
    console.log('Fetching available forms for assign item to location');
    
    const sqlQuery = "SELECT DISTINCT prd_frm FROM intprd_rec WHERE prd_invt_sts = 'S' ORDER BY prd_frm";
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

    console.log('Items API Response:', response.data);
    
    // Transform the response to match the expected format
    const forms = response.data.Data || response.data.data || response.data || [];
    const transformedForms = forms.map((form) => ({
      prd_frm: form.prd_frm || form
    }));

    res.json({ 
      success: true, 
      Data: transformedForms
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

exports.fetchForm = async (req, res) => {
  try {
    const sqlQuery = "select distinct(prd_frm) from intprd_rec where prd_invt_sts = 'S' order by 1";
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

exports.fetchBrh = async (req, res) => {
  try {
    const sqlQuery = "select brh_brh from scrbrh_rec";
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

exports.fetchWhs = async (req, res) => {
  const { branch } = req.query;
  try {
    const sqlQuery = `SELECT whs_whs FROM scrwhs_rec WHERE whs_mng_brh = '${branch}'`;
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

exports.fetchLocationsByWarehouse = async (req, res) => {
  const { warehouse } = req.query;
  console.log('Fetching locations for warehouse:', warehouse);
  
  try {
    const sqlQuery = `SELECT DISTINCT(prd_loc) FROM intprd_rec WHERE prd_whs = '${warehouse}' ORDER BY prd_loc`;
    console.log('SQL Query:', sqlQuery);
    
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

    console.log('API Response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching locations by warehouse:", error);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
};

exports.AssignedItems = async (req, res) => {
  const { location_id } = req.params;
  console.log(location_id);
  try {
    const query = `
      SELECT id, item_name
      FROM assigned_items
      WHERE location_id = $1
    `;
    const { rows } = await pool.query(query, [location_id]);

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching assigned items:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.locationForms = async (req, res) => {
  const  { location_id }  = req.params;
  console.log(location_id);
  try {
    const query = `
      SELECT id, item_name
      FROM assigned_items
      WHERE location_id = $1
    `;
    const { rows } = await pool.query(query, [location_id]);

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching forms for location:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAssignedItemsTotalAmount = async (req, res) => {
  const { location_id } = req.params;
  console.log('Getting total amount for location:', location_id);
  
  try {
    // First, get the location details (branch and warehouse) from st_locations
    const locationQuery = `
      SELECT branch, warehouse
      FROM st_locations
      WHERE location_id = $1
    `;
    const locationResult = await pool.query(locationQuery, [location_id]);
    
    if (locationResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Location not found"
      });
    }
    
    const location = locationResult.rows[0];
    const { branch, warehouse } = location;
    console.log('Location details:', { branch, warehouse });
    
    // Get the assigned items (forms) for this location
    const assignedItemsQuery = `
      SELECT item_name
      FROM assigned_items
      WHERE location_id = $1
    `;
    const assignedItemsResult = await pool.query(assignedItemsQuery, [location_id]);
    
    if (assignedItemsResult.rows.length === 0) {
      return res.status(200).json({ 
        success: true, 
        data: [],
        message: "No assigned items found for this location",
        location: { branch, warehouse }
      });
    }
    
    // Extract the form names
    const forms = assignedItemsResult.rows.map(row => row.item_name);
    console.log('Assigned forms:', forms);
    
    // Create the IN clause for the SQL query
    const formsList = forms.map(form => `'${form}'`).join(',');
    
    // Updated query to include branch, warehouse, and status filters
    const sqlQuery = `
    SELECT 
      prd_frm,
      COUNT(prd_itm_ctl_no) as total_count,
      sum(prd_ohd_wgt) as total_weight,
      round(sum(case when (prd_ohd_mat_val) = 0 then (prd_ohd_qty*(acp_tot_mat_val/nullif(acp_tot_wgt,0))) else (prd_ohd_mat_val) end),2) as total_amount
      FROM intprd_rec 
      LEFT JOIN intacp_rec
      ON prd_cmpy_id = acp_cmpy_id
      AND prd_avg_cst_pool =  acp_avg_cst_pool
      WHERE prd_frm IN (${formsList})
      AND prd_brh = '${branch}'
      AND prd_whs = '${warehouse}'
      AND prd_invt_sts = 'S' 
      group by prd_frm
    `;
    // SELECT 
    //     prd_frm,
    //     COUNT(prd_ohd_mat_val) as total_count,
    //     SUM(CAST(prd_ohd_mat_val AS DECIMAL(15,2))) as total_amount
    //   FROM intprd_rec 
    //   WHERE prd_frm IN (${formsList})
    //     AND prd_brh = '${branch}'
    //     AND prd_whs = '${warehouse}'
    //     AND prd_invt_sts = 'S'
    //   GROUP BY prd_frm
    //   ORDER BY prd_frm
    
    console.log('SQL Query:', sqlQuery);
    
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    console.log('API Response:', response.data);
    
    return res.status(200).json({ 
      success: true, 
      data: response.data.Data || response.data || [],
      assignedForms: forms,
      location: { branch, warehouse }
    });
    
  } catch (error) {
    console.error("Error fetching assigned items total amount:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error while fetching total amount",
      error: error.message 
    });
  }
};

exports.getTotalFormValues = async (req, res) => {
  console.log('Getting total form values across all locations');
  
  try {
    // Get all unique forms from assigned_items table
    const assignedFormsQuery = `
      SELECT DISTINCT item_name
      FROM assigned_items
      ORDER BY item_name
    `;
    const assignedFormsResult = await pool.query(assignedFormsQuery);
    
    if (assignedFormsResult.rows.length === 0) {
      return res.status(200).json({});
    }
    
    const forms = assignedFormsResult.rows.map(row => row.item_name);
    console.log('All assigned forms:', forms);
    
    // Create the IN clause for the SQL query
    const formsList = forms.map(form => `'${form}'`).join(',');
    
    // Query to get total values for all forms across all locations
    const sqlQuery = `
    SELECT 
        prd_frm,
        COUNT(prd_itm_ctl_no) as total_count,
       round(case when sum(prd_ohd_mat_val) = 0 then sum(prd_ohd_qty*(acp_tot_mat_val/acp_tot_wgt)) else sum(prd_ohd_mat_val) end,2) as total_amount
      FROM intprd_rec 
      LEFT JOIN intacp_rec
      ON prd_cmpy_id = acp_cmpy_id
      AND prd_avg_cst_pool =  acp_avg_cst_pool
      WHERE prd_frm IN (${formsList})
        AND prd_invt_sts = 'S'
      GROUP BY prd_frm
      ORDER BY prd_frm  
    `;
    
    console.log('SQL Query for total form values:', sqlQuery);
    
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    console.log('Total form values API Response:', response.data);
    
    // Convert array to object with form names as keys
    const formValues = {};
    const data = response.data.Data || response.data || [];
    
    data.forEach(item => {
      formValues[item.prd_frm] = {
        total_count: parseInt(item.total_count || 0),
        total_amount: parseFloat(item.total_amount || 0)
      };
    });
    
    console.log('Processed form values:', formValues);
    
    return res.status(200).json(formValues);
    
  } catch (error) {
    console.error("Error fetching total form values:", error);
    return res.status(500).json({ 
      error: "Server error while fetching total form values",
      message: error.message 
    });
  }
};

exports.getOverallWeightAndAmount = async (req, res) => {
  const { branch, warehouse } = req.query;
  console.log('Getting overall weight and amount for branch:', branch, 'warehouse:', warehouse);
  
  if (!branch || !warehouse) {
    return res.status(400).json({ 
      success: false, 
      message: "Branch and warehouse parameters are required" 
    });
  }
  
  try {
    // Query to get overall weight and amount using the provided query with dynamic branch and warehouse
    const sqlQuery = `
      select sum(total_weight) as overall_weight, sum(total_amount) as overall_amount from (
        SELECT 
          COUNT(prd_itm_ctl_no) as total_count,
          sum(prd_ohd_wgt) as total_weight,
          round(sum(case when (prd_ohd_mat_val) = 0 then (prd_ohd_qty*(acp_tot_mat_val/nullif(acp_tot_wgt,0))) else (prd_ohd_mat_val) end),2) as total_amount
        FROM intprd_rec 
        LEFT JOIN intacp_rec
        ON prd_cmpy_id = acp_cmpy_id
        AND prd_avg_cst_pool = acp_avg_cst_pool
        WHERE prd_brh = '${branch}'
        AND prd_whs = '${warehouse}'
        AND prd_invt_sts = 'S' 
        group by prd_frm
      ) as tot
    `;
    
    console.log('SQL Query for overall weight and amount:', sqlQuery);
    
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    console.log('Overall weight and amount API Response:', response.data);
    
    if (response.data.Data && Array.isArray(response.data.Data) && response.data.Data.length > 0) {
      const result = response.data.Data[0];
      return res.status(200).json({ 
        success: true, 
        data: {
          overall_weight: result.overall_weight || 0,
          overall_amount: result.overall_amount || 0
        }
      });
    } else {
      return res.status(200).json({ 
        success: true, 
        data: {
          overall_weight: 0,
          overall_amount: 0
        }
      });
    }
    
  } catch (error) {
    console.error("Error fetching overall weight and amount:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error while fetching overall weight and amount",
      error: error.message 
    });
  }
};

exports.getInventoryAnalysis = async (req, res) => {
  try {
    const { warehouse } = req.query;
    
    // Query to get inventory analysis grouped by form with warehouse information
    // let sqlQuery2 = `
    //   SELECT 
    //     prd_frm,
    //     SUM(CAST(prd_ohd_mat_val AS DECIMAL(15,2))) as total_value,
    //     SUM(CAST(prd_ohd_qty AS INTEGER)) as total_pieces,
    //     COUNT(*) as record_count,
    //     STRING_AGG(DISTINCT prd_whs, ', ') as warehouses
    //   FROM intprd_rec 
    //   WHERE prd_invt_sts = 'S'
    // `;

    let sqlQuery = `
      SELECT
        prd_frm,
        sum(prd_ohd_wgt) as "Total Weight",
        round(sum(case when (prd_ohd_mat_val) = 0 then (prd_ohd_qty*(acp_tot_mat_val/nullif(acp_tot_wgt,0))) else (prd_ohd_mat_val) end),2) as "Cost Pool Total", STRING_AGG(DISTINCT prd_whs, ', ') as warehouses
        FROM intprd_rec prd
        LEFT JOIN intacp_rec ACP ON (prd_avg_cst_pool =  acp_avg_cst_pool )
        where prd_invt_sts = 'S'
        AND prd_ownr = 'O'
    `;

    // Add warehouse filter if provided
    if (warehouse && warehouse !== 'all') {
      // Handle multiple warehouses (comma-separated)
      const warehouses = warehouse.split(',').map(w => w.trim());
      if (warehouses.length === 1) {
        sqlQuery += ` AND prd_whs = '${warehouses[0]}'`;
      } else {
        const warehouseList = warehouses.map(w => `'${w}'`).join(', ');
        sqlQuery += ` AND prd_whs IN (${warehouseList})`;
      }
    }

    sqlQuery += `
      GROUP BY prd_frm
      ORDER BY prd_frm
    `;

    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    if (response.data.Data) {
      const data = response.data.Data;
      
      // Calculate totals for percentages
      const totalWeight = data.reduce((sum, item) => sum + parseFloat(item["Total Weight"] || 0), 0);
      const totalCostPool = data.reduce((sum, item) => sum + parseFloat(item["Cost Pool Total"] || 0), 0);
      
      // Calculate percentages and process warehouse data
      const processedData = data.map((item) => {
        // Convert warehouse string to array
        const warehouses = item.warehouses ? item.warehouses.split(', ').filter(w => w.trim()) : [];
        
        return {
          ...item,
          total_weight: parseFloat(item["Total Weight"] || 0),
          cost_pool_total: parseFloat(item["Cost Pool Total"] || 0),
          weight_percentage: totalWeight > 0 ? (parseFloat(item["Total Weight"] || 0) / totalWeight) * 100 : 0,
          cost_pool_percentage: totalCostPool > 0 ? (parseFloat(item["Cost Pool Total"] || 0) / totalCostPool) * 100 : 0,
          warehouses: warehouses
        };
      });

      res.json({
        success: true,
        data: processedData,
        summary: {
          totalWeight,
          totalCostPool,
          uniqueForms: new Set(data.map(item => item.prd_frm)).size,
          selectedWarehouse: warehouse || 'all'
        }
      });
    } else {
      res.json({
        success: true,
        data: [],
        summary: {
          totalWeight: 0,
          totalCostPool: 0,
          uniqueForms: 0,
          selectedWarehouse: warehouse || 'all'
        }
      });
    }
  } catch (error) {
    console.error("Error fetching inventory analysis:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch inventory analysis",
      message: error.message 
    });
  }
};

exports.testInventoryData = async (req, res) => {
  try {
    // Test 1: Raw data
    const rawQuery = `
      SELECT 
        prd_frm,
        prd_ohd_mat_val,
        prd_ohd_qty,
        prd_invt_sts
      FROM intprd_rec 
      WHERE prd_invt_sts = 'S'
      LIMIT 3
    `;

    const rawResponse = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: rawQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    // Test 2: Summed data
    const sumQuery = `
      SELECT 
        prd_frm,
        SUM(CAST(prd_ohd_mat_val AS DECIMAL(15,2))) as total_value,
        SUM(CAST(prd_ohd_qty AS INTEGER)) as total_pieces
      FROM intprd_rec 
      WHERE prd_invt_sts = 'S'
      GROUP BY prd_frm
      LIMIT 3
    `;

    const sumResponse = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sumQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    console.log('Raw data response:', JSON.stringify(rawResponse.data, null, 2));
    console.log('Summed data response:', JSON.stringify(sumResponse.data, null, 2));
    
    res.json({
      raw: rawResponse.data,
      summed: sumResponse.data
    });
  } catch (error) {
    console.error("Error testing inventory data:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to test inventory data",
      message: error.message 
    });
  }
};

exports.getInventoryDetails = async (req, res) => {
  try {
    const { form } = req.params;
    const { warehouse } = req.query;
    
    if (!form) {
      return res.status(400).json({ 
        success: false, 
        error: "Form parameter is required" 
      });
    }

    // First, get the total form data to calculate percentages
    const totalFormQuery = `
      SELECT 
        SUM(CAST(prd_ohd_mat_val AS DECIMAL(15,2))) as total_form_value,
        SUM(CAST(prd_ohd_qty AS INTEGER)) as total_form_pieces
      FROM intprd_rec 
      WHERE prd_invt_sts = 'S'
        AND prd_frm = '${form}'
    `;

    const totalFormResponse = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: totalFormQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    let totalFormPieces = 0;
    let totalFormValue = 0;

    if (totalFormResponse.data.Data && totalFormResponse.data.Data.length > 0) {
      totalFormPieces = parseInt(totalFormResponse.data.Data[0].total_form_pieces || 0);
      totalFormValue = parseFloat(totalFormResponse.data.Data[0].total_form_value || 0);
    }

    // Now get the detailed data (filtered by warehouse if specified)
    let sqlQuery = `
      SELECT 
        prd_frm,
        prd_whs,
        prd_invt_sts,
        prd_grd,
        SUM(CAST(prd_ohd_mat_val AS DECIMAL(15,2))) as total_value,
        SUM(CAST(prd_ohd_qty AS INTEGER)) as total_pieces,
        0 as pieces_percentage,
        0 as value_percentage
      FROM intprd_rec 
      WHERE prd_invt_sts = 'S'
        AND prd_frm = '${form}'
    `;

    // Add warehouse filter if provided
    if (warehouse) {
      sqlQuery += ` AND prd_whs = '${warehouse}'`;
    }

    sqlQuery += `
      GROUP BY prd_frm, prd_whs, prd_invt_sts, prd_grd
      ORDER BY prd_whs, prd_invt_sts, prd_grd
    `;

    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    if (response.data.Data) {
      const data = response.data.Data;
      
      // Calculate percentages based on total form data
      const processedData = data.map((item) => ({
        ...item,
        total_value: parseFloat(item.total_value || 0),
        total_pieces: parseInt(item.total_pieces || 0),
        pieces_percentage: totalFormPieces > 0 ? (parseInt(item.total_pieces || 0) / totalFormPieces) * 100 : 0,
        value_percentage: totalFormValue > 0 ? (parseFloat(item.total_value || 0) / totalFormValue) * 100 : 0
      }));

      // Calculate totals for the filtered data
      const filteredTotalPieces = data.reduce((sum, item) => sum + parseInt(item.total_pieces || 0), 0);
      const filteredTotalValue = data.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0);

      res.json({
        success: true,
        data: processedData,
        summary: {
          form,
          warehouse: warehouse || 'All warehouses',
          totalPieces: filteredTotalPieces,
          totalValue: filteredTotalValue,
          totalFormPieces,
          totalFormValue
        }
      });
    } else {
      res.json({
        success: true,
        data: [],
        summary: {
          form,
          warehouse: warehouse || 'All warehouses',
          totalPieces: 0,
          totalValue: 0,
          totalFormPieces,
          totalFormValue
        }
      });
    }
  } catch (error) {
    console.error("Error fetching inventory details:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch inventory details",
      message: error.message 
    });
  }
};

exports.getInventoryDetailsByTypeQuality = async (req, res) => {
  try {
    const { form } = req.params;
    const { warehouse } = req.query;
    
    if (!form) {
      return res.status(400).json({ 
        success: false, 
        error: "Form parameter is required" 
      });
    }

    // First, get the total form data to calculate percentages
    const totalFormQuery = `
      SELECT 
        SUM(CAST(prd_ohd_mat_val AS DECIMAL(15,2))) as total_form_value,
        SUM(CAST(prd_ohd_qty AS INTEGER)) as total_form_pieces
      FROM intprd_rec 
      WHERE prd_invt_sts = 'S'
        AND prd_frm = '${form}'
    `;

    const totalFormResponse = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: totalFormQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    let totalFormPieces = 0;
    let totalFormValue = 0;

    if (totalFormResponse.data.Data && totalFormResponse.data.Data.length > 0) {
      totalFormPieces = parseInt(totalFormResponse.data.Data[0].total_form_pieces || 0);
      totalFormValue = parseFloat(totalFormResponse.data.Data[0].total_form_value || 0);
    }

    // Now get the detailed data grouped by inventory type and quality only
    let sqlQuery = `
      SELECT 
        prd_frm,
        prd_invt_typ,
        prd_invt_qlty,
        SUM(CAST(prd_ohd_mat_val AS DECIMAL(15,2))) as total_value,
        SUM(CAST(prd_ohd_qty AS INTEGER)) as total_pieces,
        0 as pieces_percentage,
        0 as value_percentage
      FROM intprd_rec 
      WHERE prd_invt_sts = 'S'
        AND prd_frm = '${form}'
    `;

    // Add warehouse filter if provided
    if (warehouse) {
      sqlQuery += ` AND prd_whs = '${warehouse}'`;
    }

    sqlQuery += `
      GROUP BY prd_frm, prd_invt_typ, prd_invt_qlty
      ORDER BY prd_invt_typ, prd_invt_qlty
    `;

    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    if (response.data.Data) {
      const data = response.data.Data;
      
      // Get quality descriptions from inrinq_rec table
      const qualityQuery = `
        SELECT inq_invt_qlty, inq_desc15
        FROM inrinq_rec
        WHERE inq_invt_qlty IS NOT NULL
      `;

      const qualityResponse = await axios.post(
        process.env.OAUTH_API_URL,
        { sql: qualityQuery },
        {
          headers: {
            Authorization: `Bearer ${req.accessToken}`,
            "Content-Type": "application/json",
            Database: process.env.OAUTH_DATABASE,
          },
        }
      );

      // Create quality lookup map
      const qualityMap = new Map();
      if (qualityResponse.data.Data) {
        qualityResponse.data.Data.forEach(item => {
          qualityMap.set(item.inq_invt_qlty, item.inq_desc15);
        });
      }

      // Create inventory type lookup map
      const typeMap = new Map([
        ['D', 'Drop'],
        ['F', 'Finished'],
        ['M', 'Master'],
        ['R', 'Reject'],
        ['S', 'Scrap'],
        ['W', 'Work in Process']
      ]);

      // Calculate percentages based on total form data
      const processedData = data.map((item) => ({
        ...item,
        total_value: parseFloat(item.total_value || 0),
        total_pieces: parseInt(item.total_pieces || 0),
        pieces_percentage: totalFormPieces > 0 ? (parseInt(item.total_pieces || 0) / totalFormPieces) * 100 : 0,
        value_percentage: totalFormValue > 0 ? (parseFloat(item.total_value || 0) / totalFormValue) * 100 : 0,
        type_description: typeMap.get(item.prd_invt_typ) || item.prd_invt_typ,
        quality_description: qualityMap.get(item.prd_invt_qlty) || item.prd_invt_qlty
      }));

      // Calculate totals for the filtered data
      const filteredTotalPieces = data.reduce((sum, item) => sum + parseInt(item.total_pieces || 0), 0);
      const filteredTotalValue = data.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0);

      res.json({
        success: true,
        data: processedData,
        summary: {
          form,
          warehouse: warehouse || 'All warehouses',
          totalPieces: filteredTotalPieces,
          totalValue: filteredTotalValue,
          totalFormPieces,
          totalFormValue
        }
      });
    } else {
      res.json({
        success: true,
        data: [],
        summary: {
          form,
          warehouse: warehouse || 'All warehouses',
          totalPieces: 0,
          totalValue: 0,
          totalFormPieces,
          totalFormValue
        }
      });
    }
  } catch (error) {
    console.error("Error fetching inventory details by type and quality:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch inventory details by type and quality",
      message: error.message 
    });
  }
};

exports.gradeForms = async (req, res) => {
  const { form } = req.query;
  console.log("Form:", form); // Debugging

  if (!form) {
    return res.status(400).json({ error: "Form parameter is required" });
  }

  try {
    const sqlQuery = `SELECT distinct(prd_grd) FROM intprd_rec WHERE prd_frm = '${form}'`;
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

exports.sizeForms = async (req, res) => {
  const { form, grade } = req.query;
  console.log("Form:", form); // Debugging
  console.log("Grade:", grade);

  if (!form) {
    return res.status(400).json({ error: "Form parameter is required" });
  }

  try {
    const sqlQuery = `SELECT distinct(prd_size) FROM intprd_rec WHERE prd_frm = '${form}' and prd_grd = '${grade}'`;
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

exports.finishForms = async (req, res) => {
  const { form, grade, size } = req.query;
  console.log("Form:", form); // Debugging
  console.log("Grade:", grade);

  if (!form) {
    return res.status(400).json({ error: "Form parameter is required" });
  }

  try {
    const sqlQuery = `SELECT distinct(prd_fnsh) FROM intprd_rec WHERE prd_frm = '${form}' and prd_grd = '${grade}' and prd_size = '${size}'`;
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

exports.extfinishForms = async (req, res) => {
  const { form, grade, size, finish } = req.query;
  console.log("Form:", form); // Debugging
  console.log("Grade:", grade);

  if (!form) {
    return res.status(400).json({ error: "Form parameter is required" });
  }

  try {
    const sqlQuery = `SELECT distinct(prd_ef_svar) FROM intprd_rec WHERE prd_frm = '${form}' and prd_grd = '${grade}' and prd_size = '${size}' and prd_fnsh = '${finish}'`;
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

exports.widthForms = async (req, res) => {
  const { form, grade, size, finish, extfinish } = req.query;
  console.log("Form:", form); // Debugging
  console.log("Grade:", grade);

  if (!form) {
    return res.status(400).json({ error: "Form parameter is required" });
  }

  try {
    const sqlQuery = `SELECT distinct(prd_wdth) FROM intprd_rec WHERE prd_frm = '${form}' and prd_grd = '${grade}' and prd_size = '${size}' and prd_fnsh = '${finish}' and prd_ef_svar = '${extfinish}'`;
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

exports.lengthForms = async (req, res) => {
  const { form, grade, size, finish, extfinish, width } = req.query;
  console.log("Form:", form); // Debugging
  console.log("Grade:", grade);

  if (!form) {
    return res.status(400).json({ error: "Form parameter is required" });
  }

  try {
    const sqlQuery = `SELECT distinct(prd_lgth) FROM intprd_rec WHERE prd_frm = '${form}' and prd_grd = '${grade}' and prd_size = '${size}' and prd_fnsh = '${finish}' and prd_ef_svar = '${extfinish}' and prd_wdth = '${width}'`;
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

// exports.millForms = async (req, res) => {
//   const { form, grade, size, finish, extfinish, width, length } = req.query;
//   console.log("Form:", form); // Debugging
//   console.log("Grade:", grade);

//   if (!form) {
//     return res.status(400).json({ error: "Form parameter is required" });
//   }

//   try {
//     const sqlQuery = `SELECT distinct(prd_mill) FROM intprd_rec WHERE prd_frm = '${form}' and prd_grd = '${grade}' and prd_size = '${size}' and prd_fnsh = '${finish}' and prd_ef_svar = '${extfinish}' and prd_wdth = '${width}' and prd_lgth = '${length}'`;
//     const response = await axios.post(
//       process.env.OAUTH_API_URL,
//       { sql: sqlQuery },
//       {
//         headers: {
//           Authorization: `Bearer ${req.accessToken}`,
//           "Content-Type": "application/json",
//           Database: process.env.OAUTH_DATABASE,
//         },
//       }
//     );

//     res.json(response.data);
//   } catch (error) {
//     console.error("Error fetching items:", error);
//     res.status(500).json({ error: "Failed to fetch items" });
//   }
// };

exports.millForms = async (req, res) => {
  const { form, grade, size, finish, extfinish, width, length } = req.query;
  console.log("Form:", form); // Debugging
  console.log("Grade:", grade);

  if (!form) {
    return res.status(400).json({ error: "Form parameter is required" });
  }

  try {
    const sqlQuery = `SELECT distinct(prd_mill) FROM intprd_rec`;
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

exports.heatForms = async (req, res) => {
  const { form, grade, size, finish, extfinish, width, length, mill } = req.query;
  console.log("Form:", form); // Debugging
  console.log("Grade:", grade);

  if (!form) {
    return res.status(400).json({ error: "Form parameter is required" });
  }

  try {
    // Simple query to get all heat values since inhhet_rec only has het_heat
    const sqlQuery = `SELECT DISTINCT het_heat as prd_heat FROM inhhet_rec ORDER BY het_heat`;

    console.log("Heat Query:", sqlQuery);

    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching heat options:", error);
    res.status(500).json({ error: "Failed to fetch heat options" });
  }
};

// New endpoint for heat-first approach with warehouse-based mill lookup
exports.getMillByHeatAndWarehouse = async (req, res) => {
  const { heat, location_id } = req.query;
  console.log("Heat:", heat);
  console.log("Location ID:", location_id);

  if (!heat || !location_id) {
    return res.status(400).json({ error: "Heat and location_id parameters are required" });
  }

  try {
    // Query inhhet_rec for mill based on heat
    const sqlQuery = `
      SELECT het_mill 
      FROM inhhet_rec 
      WHERE het_heat = '${heat}'
    `;
    
    console.log("SQL Query:", sqlQuery);
    
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    console.log("API Response:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching mill by heat:", error);
    res.status(500).json({ error: "Failed to fetch mill" });
  }
};

// Check if user is already assigned as a checker
exports.checkExistingChecker = async (req, res) => {
  const { user_id, location_id, section_id } = req.query;
  
  if (!user_id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // Query to check if user is already assigned as a checker to the specific team for this section
    const query = `
      SELECT 
        u.full_name as userName,
        t.team_name as teamName,
        al.location_id,
        al.sub_location_id as section_id,
        al.status
      FROM team_members tm
      JOIN st_users u ON tm.user_id = u.user_id
      JOIN teams t ON tm.team_id = t.team_id
      JOIN st_roles r ON tm.role_id = r.role_id
      JOIN assigned_locations al ON t.team_id = al.team_id
      WHERE tm.user_id = $1 
        AND LOWER(r.role_desc) = 'checker'
        AND al.location_id = $2
        AND al.sub_location_id = $3
    `;
    
    const result = await pool.query(query, [user_id, location_id, section_id]);
    
    if (result.rows.length > 0) {
      // User is already assigned as a checker to this specific section
      res.json({
        isAssigned: true,
        userName: result.rows[0].username,
        teamName: result.rows[0].teamname,
        locationId: result.rows[0].location_id,
        sectionId: result.rows[0].section_id,
        status: result.rows[0].status
      });
    } else {
      // User is not assigned as a checker to this section
      res.json({
        isAssigned: false
      });
    }
  } catch (error) {
    console.error("Error checking existing checker:", error);
    res.status(500).json({ error: "Failed to check existing checker" });
  }
};

exports.remarksForms = async (req, res) => {

  try {
    const sqlQuery = `select inq_desc15 from inrinq_rec;`;
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

exports.fetchTeams = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.team_id, 
        t.team_name, 
        t.tag_from,
        t.tag_to,
        NULL AS created_by, 
        COALESCE(array_agg(tm.user_id), '{}') AS members
      FROM teams t
      LEFT JOIN team_members tm ON t.team_id = tm.team_id
      GROUP BY t.team_id, t.team_name, t.tag_from, t.tag_to;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching teams", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.AssignedTeam = async (req, res) => {
  const { location_id, section_id } = req.query;
  console.log('Location_id', location_id);
  console.log('Section_id', section_id);
  try {
    const result = await pool.query(`
      SELECT 
        t.team_id, 
        t.team_name, 
        t.tag_from,
        t.tag_to,
        NULL AS created_by, 
        COALESCE(array_agg(tm.user_id), '{}') AS members
      FROM teams t
      LEFT JOIN team_members tm ON t.team_id = tm.team_id
      GROUP BY t.team_id, t.team_name, t.tag_from, t.tag_to;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching teams", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

exports.counterAssigned = async (req, res) => {
  const userId = req.query.user_id; // Get user_id from query parameters

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  // SQL query to fetch locations for the user
  const query = `
    SELECT DISTINCT
    a.user_id,
    a.full_name,
    a.user_name,
    b.role_desc,
    c.team_id,
    c.team_name,
    e.location_id,
    f.location_desc,
    e.sub_location_id,
    g.section_desc,
    e.status
    FROM 
        st_users a
    INNER JOIN 
        team_members d ON a.user_id = d.user_id
    INNER JOIN 
        st_roles b ON b.role_id = d.role_id
    INNER JOIN 
        teams c ON d.team_id = c.team_id
    INNER JOIN 
        assigned_locations e ON e.team_id = c.team_id
    INNER JOIN 
        st_locations f ON e.location_id = f.location_id
    INNER JOIN 
        st_sections g ON e.sub_location_id = g.section_id
    WHERE 
        d.user_id = $1
    AND
        b.role_desc = 'Counter';
  `;
  try {
    // Query the database using the pool
    const result = await pool.query(query, [userId]);

    // Send the result as a JSON response
    res.json(result.rows); // Use result.rows for PostgreSQL query results
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ message: 'Failed to fetch data', error: err.message });
  }
};

exports.checkerAssigned = async (req, res) => {
  const userId = req.query.user_id; // Get user_id from query parameters

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  // SQL query to fetch locations for the user
  const query = `
    SELECT DISTINCT
    a.user_id,
    a.full_name,
    a.user_name,
    b.role_desc,
    c.team_id,
    c.team_name,
    e.location_id,
    f.location_desc,
    e.sub_location_id,
    g.section_desc,
    e.status
    FROM 
        st_users a
    INNER JOIN 
        team_members d ON a.user_id = d.user_id
    INNER JOIN 
        st_roles b ON b.role_id = d.role_id
    INNER JOIN 
        teams c ON d.team_id = c.team_id
    INNER JOIN 
        assigned_locations e ON e.team_id = c.team_id
    INNER JOIN 
        st_locations f ON e.location_id = f.location_id
    INNER JOIN 
        st_sections g ON e.sub_location_id = g.section_id
    WHERE 
        d.user_id = $1
    AND
        b.role_desc = 'Checker';
  `;
  try {
    // Query the database using the pool
    const result = await pool.query(query, [userId]);

    // Send the result as a JSON response
    res.json(result.rows); // Use result.rows for PostgreSQL query results
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ message: 'Failed to fetch data', error: err.message });
  }
};

exports.tagRange = async (req, res) => {
  try {
    const teamId = req.params.team_id;
    
    // 1. Get team's tag range and current_tag directly from teams table
    const teamQuery = `
      SELECT tag_from, tag_to, current_tag 
      FROM teams 
      WHERE team_id = $1
    `;
    const teamResult = await pool.query(teamQuery, [teamId]);

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Team not found' 
      });
    }

    const { tag_from, tag_to, current_tag } = teamResult.rows[0];
    
    // 2. Return the data directly (no need to calculate)
    res.json({
      success: true,
      tag_from: parseInt(tag_from),
      tag_to: parseInt(tag_to),
      current_tag: parseInt(current_tag) // Comes directly from teams table
    });

  } catch (error) {
    console.error('Error fetching team tag range:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.GetTransactionsByTeam = async (req, res) => {
  
  try {
    const teamId = req.query.team_id;
    const section_id = req.query.section_id;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    // Query to get transactions with optional bundle data
    const query = `
      SELECT 
        t.transaction_id as id,
        t.tag_id,
        t.form,
        t.type,
        t.grade,
        t.size,
        t.finish,
        t.ext_finish as extendedFinish,
        t.width,
        t.length,
        t.remarks,
        t.ad_cmts,
        t.count_type as "count_type",
        t.qty as qty,
        t.counted_by,
        t.team_id,
        t.location_id,
        t.section_id,
        t.mill,
        t.heat,
        t.created_at as counted_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', b.id,
              'num_of_bundle', b.num_of_bundle,
              'bundle_count', b.bundle_count,
              'tag_id', b.tag_id
            )
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'
        ) as bundles
      FROM transactions t
      LEFT JOIN bundles b ON t.transaction_id = b.transaction_id
      WHERE t.team_id = $1 and t.section_id = $2 and t.role = 'Counter'
      GROUP BY t.transaction_id
      ORDER BY t.created_at DESC
    `;

    const result = await pool.query(query, [teamId, section_id]);

    // Convert numeric fields from string to number
    const transactions = result.rows.map(row => ({
      ...row,
      tag_id: parseInt(row.tag_id),
      qty: parseInt(row.qty),
      team_id: parseInt(row.team_id),
      location_id: parseInt(row.location_id),
      section_id: parseInt(row.section_id),
      counted_by: parseInt(row.counted_by),
      bundles: row.bundles.map(b => ({
        ...b,
        num_of_bundle: parseInt(b.num_of_bundle),
        bundle_count: parseInt(b.bundle_count)
      }))
    }));

    res.json(transactions);

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.getTransactionWithBundles = async (req, res) => {
  
  try {
    const transactionId = req.params.id;

    // 1. Get the transaction
    const transactionQuery = `
      SELECT 
        t.transaction_id,
        t.tag_id,
        t.form,
        t.type,
        t.grade,
        t.size,
        t.finish,
        t.ext_finish as extendedFinish,
        t.width,
        t.length,
        t.remarks,
        t.count_type as "count_type",
        t.qty as qty,
        t.counted_by,
        t.team_id,
        t.location_id,
        t.section_id,
        t.created_at as counted_at
      FROM transactions t
      WHERE t.transaction_id = $1
    `;

    const transactionResult = await pool.query(transactionQuery, [transactionId]);

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = transactionResult.rows[0];

    // 2. Get bundles if countType is 'bundle'
    let bundles = [];
    if (transaction.countType === 'bundle') {
      const bundlesQuery = `
        SELECT 
          id,
          num_of_bundle,
          bundle_count
        FROM bundles
        WHERE transaction_id = $1
      `;
      const bundlesResult = await pool.query(bundlesQuery, [transactionId]);
      bundles = bundlesResult.rows;
    }

    // 3. Format the response
    const response = {
      ...transaction,
      bundles: bundles.map(b => ({
        id: b.id,
        numberOfBundles: parseInt(b.num_of_bundle),
        bundleCount: parseInt(b.bundle_count)
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: error.message
    });
  }
};

exports.getAssignedLocations = async (req, res) => {
  try {
    const { location_id } = req.query;
    
    let query = `
      SELECT 
        b.id,
        b.location_id,
        b.sub_location_id,
        b.assigned_at,
        b.competed_at,
        b.team_id,
        b.status,
        STRING_AGG(su.user_name, ', ') AS user_names,
        a.location_desc AS location_name,
        t.team_name,
        t.tag_from,
        t.tag_to,
        t.current_tag
      FROM 
        st_locations a
      JOIN 
        assigned_locations b ON a.location_id = b.location_id
      JOIN 
        teams t ON b.team_id = t.team_id
      LEFT JOIN 
        team_members tm ON t.team_id = tm.team_id
      LEFT JOIN 
        st_users su ON tm.user_id = su.user_id
    `;
    
    const queryParams = [];
    
    if (location_id) {
      query += ` WHERE b.location_id = $1`;
      queryParams.push(location_id);
    }
    
    query += `
      GROUP BY
        b.id,
        b.location_id,
        b.sub_location_id,
        b.assigned_at,
        b.competed_at,
        b.team_id,
        b.status,
        a.location_desc,
        t.team_name,
        t.tag_from,
        t.tag_to,
        t.current_tag
    `;
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assigned locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getLocationSummary = async (req, res) => {
  try {
    const query = `
      WITH location_sections AS (
        SELECT 
          l.location_id,
          l.location_desc,
          COUNT(DISTINCT s.section_id) as total_sections,
          COUNT(DISTINCT al.sub_location_id) as assigned_sections,
          COUNT(DISTINCT CASE WHEN al.status = 'Count Completed' THEN al.sub_location_id END) as count_completed,
          COUNT(DISTINCT CASE WHEN al.status = 'Completed' THEN al.sub_location_id END) as completed,
          COUNT(DISTINCT CASE WHEN al.status = 'Assigned Checker' THEN al.sub_location_id END) as assigned_checker,
          COUNT(DISTINCT CASE WHEN al.status = 'In Progress' THEN al.sub_location_id END) as in_progress,
          COUNT(DISTINCT CASE WHEN al.status IS NULL OR al.status = 'No Status' THEN al.sub_location_id END) as no_status,
          STRING_AGG(DISTINCT t.team_name, ', ') as team_names,
          STRING_AGG(DISTINCT su.user_name, ', ') as user_names,
          MIN(al.assigned_at) as assigned_at,
          MAX(al.competed_at) as competed_at
        FROM st_locations l
        LEFT JOIN st_sections s ON l.location_id = s.location_id
        LEFT JOIN assigned_locations al ON s.section_id = al.sub_location_id AND l.location_id = al.location_id
        LEFT JOIN teams t ON al.team_id = t.team_id
        LEFT JOIN team_members tm ON t.team_id = tm.team_id
        LEFT JOIN st_users su ON tm.user_id = su.user_id
        GROUP BY l.location_id, l.location_desc
      )
      SELECT 
        location_id,
        location_desc as location_name,
        total_sections,
        assigned_sections,
        count_completed,
        completed,
        assigned_checker,
        in_progress,
        no_status,
        team_names as team_name,
        user_names,
        assigned_at,
        competed_at,
        CASE 
          WHEN (count_completed = total_sections OR completed = total_sections OR assigned_checker = total_sections) 
            AND total_sections > 0 THEN 'Count Completed'
          ELSE 'In Progress'
        END as overall_status
      FROM location_sections
      WHERE total_sections > 0
      ORDER BY location_id
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching location summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSectionsByLocation = async (req, res) => {
  const { location_id } = req.query;

  console.log('=== getSectionsByLocation called ===');
  console.log('Request URL:', req.url);
  console.log('Request query:', req.query);
  console.log('Request params:', req.params);
  console.log('Location ID:', location_id);

  if (!location_id) {
    console.log('No location_id provided');
    return res.status(400).json({ error: 'Location ID is required' });
  }

  try {
    const query = `
      SELECT 
        ss.section_id, 
        ss.section_desc, 
        sl.warehouse, 
        sl.branch, 
        sl.location_desc,
        ss.created_at,
        al.status,
        t.team_name,
        al.team_id,
        al.assigned_at,
        al.competed_at,
        t.tag_from,
        t.tag_to,
        t.current_tag
      FROM 
        st_sections ss
      JOIN 
        st_locations sl ON ss.location_id = sl.location_id
      LEFT JOIN 
        assigned_locations al ON ss.section_id = al.sub_location_id AND al.location_id = ss.location_id
      LEFT JOIN
        teams t ON t.team_id = al.team_id
      WHERE 
        ss.location_id = $1
      ORDER BY ss.section_id
    `;

    const { rows } = await pool.query(query, [location_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No sections found for this location' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSectionByLocation = async (req, res) => {
  const { location_id } = req.query;

  console.log('Location ID:', location_id);

  if (!location_id) {
    return res.status(400).json({ error: 'Location ID is required' });
  }

  try {
    const query = `
      SELECT 
        ss.section_id, 
        ss.section_desc, 
        sl.warehouse, 
        sl.branch, 
        sl.location_desc
      FROM 
        st_sections ss
      JOIN 
        st_locations sl ON ss.location_id = sl.location_id
      WHERE 
        ss.location_id = $1
    `;

    const { rows } = await pool.query(query, [location_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No sections found for this location' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getTransactionsByLocationAndSection = async (req, res) => {
  const { location_id, section_id, usr_role } = req.query;
  console.log('Review transactions request:', { location_id, section_id, usr_role, usr_role_type: typeof usr_role });

  if (!location_id || !section_id) {
    return res.status(400).json({ 
      error: 'Both location_id and section_id are required' 
    });
  }

  try {
    // First, let's check what transactions exist for this location/section
    const debugQuery = `
      SELECT t.role, COUNT(*) as count
      FROM transactions t
      JOIN st_sections ss ON t.section_id = ss.section_id
      JOIN st_locations sl ON t.location_id = sl.location_id
      WHERE sl.location_id = $1 AND ss.section_id = $2
      GROUP BY t.role
    `;
    const debugResult = await pool.query(debugQuery, [location_id, section_id]);
    console.log('Debug - Available transactions by role:', debugResult.rows);

    if (usr_role === 'checker'){
      const query = `
      SELECT 
      t.tag_id,
      t.form,
      t.type,
      t.grade,
      t.size,
      t.finish,
      t.ext_finish,
      t.width,
      t.length,
      t.mill,
      t.heat,
      t.remarks,
      t.qty,
      t.checker_count,
      t.count_type,
      t.role,
      su.full_name AS counted_by,
      t.created_at,
      t2.team_name,
      COALESCE(
          json_agg(
              json_build_object(
                  'num_of_bundle', b.num_of_bundle,
                  'bundle_count', b.bundle_count,
                  'created_at', b.created_at
              )
          ) FILTER (WHERE b.transaction_id IS NOT NULL), '[]'
      ) AS bundles
  FROM transactions t
  JOIN st_sections ss ON t.section_id = ss.section_id
  JOIN st_locations sl ON t.location_id = sl.location_id
  JOIN st_users su ON t.counted_by = su.user_id
  JOIN teams t2 ON t.team_id = t2.team_id
  LEFT JOIN bundles b ON t.transaction_id = b.transaction_id
  WHERE sl.location_id = $1 
  AND ss.section_id = $2
  AND t.role = 'Checker'
  GROUP BY 
      t.tag_id, t.form, t.type, t.grade, t.size, t.finish, t.ext_finish, 
      t.width, t.length, t.mill, t.heat, t.remarks, t.qty, t.checker_count, t.count_type, t.role,
      su.full_name, t.created_at, t2.team_name
  ORDER BY t.created_at DESC;
    `;

    const { rows } = await pool.query(query, [location_id, section_id]);
    
    console.log('Checker query result count:', rows.length);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        message: 'No transactions found for this location and section' 
      });
    }

    res.json(rows);
    }
    else{
      console.log('Executing counter query for usr_role:', usr_role);
      
      // Let's first check what the raw counter transactions look like
      const rawCounterQuery = `
        SELECT t.*, ss.section_id as ss_section_id, sl.location_id as sl_location_id
        FROM transactions t
        JOIN st_sections ss ON t.section_id = ss.section_id
        JOIN st_locations sl ON t.location_id = sl.location_id
        WHERE sl.location_id = $1 
        AND ss.section_id = $2
        AND t.role = 'Counter'
      `;
      const rawResult = await pool.query(rawCounterQuery, [location_id, section_id]);
      console.log('Raw counter transactions:', rawResult.rows.length, 'rows');
      if (rawResult.rows.length > 0) {
        console.log('Sample raw counter transaction:', rawResult.rows[0]);
        
        // Check for missing user or team references
        const missingRefsQuery = `
          SELECT 
            t.transaction_id,
            t.counted_by,
            t.team_id,
            CASE WHEN su.user_id IS NULL THEN 'MISSING USER' ELSE 'USER EXISTS' END as user_status,
            CASE WHEN t2.team_id IS NULL THEN 'MISSING TEAM' ELSE 'TEAM EXISTS' END as team_status
          FROM transactions t
          JOIN st_sections ss ON t.section_id = ss.section_id
          JOIN st_locations sl ON t.location_id = sl.location_id
          LEFT JOIN st_users su ON t.counted_by = su.user_id
          LEFT JOIN teams t2 ON t.team_id = t2.team_id
          WHERE sl.location_id = $1 
          AND ss.section_id = $2
          AND t.role = 'Counter'
        `;
        const missingRefsResult = await pool.query(missingRefsQuery, [location_id, section_id]);
        console.log('Missing references check:', missingRefsResult.rows);
      }
      
      const query = `
      SELECT 
      t.tag_id,
      t.form,
      t.type,
      t.grade,
      t.size,
      t.finish,
      t.ext_finish,
      t.width,
      t.length,
      t.mill,
      t.heat,
      t.remarks,
      t.qty,
      t.checker_count,
      t.count_type,
      t.role,
      su.full_name AS counted_by,
      t.created_at,
      t2.team_name,
      COALESCE(
          json_agg(
              json_build_object(
                  'num_of_bundle', b.num_of_bundle,
                  'bundle_count', b.bundle_count,
                  'created_at', b.created_at
              )
          ) FILTER (WHERE b.transaction_id IS NOT NULL), '[]'
      ) AS bundles
  FROM transactions t
  JOIN st_sections ss ON t.section_id = ss.section_id
  JOIN st_locations sl ON t.location_id = sl.location_id
  JOIN st_users su ON t.counted_by = su.user_id
  JOIN teams t2 ON t.team_id = t2.team_id
  LEFT JOIN bundles b ON t.transaction_id = b.transaction_id
  WHERE sl.location_id = $1 
  AND ss.section_id = $2
  AND t.role = 'Counter'
  GROUP BY 
      t.tag_id, t.form, t.type, t.grade, t.size, t.finish, t.ext_finish, 
      t.width, t.length, t.mill, t.heat, t.remarks, t.qty, t.checker_count, t.count_type, t.role,
      su.full_name, t.created_at, t2.team_name
  ORDER BY t.created_at DESC;
    `;

    console.log('Executing full counter query with parameters:', [location_id, section_id]);
    const { rows } = await pool.query(query, [location_id, section_id]);
    
    console.log('Counter query result count:', rows.length);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        message: 'No transactions found for this location and section' 
      });
    }

    res.json(rows);
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getTeamWithMembers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        tm.id as member_id,
        tm.user_id,
        u.full_name,
        tm.role_id,
        r.role_desc
      FROM teams t
      LEFT JOIN team_members tm ON t.team_id = tm.team_id
      LEFT JOIN st_users u ON tm.user_id = u.user_id
      LEFT JOIN st_roles r ON tm.role_id = r.role_id
      ORDER BY t.team_id, tm.id
    `);

    // Transform the flat result into nested team objects
    const teamsMap = new Map();
    
    result.rows.forEach(row => {
      if (!teamsMap.has(row.team_id)) {
        teamsMap.set(row.team_id, {
          team_id: row.team_id,
          team_name: row.team_name,
          tag_from: row.tag_from,
          tag_to: row.tag_to,
          current_tag: row.current_tag,
          created_by: row.created_by,
          time_created: row.time_created,
          members: []
        });
      }
      
      if (row.user_id) { // Only add if there's a member
        teamsMap.get(row.team_id).members.push({
          id: row.member_id,
          user_id: row.user_id,
          full_name: row.full_name,
          role_id: row.role_id,
          role_desc: row.role_desc
        });
      }
    });

    res.json([...teamsMap.values()]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.TransactionForChecker = async (req, res) =>{
  const { location_id, section_id, team_id } = req.query;
  
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        l.location_desc,
        s.section_desc
      FROM transactions t
      LEFT JOIN st_locations l ON t.location_id = l.location_id
      LEFT JOIN st_sections s ON t.section_id = s.section_id
      WHERE t.location_id = $1 AND t.section_id = $2 AND t.team_id = $3 AND t.role = 'Counter'
      ORDER BY t.tag_id ASC
    `, [location_id, section_id, team_id]);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.BundlesForChecker = async (req, res) =>{
  const { transaction_ids } = req.query;
  
  if (!transaction_ids) {
    return res.json([]);
  }
  
  try {
    const result = await pool.query(`
      SELECT * FROM bundles 
      WHERE transaction_id IN (${transaction_ids})
      ORDER BY transaction_id, num_of_bundle
    `);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sectionCount = async (req, res) =>{
  const { location_id } = req.params;
  console.log(location_id);
  if (!location_id) {
    return res.json([]);
  }
  
  try {
    const result = await pool.query('SELECT count(*) FROM st_sections WHERE location_id = $1', [location_id]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.itemCount = async (req, res) =>{
  const { location_id } = req.params;
  console.log(location_id);
  if (!location_id) {
    return res.json([]);
  }
  
  try {
    const result = await pool.query(
      'SELECT count(*) FROM assigned_items WHERE location_id = $1', 
      [location_id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.checkerUpdates = async (req, res) =>{
  try {
    const { location_id, section_id, updates } = req.body;

    // Validate and process updates
    const processedUpdates = updates.map(update => ({
      ...update,
      status: 'checker-approved',
      submitted_at: new Date().toISOString()
    }));

    // Save to database (implementation depends on your DB)
    await saveCheckerUpdates(processedUpdates);

    res.json({ success: true, count: processedUpdates.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

exports.TransactionForCheck = async (req, res) =>{
  const { location_id, section_id, team_id } = req.query;
  
  console.log('TransactionForCheck called with:', { location_id, section_id, team_id });
  
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        l.location_desc,
        s.section_desc
      FROM transactions t
      LEFT JOIN st_locations l ON t.location_id = l.location_id
      LEFT JOIN st_sections s ON t.section_id = s.section_id
      WHERE t.location_id = $1 AND t.section_id = $2 AND t.team_id = $3 AND t.role = 'Checker'
      ORDER BY t.created_at DESC
    `, [location_id, section_id, team_id]);
    
    console.log('TransactionForCheck found transactions:', result.rows.length);
    console.log('Transaction IDs:', result.rows.map(r => r.transaction_id));
    
    res.json(result.rows);
  } catch (err) {
    console.error('TransactionForCheck error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getInventoryReconciliation = async (req, res) => {
  const { location_id } = req.params;
  const { branch } = req.query;

  if (!location_id || !branch) {
    return res.status(400).json({ error: "Location ID and branch are required" });
  }

  try {
    // 1. Get system inventory from intprd_rec
    const systemInventoryQuery = `
      SELECT 
        prd_frm as form,
        prd_grd as grade,
        prd_size as size,
        prd_fnsh as finish,
        prd_ef_svar as ext_finish,
        prd_wdth as width,
        prd_lgth as length,
        prd_ohd_wgt as weight,
        prd_brh as branch,
        prd_whs as warehouse,
        prd_invt_typ as inv_type,
        prd_invt_qlty as inv_quality,
        prd_ohd_pcs as system_qty,
        prd_ohd_mat_val as prd_ohd_mat_val,
        prd_ohd_mat_cst as prd_ohd_mat_cst
      FROM intprd_rec 
      WHERE prd_brh = '${branch}' AND prd_whs = '${warehouse}' AND prd_invt_sts = 'S'
    `;

    const systemInventoryResponse = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: systemInventoryQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE
        }
      }
    );

    console.log('System Inventory API Response:', JSON.stringify(systemInventoryResponse.data, null, 2));

    // Handle different API response structures
    let systemInventory = [];
    if (systemInventoryResponse.data) {
      if (Array.isArray(systemInventoryResponse.data)) {
        systemInventory = systemInventoryResponse.data;
      } else if (systemInventoryResponse.data.Data && Array.isArray(systemInventoryResponse.data.Data)) {
        systemInventory = systemInventoryResponse.data.Data;
      } else if (systemInventoryResponse.data.data && Array.isArray(systemInventoryResponse.data.data)) {
        systemInventory = systemInventoryResponse.data.data;
      } else {
        console.error('Unexpected system inventory response structure:', systemInventoryResponse.data);
        return res.status(500).json({ 
          error: 'Invalid system inventory response structure',
          details: 'The API response does not contain an array of inventory items'
        });
      }
    }

    console.log('Processed system inventory count:', systemInventory.length);
    console.log('Sample system inventory item:', systemInventory[0]);

    // 2. Get counted inventory from transactions
    const countedInventoryQuery = `
      SELECT 
        t.form,
        t.grade,
        t.size,
        t.finish,
        t.ext_finish,
        t.width,
        t.length,
        t.mill,
        t.heat,
        t.count_type,
        CASE 
          WHEN t.count_type = 'bundle' THEN 
            COALESCE(SUM(b.num_of_bundle * b.bundle_count), 0)
          ELSE 
            SUM(t.qty)
        END as total_qty,
        COUNT(DISTINCT t.transaction_id) as transaction_count,
        STRING_AGG(DISTINCT t2.team_name, ', ') as teams,
        STRING_AGG(DISTINCT su.full_name, ', ') as counters
      FROM transactions t
      JOIN st_sections ss ON t.section_id = ss.section_id
      JOIN st_locations sl ON t.location_id = sl.location_id
      JOIN st_users su ON t.counted_by = su.user_id
      JOIN teams t2 ON t.team_id = t2.team_id
      LEFT JOIN bundles b ON t.transaction_id = b.transaction_id
      WHERE sl.location_id = $1 
      AND t.role = 'Counter'
      GROUP BY 
        t.form, t.grade, t.size, t.finish, t.ext_finish, 
        t.width, t.length, t.mill, t.heat, t.count_type
    `;

    const { rows: countedInventory } = await pool.query(countedInventoryQuery, [location_id]);
    console.log('Counted inventory count:', countedInventory.length);

    // 3. Get recheck items
    const recheckItemsQuery = `
      SELECT 
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
        original_transaction_ids
      FROM recheck_items 
      WHERE location_id = $1
    `;

    const { rows: recheckItems } = await pool.query(recheckItemsQuery, [location_id]);
    console.log('Recheck items count:', recheckItems.length);

    // 4. Create lookup maps
    const systemMap = new Map();
    const countedMap = new Map();
    const recheckMap = new Map();

    console.log('Processing system inventory items...');
    systemInventory.forEach((item, index) => {
      if (!item.form || !item.grade || !item.size) {
        console.warn(`Skipping invalid system item at index ${index}:`, item);
        return;
      }
      const key = `${item.form}-${item.grade}-${item.size}-${item.finish}-${item.ext_finish}-${item.width}-${item.length}`;
      systemMap.set(key, item);
    });

    console.log('Processing counted inventory items...');
    countedInventory.forEach((item, index) => {
      if (!item.form || !item.grade || !item.size) {
        console.warn(`Skipping invalid counted item at index ${index}:`, item);
        return;
      }
      const key = `${item.form}-${item.grade}-${item.size}-${item.finish}-${item.ext_finish}-${item.width}-${item.length}`;
      countedMap.set(key, item);
    });

    console.log('Processing recheck items...');
    recheckItems.forEach((item, index) => {
      if (!item.form || !item.grade || !item.size) {
        console.warn(`Skipping invalid recheck item at index ${index}:`, item);
        return;
      }
      const key = `${item.form}-${item.grade}-${item.size}-${item.finish}-${item.ext_finish}-${item.width}-${item.length}`;
      recheckMap.set(key, item);
    });

    console.log('Map sizes - System:', systemMap.size, 'Counted:', countedMap.size, 'Recheck:', recheckMap.size);

    // 5. Build reconciliation items array
    const items = [];
    let items_matched = 0;
    let overcounts = 0;
    let undercounts = 0;
    let not_counted = 0;
    let rechecking_in_progress = 0;
    let rechecked = 0;

    // Process system items
    systemMap.forEach((systemItem, key) => {
      const countedItem = countedMap.get(key);
      const recheckItem = recheckMap.get(key);
      
      const systemQty = systemItem.system_qty || 0;
      const countedQty = countedItem ? countedItem.total_qty : 0;
      const variance = countedQty - systemQty;
      
      let status = 'Not Counted';
      if (countedItem) {
        if (variance === 0) {
          status = 'Match';
          items_matched++;
        } else if (variance > 0) {
          status = 'Overcount';
          overcounts++;
        } else {
          status = 'Undercount';
          undercounts++;
        }
      } else {
        not_counted++;
      }

      // Check if item is marked for rechecking
      if (recheckItem) {
        if (recheckItem.status === 'Rechecking in Progress') {
          status = 'Rechecking in Progress';
          rechecking_in_progress++;
        } else if (recheckItem.status === 'Rechecked') {
          status = 'Rechecked';
          rechecked++;
        }
      }

      items.push({
        form: systemItem.form,
        grade: systemItem.grade,
        size: systemItem.size,
        finish: systemItem.finish,
        ext_finish: systemItem.ext_finish,
        width: systemItem.width,
        length: systemItem.length,
        mill: countedItem?.mill || '',
        heat: countedItem?.heat || '',
        system_qty: systemQty,
        counted_qty: countedQty,
        variance: variance,
        status: status,
        transaction_count: countedItem?.transaction_count,
        teams: countedItem?.teams,
        counters: countedItem?.counters,
        count_type: countedItem?.count_type,
        branch: systemItem.branch,
        prd_ohd_mat_val: systemItem.prd_ohd_mat_val,
        prd_ohd_mat_cst: systemItem.prd_ohd_mat_cst,
        is_recheck_item: !!recheckItem,
        recheck_reason: recheckItem?.recheck_reason,
        marked_by: recheckItem?.marked_by,
        marked_at: recheckItem?.marked_at
      });
    });

    // Add counted items that are not in system
    countedMap.forEach((countedItem, key) => {
      if (!systemMap.has(key)) {
        const recheckItem = recheckMap.get(key);
        let status = 'Not Counted';
        
        if (recheckItem) {
          if (recheckItem.status === 'Rechecking in Progress') {
            status = 'Rechecking in Progress';
            rechecking_in_progress++;
          } else if (recheckItem.status === 'Rechecked') {
            status = 'Rechecked';
            rechecked++;
          }
        }

        items.push({
          form: countedItem.form,
          grade: countedItem.grade,
          size: countedItem.size,
          finish: countedItem.finish,
          ext_finish: countedItem.ext_finish,
          width: countedItem.width,
          length: countedItem.length,
          mill: countedItem.mill,
          heat: countedItem.heat,
          system_qty: 0,
          counted_qty: countedItem.total_qty,
          variance: countedItem.total_qty,
          status: status,
          transaction_count: countedItem.transaction_count,
          teams: countedItem.teams,
          counters: countedItem.counters,
          count_type: countedItem.count_type,
          branch: branch,
          prd_ohd_mat_val: 0,
          prd_ohd_mat_cst: 0,
          is_recheck_item: !!recheckItem,
          recheck_reason: recheckItem?.recheck_reason,
          marked_by: recheckItem?.marked_by,
          marked_at: recheckItem?.marked_at
        });
      }
    });

    console.log('Final reconciliation report - Items count:', items.length);
    console.log('Summary:', {
      total_system_items: systemInventory.length,
      total_counted_items: countedInventory.length,
      items_matched,
      overcounts,
      undercounts,
      not_counted,
      rechecking_in_progress,
      rechecked
    });

    const reconciliationReport = {
      summary: {
        total_system_items: systemInventory.length,
        total_counted_items: countedInventory.length,
        total_reconciliation_items: items.length,
        items_matched,
        overcounts,
        undercounts,
        not_counted,
        counted_not_in_system: 0, // Will be calculated
        rechecking_in_progress,
        rechecked
      },
      items
    };

    // Calculate counted_not_in_system
    reconciliationReport.summary.counted_not_in_system = items.filter(item => 
      item.status === 'Counted Not In System'
    ).length;

    res.json(reconciliationReport);
  } catch (error) {
    console.error('Error generating reconciliation report:', error);
    console.error('Error stack:', error.stack);
    
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      console.error('API Error Status:', error.response.status);
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getCheckerSKUItems = async (req, res) => {
  const { location_id, team_id, user_id } = req.query;
  
  if (!location_id) {
    return res.status(400).json({ error: 'Location ID is required' });
  }

  try {
    const query = `
      SELECT DISTINCT csi.* 
      FROM checker_sku_item csi
      LEFT JOIN assigned_locations al ON csi.location_id = al.location_id
      LEFT JOIN team_members tm ON al.team_id = tm.team_id
      LEFT JOIN st_roles r ON tm.role_id = r.role_id
      WHERE csi.location_id = $1
      AND al.team_id = $2
      AND tm.user_id = $3
      AND al.status = 'Assigned Checker'
      AND r.role_desc = 'Checker'
      ORDER BY csi.created_at DESC
    `;
    
    console.log('Query:', query);
    console.log('Parameters:', [location_id, team_id, user_id]);
    
    const result = await pool.query(query, [location_id, team_id, user_id]);
    console.log('Query result:', result.rows);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Detailed error:', error);
    console.error('Error fetching checker SKU items:', {
      message: error.message,
      detail: error.detail,
      hint: error.hint,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to fetch items',
      details: error.message,
      code: error.code
    });
  }
};

exports.checkerSkyAssigned = async (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  // SQL query to fetch locations for the user (without sections)
  const query = `
    SELECT DISTINCT
      a.user_id,
      a.full_name,
      a.user_name,
      b.role_desc,
      c.team_id,
      c.team_name,
      e.location_id,
      f.location_desc,
      e.status
    FROM 
      st_users a
    INNER JOIN 
      team_members d ON a.user_id = d.user_id
    INNER JOIN 
      st_roles b ON b.role_id = d.role_id
    INNER JOIN 
      teams c ON d.team_id = c.team_id
    INNER JOIN 
      assigned_locations e ON e.team_id = c.team_id
    INNER JOIN 
      st_locations f ON e.location_id = f.location_id
    WHERE 
      d.user_id = $1
    AND
      b.role_desc = 'Checker'
    GROUP BY
      a.user_id,
      a.full_name,
      a.user_name,
      b.role_desc,
      c.team_id,
      c.team_name,
      e.location_id,
      f.location_desc,
      e.status;
  `;

  try {
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ message: 'Failed to fetch data', error: err.message });
  }
};

exports.getAvailableWarehouses = async (req, res) => {
  try {
    const sqlQuery = `
      SELECT DISTINCT prd_whs as warehouse
      FROM intprd_rec 
      WHERE prd_invt_sts = 'S'
        AND prd_whs IS NOT NULL
        AND prd_whs != ''
      ORDER BY prd_whs
    `;

    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    if (response.data.Data) {
      const warehouses = response.data.Data.map(item => item.warehouse);
      res.json({
        success: true,
        data: warehouses
      });
    } else {
      res.json({
        success: true,
        data: []
      });
    }
  } catch (error) {
    console.error("Error fetching available warehouses:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch available warehouses",
      message: error.message 
    });
  }
};

// Get checker activity logs (Controller only)
exports.debugUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, user_name, full_name FROM st_users ORDER BY user_id');
    res.json({
      success: true,
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    console.error('Error fetching users for debug:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCheckerActivityLogs = async (req, res) => {
  try {
    const { location_id, section_id, team_id, activity_type, start_date, end_date, limit = 100, offset = 0 } = req.query;
    
    // Check if user has controller role
    const userRole = req.headers['x-selected-role'];
    if (userRole !== 'Controller') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only controllers can view checker activity logs.'
      });
    }

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Build dynamic WHERE clause
    if (location_id) {
      paramCount++;
      whereConditions.push(`cal.location_id = $${paramCount}`);
      queryParams.push(location_id);
    }

    if (section_id) {
      paramCount++;
      whereConditions.push(`cal.section_id = $${paramCount}`);
      queryParams.push(section_id);
    }

    if (team_id) {
      paramCount++;
      whereConditions.push(`cal.team_id = $${paramCount}`);
      queryParams.push(team_id);
    }

    if (activity_type) {
      paramCount++;
      whereConditions.push(`cal.activity_type = $${paramCount}`);
      queryParams.push(activity_type);
    }

    if (start_date) {
      paramCount++;
      whereConditions.push(`cal.created_at >= $${paramCount}`);
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereConditions.push(`cal.created_at <= $${paramCount}`);
      queryParams.push(end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM checker_activity_logs cal
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].total);

    // Get logs with pagination
    paramCount++;
    const logsQuery = `
      SELECT 
        cal.log_id,
        cal.location_id,
        cal.section_id,
        cal.team_id,
        cal.checker_user_id,
        cal.activity_type,
        cal.transaction_id,
        cal.tag_id,
        cal.old_values,
        cal.new_values,
        cal.activity_description,
        cal.created_at,
        l.location_desc,
        s.section_desc,
        tm.team_name,
        u.full_name as checker_name
      FROM checker_activity_logs cal
      LEFT JOIN st_locations l ON cal.location_id = l.location_id
      LEFT JOIN st_sections s ON cal.section_id = s.section_id
      LEFT JOIN teams tm ON cal.team_id = tm.team_id
      LEFT JOIN st_users u ON cal.checker_user_id = u.user_id
      ${whereClause}
      ORDER BY cal.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(limit, offset);
    const logsResult = await pool.query(logsQuery, queryParams);

    res.json({
      success: true,
      data: logsResult.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching checker activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch checker activity logs',
      error: error.message
    });
  }
};

// Check dimension segment for form, grade, size, finish combination
exports.checkDimensionSegment = async (req, res) => {
  try {
    const { prm_frm, prm_grd, prm_size, prm_fnsh } = req.query;

    // Validate required parameters
    if (!prm_frm || !prm_grd || !prm_size || !prm_fnsh) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: prm_frm, prm_grd, prm_size, prm_fnsh'
      });
    }

    console.log('Checking dimension segment for:', { prm_frm, prm_grd, prm_size, prm_fnsh });

    const sqlQuery = `
      SELECT prm_dim_seg 
      FROM inrprm_rec 
      WHERE prm_frm = '${prm_frm}' 
        AND prm_grd = '${prm_grd}' 
        AND prm_size = '${prm_size}' 
        AND prm_fnsh = '${prm_fnsh}'
    `;

    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: sqlQuery },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE,
        },
      }
    );

    console.log('Full API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
    });

    console.log('Raw API Response Data:', JSON.stringify(response.data, null, 2));

    // Check if response.data exists and has the expected structure
    if (!response.data) {
      console.log('No response.data found');
      return res.json({
        success: true,
        prm_dim_seg: null,
        message: 'No response data received'
      });
    }

    // The API response has the structure: { Data: [...], Time: '7ms' }
    const dataArray = response.data.Data;
    
    if (!dataArray || !Array.isArray(dataArray)) {
      console.log('Response.data.Data is not an array, type:', typeof dataArray);
      return res.json({
        success: true,
        prm_dim_seg: null,
        message: 'Response data.Data is not an array'
      });
    }

    if (dataArray.length === 0) {
      console.log('Response.data.Data array is empty');
      return res.json({
        success: true,
        prm_dim_seg: null,
        message: 'No matching record found'
      });
    }

    const firstRecord = dataArray[0];
    console.log('First record:', JSON.stringify(firstRecord, null, 2));
    console.log('First record keys:', Object.keys(firstRecord));

    if (!firstRecord) {
      console.log('First record is null/undefined');
      return res.json({
        success: true,
        prm_dim_seg: null,
        message: 'First record is null'
      });
    }

    if (!firstRecord.prm_dim_seg) {
      console.log('prm_dim_seg property not found in first record');
      console.log('Available properties:', Object.keys(firstRecord));
      return res.json({
        success: true,
        prm_dim_seg: null,
        message: 'No dimension segment found in record'
      });
    }

    const prm_dim_seg = firstRecord.prm_dim_seg.trim(); // Trim whitespace since we see "L  " with spaces
    console.log('Found dimension segment:', prm_dim_seg);

    res.json({
      success: true,
      prm_dim_seg: prm_dim_seg,
      isLengthBased: prm_dim_seg === 'L'
    });

  } catch (error) {
    console.error('Error checking dimension segment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check dimension segment',
      error: error.message
    });
  }
};


