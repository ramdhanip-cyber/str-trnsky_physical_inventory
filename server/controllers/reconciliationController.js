const pool = require("../database/db");
const axios = require('axios');

exports.reconcileInventory = async (req, res) => {
  try {
    const { location_id, warehouse, branch } = req.body;

    console.log('Reconciliation request:', { location_id, warehouse, branch });
    
    if (!location_id || !warehouse || !branch) {
      return res.status(400).json({ error: "Location ID, warehouse, and branch are required" });
    }

    // Execute the provided query to get system data
    const query = `
      WITH cost_calc AS (
  SELECT 
    p.prd_frm AS form,
    p.prd_grd AS grade,
    p.prd_size AS size,
    p.prd_fnsh AS finish,
    p.prd_ef_svar AS ext_finish,
    p.prd_wdth AS width,
    p.prd_lgth AS length,
    p.prd_brh AS branch,
    p.prd_whs AS warehouse,
    p.prd_invt_typ AS inv_type,
    p.prd_invt_qlty AS inv_quality,
    SUM(p.prd_ohd_wgt) AS weight,
    SUM(p.prd_ohd_qty) AS system_qty,
    SUM(p.prd_ohd_pcs) AS total_qty,
    SUM(
      CASE 
        WHEN p.prd_ohd_mat_val = 0 
        THEN p.prd_ohd_qty * (a.acp_tot_mat_val / NULLIF(a.acp_tot_wgt,0)) 
        ELSE p.prd_ohd_mat_val 
      END
    ) AS total_mat_val
  FROM intprd_rec p
  LEFT JOIN intacp_rec a
    ON p.prd_cmpy_id = a.acp_cmpy_id
   AND p.prd_avg_cst_pool = a.acp_avg_cst_pool
  WHERE p.prd_brh = '${branch}'
    AND p.prd_whs = '${warehouse}'
    AND p.prd_invt_sts = 'S'
  GROUP BY 
    p.prd_frm, p.prd_grd, p.prd_size, p.prd_fnsh, p.prd_ef_svar,
    p.prd_wdth, p.prd_lgth, p.prd_brh, p.prd_whs, 
    p.prd_invt_typ, p.prd_invt_qlty
)
SELECT 
  form, grade, size, finish, ext_finish, width, length,
  weight, branch, warehouse, inv_type, inv_quality,
  system_qty, total_qty,
  ROUND(total_mat_val,2) AS prd_ohd_mat_val,
  ROUND((total_mat_val / NULLIF(total_qty,0)) * 100, 2) AS prd_ohd_mat_cst
FROM cost_calc;

    `;

    console.log('Executing query:', query);

    // Execute the query using the OAuth API
    const response = await axios.post(
      process.env.OAUTH_API_URL,
      { sql: query },
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          "Content-Type": "application/json",
          Database: process.env.OAUTH_DATABASE
        },
        timeout: 60000, // Increased timeout to 60 seconds
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        // Add retry configuration
        validateStatus: function (status) {
          return status >= 200 && status < 300; // Accept only 2xx status codes
        }
      }
    );

    console.log('Query executed successfully');
    console.log('Response data type:', typeof response.data);
    console.log('Response data keys:', response.data ? Object.keys(response.data) : 'No data');

    // Extract the data from the response
    let data = [];
    if (response.data && Array.isArray(response.data)) {
      data = response.data;
    } else if (response.data && response.data.rows && Array.isArray(response.data.rows)) {
      data = response.data.rows;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      data = response.data.data;
    } else if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      data = response.data.Data;
    }

    console.log('Response data structure:', JSON.stringify(response.data, null, 2));

    console.log('Extracted data count:', data.length);

    // Quality standards mapping function
    const mapQualityStandards = (quality) => {
      switch (quality) {
        case '-': return 'Conforms to Std';
        case 'X': return 'Secondary';
        case 'M': return 'Mill Claim';
        case 'R': return 'Reject';
        case 'S': return 'Scrap';
        case 'P': return 'Price Protected';
        default: return quality || '-';
      }
    };

    // Transform the data to match the required display format
    const transformedData = data.map(item => ({
      form: item.form,
      grade: item.grade,
      size: item.size,
      finish: item.finish,
      ext_finish: item.ext_finish,
      width: item.width,
      length: item.length,
      weight: item.weight,
      inv_type: item.inv_type,
      inv_quality: mapQualityStandards(item.inv_quality),
      branch: item.branch,
      warehouse: item.warehouse,
      system_qty: item.system_qty,
      prd_ohd_mat_val: item.prd_ohd_mat_val,
      prd_ohd_mat_cst: item.prd_ohd_mat_cst
    }));

    // Create a summary
    const summary = {
      total_system_items: data.length,
      total_system_quantity: data.reduce((sum, item) => sum + (parseInt(item.system_qty) || 0), 0),
      branch: branch,
      warehouse: warehouse,
      location_id: location_id,
      record_date: new Date().toISOString()
    };

    // Return the data
    res.json({
      success: true,
      summary: summary,
      items: transformedData
    });

  } catch (error) {
    console.error('Reconciliation error:', error);
    
    // Enhanced error logging
    if (error.code === 'ECONNRESET') {
      console.error('Connection reset error - this may be due to:');
      console.error('1. Query complexity causing timeout');
      console.error('2. Network connectivity issues');
      console.error('3. Server-side connection limits');
      console.error('4. Large result set');
    }
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('Request was made but no response received');
      console.error('Request details:', error.request);
    }
    
    // Provide more specific error messages
    let errorMessage = "Failed to reconcile inventory";
    let errorDetails = error.message;
    
    if (error.code === 'ECONNRESET') {
      errorMessage = "Connection reset during query execution";
      errorDetails = "The query may be too complex or returning too much data. Please try again or contact support.";
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = "Query execution timed out";
      errorDetails = "The query took too long to execute. Please try again or simplify the query.";
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = "OAuth service not found";
      errorDetails = "Unable to connect to the OAuth service. Please check the OAUTH_API_URL configuration.";
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
};