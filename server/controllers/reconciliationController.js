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
      select * from (SELECT 
        prd_frm as form,
        prd_grd as grade,
        prd_size as size,
        prd_fnsh as finish,
        prd_ef_svar as ext_finish,
        prd_wdth as width,
        prd_lgth as length,
        prd_loc as location,
        sum(prd_ohd_wgt) as weight,
        prd_brh as branch,
        prd_whs as warehouse,
        prd_invt_typ as inv_type,
        prd_invt_qlty as inv_quality,
        CAST(sum(prd_ohd_qty) AS INTEGER) as system_qty,
        CAST(sum(COALESCE(prd_ohd_pcs, prd_ohd_qty)) AS INTEGER) as total_qty,
        round(case when sum(prd_ohd_mat_val) = 0 then sum(prd_ohd_qty*(acp_tot_mat_val/nullif(acp_tot_wgt,0))) else sum(prd_ohd_mat_val) end,2) as prd_ohd_mat_val,
        round((case when sum(prd_ohd_mat_val) = 0 then sum(prd_ohd_qty*(acp_tot_mat_val/nullif(acp_tot_wgt,0))) else sum(prd_ohd_mat_val) end/nullif(sum(prd_ohd_qty),0))*100,2) as prd_ohd_mat_cst
      FROM intprd_rec 
      LEFT JOIN intacp_rec
      ON prd_cmpy_id = acp_cmpy_id
      AND prd_avg_cst_pool =  acp_avg_cst_pool
      WHERE prd_brh = '${branch}' AND prd_whs = '${warehouse}' AND prd_invt_sts = 'S'
group by 
form,
        grade,
        size,
         finish,
        ext_finish,
        width,
        length,
        location,
        branch,
        warehouse,
        inv_type,
        inv_quality) as tst
ORDER BY form ASC, 
  CASE 
    WHEN size ~ '^[0-9]+\.?[0-9]*$' THEN CAST(size AS NUMERIC)
    ELSE 999999999
  END ASC,
  size ASC

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
      location: item.location,
      weight: item.weight,
      inv_type: item.inv_type,
      inv_quality: mapQualityStandards(item.inv_quality),
      branch: item.branch,
      warehouse: item.warehouse,
      system_qty: item.system_qty,
      total_qty: item.total_qty,
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

// Save reconciliation data with comparison
exports.saveReconciliationWithComparison = async (req, res) => {
  try {
    const { 
      location_id, 
      warehouse, 
      branch, 
      summary_data, 
      items_data, 
      checker_data, 
      orphaned_checker_data,
      notes 
    } = req.body;

    if (!location_id || !warehouse || !branch || !summary_data || !items_data) {
      return res.status(400).json({ 
        error: "Location ID, warehouse, branch, summary_data, and items_data are required" 
      });
    }

    const record_name = `Reconciliation_${branch}_${warehouse}_${new Date().toISOString().slice(0, 10)}`;
    const created_by = req.user?.user_id || null;

    // Prepare the data to save
    const reconciliationData = {
      summary: summary_data,
      items: items_data,
      checker_data: checker_data || [],
      orphaned_checker_data: orphaned_checker_data || [],
      comparison_date: new Date().toISOString()
    };

    // Debug logging
    console.log('Received checker_data:', JSON.stringify(checker_data, null, 2));
    console.log('Sample checker item:', checker_data?.[0]);
    
    // Enhance items_data with comparison results (checker quantities, variance, status)
    const enhancedItemsData = items_data.map(systemItem => {
      // Find matching checker data
      const matchingChecker = checker_data?.find(checker => {
        const systemForm = String(systemItem.form || '').trim();
        const checkerForm = String(checker.form || '').trim();
        
        const systemGrade = String(systemItem.grade || '').trim();
        const checkerGrade = String(checker.grade || '').trim();
        
        const systemSize = String(systemItem.size || '').trim();
        const checkerSize = String(checker.size || '').trim();
        
        const systemFinish = String(systemItem.finish || '').trim();
        const checkerFinish = String(checker.finish || '').trim();
        
        const systemExtFinish = String(systemItem.ext_finish || '').trim();
        const checkerExtFinish = String(checker.ext_finish || '').trim();
        
        const systemWidth = String(Number(systemItem.width || 0)).trim();
        const checkerWidth = String(Number(checker.width || 0)).trim();
        
        const systemLength = String(Number(systemItem.length || 0)).trim();
        const checkerLength = String(Number(checker.length || 0)).trim();
        
        const systemLocation = String(systemItem.location || '').trim();
        const checkerLocation = String(checker.location || '').trim();
        
        const systemType = String(systemItem.inv_type || '').trim();
        const checkerType = String(checker.type || '').trim();
        
        const systemQuality = String(systemItem.inv_quality || '').trim();
        const checkerQuality = String(checker.remarks || '').trim();
        
        return (
          systemForm === checkerForm &&
          systemGrade === checkerGrade &&
          systemSize === checkerSize &&
          systemFinish === checkerFinish &&
          systemExtFinish === checkerExtFinish &&
          systemWidth === checkerWidth &&
          systemLength === checkerLength &&
          systemLocation === checkerLocation &&
          systemType === checkerType &&
          systemQuality === checkerQuality
        );
      });

      const checkerQty = matchingChecker ? matchingChecker.qty : 0;
      const systemQty = systemItem.total_qty || 0; // Use total_qty as the system quantity
      const variance = checkerQty - systemQty;
      
      // Debug logging
      if (matchingChecker) {
        console.log(`Item: ${systemItem.form}-${systemItem.grade}-${systemItem.size}, Checker Qty: ${matchingChecker.qty}, System Qty: ${systemQty}, Variance: ${variance}`);
      } else {
        console.log(`No matching checker found for: ${systemItem.form}-${systemItem.grade}-${systemItem.size}`);
      }
      const status = matchingChecker ? 
        (checkerQty === systemQty ? 'Match' : 
         checkerQty > systemQty ? 'Over Count' : 'Under Count') : 
        'No Match';

      // Return enhanced item with comparison data
      return {
        ...systemItem,
        system_qty: systemQty, // Store the system quantity (total_qty) for consistency
        checker_qty: checkerQty,
        variance: variance,
        status: status,
        has_comparison: true // Flag to indicate this item has comparison data
      };
    });

    const query = `
      INSERT INTO reconciliation_records 
      (location_id, branch, warehouse, record_name, summary_data, items_data, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, record_name, created_at
    `;

    const values = [
      location_id,
      branch,
      warehouse,
      record_name,
      JSON.stringify(reconciliationData),
      JSON.stringify(enhancedItemsData),
      notes || null,
      created_by
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      record_id: result.rows[0].id,
      record_name: result.rows[0].record_name,
      created_at: result.rows[0].created_at,
      message: 'Reconciliation data saved successfully'
    });

  } catch (error) {
    console.error('Save reconciliation error:', error);
    res.status(500).json({ 
      error: "Failed to save reconciliation data",
      details: error.message 
    });
  }
};

// Check for existing reconciliation data
exports.checkExistingReconciliation = async (req, res) => {
  try {
    const { location_id, warehouse, branch } = req.query;

    if (!location_id || !warehouse || !branch) {
      return res.status(400).json({ 
        error: "Location ID, warehouse, and branch are required" 
      });
    }

    const query = `
      SELECT id, record_name, record_date, created_at, summary_data, items_data, notes
      FROM reconciliation_records 
      WHERE location_id = $1 
        AND branch = $2 
        AND warehouse = $3 
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [location_id, branch, warehouse]);

    if (result.rows.length > 0) {
      const record = result.rows[0];
      const summaryData = record.summary_data;
      
      res.json({
        exists: true,
        record: {
          id: record.id,
          record_name: record.record_name,
          record_date: record.record_date,
          created_at: record.created_at,
          summary: summaryData.summary,
          items: summaryData.items,
          checker_data: summaryData.checker_data || [],
          orphaned_checker_data: summaryData.orphaned_checker_data || [],
          notes: record.notes
        }
      });
    } else {
      res.json({
        exists: false,
        message: 'No existing reconciliation data found'
      });
    }

  } catch (error) {
    console.error('Check existing reconciliation error:', error);
    res.status(500).json({ 
      error: "Failed to check existing reconciliation data",
      details: error.message 
    });
  }
};

// Load existing reconciliation data
exports.loadReconciliationData = async (req, res) => {
  try {
    const { record_id } = req.params;

    if (!record_id) {
      return res.status(400).json({ 
        error: "Record ID is required" 
      });
    }

    const query = `
      SELECT id, record_name, record_date, created_at, summary_data, items_data, notes
      FROM reconciliation_records 
      WHERE id = $1 AND status = 'active'
    `;

    const result = await pool.query(query, [record_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: "Reconciliation record not found" 
      });
    }

    const record = result.rows[0];
    const summaryData = record.summary_data;

    res.json({
      success: true,
      record: {
        id: record.id,
        record_name: record.record_name,
        record_date: record.record_date,
        created_at: record.created_at,
        summary: summaryData.summary,
        items: summaryData.items,
        checker_data: summaryData.checker_data || [],
        orphaned_checker_data: summaryData.orphaned_checker_data || [],
        notes: record.notes
      }
    });

  } catch (error) {
    console.error('Load reconciliation error:', error);
    res.status(500).json({ 
      error: "Failed to load reconciliation data",
      details: error.message 
    });
  }
};

// Delete reconciliation record
exports.deleteReconciliationRecord = async (req, res) => {
  try {
    const { record_id } = req.params;

    if (!record_id) {
      return res.status(400).json({ 
        error: "Record ID is required" 
      });
    }

    // First check if the record exists
    const checkQuery = `
      SELECT id, record_name FROM reconciliation_records 
      WHERE id = $1 AND status = 'active'
    `;

    const checkResult = await pool.query(checkQuery, [record_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        error: "Reconciliation record not found" 
      });
    }

    // Soft delete by updating status to 'deleted'
    const deleteQuery = `
      UPDATE reconciliation_records 
      SET status = 'deleted', updated_at = NOW()
      WHERE id = $1
    `;

    await pool.query(deleteQuery, [record_id]);

    res.json({
      success: true,
      message: `Reconciliation record "${checkResult.rows[0].record_name}" deleted successfully`
    });

  } catch (error) {
    console.error('Delete reconciliation error:', error);
    res.status(500).json({ 
      error: "Failed to delete reconciliation record",
      details: error.message 
    });
  }
};

// Mark items for recheck
exports.markItemsForRecheck = async (req, res) => {
  try {
    const { location_id, items, recheck_reason } = req.body;
    const marked_by = req.user?.user_id || null;

    if (!location_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: "Location ID and items array are required" 
      });
    }

    const results = [];
    
    for (const item of items) {
      const query = `
        INSERT INTO recheck_items 
        (location_id, form, grade, size, finish, ext_finish, width, length, 
         system_qty, counted_qty, variance, recheck_reason, marked_by, tag_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `;

      const values = [
        location_id,
        item.form,
        item.grade,
        item.size,
        item.finish,
        item.ext_finish,
        item.width,
        item.length,
        item.system_qty || 0,
        item.counted_qty || 0,
        item.variance || 0,
        recheck_reason || 'Marked for recheck during reconciliation',
        marked_by,
        item.tag_id
      ];

      const result = await pool.query(query, values);
      results.push({
        item_id: result.rows[0].id,
        form: item.form,
        grade: item.grade,
        size: item.size,
        status: 'marked'
      });
    }

    res.json({
      success: true,
      message: `${results.length} items marked for recheck`,
      results: results
    });

  } catch (error) {
    console.error('Mark items for recheck error:', error);
    res.status(500).json({ 
      error: "Failed to mark items for recheck",
      details: error.message 
    });
  }
};

// Get recheck items for a location
exports.getRecheckItems = async (req, res) => {
  try {
    const { location_id } = req.params;

    if (!location_id) {
      return res.status(400).json({ 
        error: "Location ID is required" 
      });
    }

    const query = `
      SELECT ri.*, 
             u1.full_name as marked_by_name,
             u2.full_name as rechecked_by_name
      FROM recheck_items ri
      LEFT JOIN st_users u1 ON ri.marked_by = u1.user_id
      LEFT JOIN st_users u2 ON ri.rechecked_by = u2.user_id
      WHERE ri.location_id = $1 
        AND ri.status != 'Completed'
      ORDER BY ri.marked_at DESC
    `;

    const result = await pool.query(query, [location_id]);

    res.json({
      success: true,
      items: result.rows
    });

  } catch (error) {
    console.error('Get recheck items error:', error);
    res.status(500).json({ 
      error: "Failed to get recheck items",
      details: error.message 
    });
  }
};

// Update recheck item
exports.updateRecheckItem = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { counted_qty, recheck_reason, status } = req.body;
    const rechecked_by = req.user?.user_id || null;

    if (!item_id) {
      return res.status(400).json({ 
        error: "Item ID is required" 
      });
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (counted_qty !== undefined) {
      updateFields.push(`counted_qty = $${paramCount++}`);
      values.push(counted_qty);
    }

    if (recheck_reason !== undefined) {
      updateFields.push(`recheck_reason = $${paramCount++}`);
      values.push(recheck_reason);
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (rechecked_by) {
      updateFields.push(`rechecked_by = $${paramCount++}`);
      values.push(rechecked_by);
      updateFields.push(`rechecked_at = NOW()`);
    }

    if (status === 'Completed') {
      updateFields.push(`recheck_count = recheck_count + 1`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        error: "No fields to update" 
      });
    }

    values.push(item_id);
    const query = `
      UPDATE recheck_items 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: "Recheck item not found" 
      });
    }

    res.json({
      success: true,
      message: "Recheck item updated successfully",
      item: result.rows[0]
    });

  } catch (error) {
    console.error('Update recheck item error:', error);
    res.status(500).json({ 
      error: "Failed to update recheck item",
      details: error.message 
    });
  }
};

// Complete recheck workflow - update quantity and mark as completed
exports.completeRecheckItem = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { new_counted_qty, recheck_reason, location_id } = req.body;
    const rechecked_by = req.user?.user_id || null;

    if (!item_id || new_counted_qty === undefined) {
      return res.status(400).json({ 
        error: "Item ID and new counted quantity are required" 
      });
    }

    // First, get the current recheck item
    const getQuery = `
      SELECT * FROM recheck_items 
      WHERE id = $1 AND status != 'Completed'
    `;
    
    const getResult = await pool.query(getQuery, [item_id]);
    
    if (getResult.rows.length === 0) {
      return res.status(404).json({ 
        error: "Recheck item not found or already completed" 
      });
    }

    const recheckItem = getResult.rows[0];
    const newVariance = new_counted_qty - (recheckItem.system_qty || 0);

    // Update the recheck item with new quantity and mark as completed
    const updateQuery = `
      UPDATE recheck_items 
      SET counted_qty = $1, 
          variance = $2,
          status = 'Completed',
          recheck_reason = $3,
          rechecked_by = $4,
          rechecked_at = NOW(),
          recheck_count = recheck_count + 1
      WHERE id = $5
      RETURNING *
    `;

    const updateValues = [
      new_counted_qty,
      newVariance,
      recheck_reason || 'Quantity updated during reconciliation',
      rechecked_by,
      item_id
    ];

    const updateResult = await pool.query(updateQuery, updateValues);

    if (updateResult.rows.length === 0) {
      return res.status(500).json({ 
        error: "Failed to update recheck item" 
      });
    }

    // Update the reconciliation_records with the new data
    if (location_id) {
      try {
        // Get the latest reconciliation record for this location
        const getReconciliationQuery = `
          SELECT id, summary_data, items_data 
          FROM reconciliation_records 
          WHERE location_id = $1 AND status = 'active'
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        
        const reconciliationResult = await pool.query(getReconciliationQuery, [location_id]);
        
        if (reconciliationResult.rows.length > 0) {
          const reconciliationRecord = reconciliationResult.rows[0];
          const summaryData = reconciliationRecord.summary_data;
          const itemsData = reconciliationRecord.items_data;
          
          // Update the checker_data in summary_data with the new quantity
          if (summaryData.checker_data && Array.isArray(summaryData.checker_data)) {
            const updatedCheckerData = summaryData.checker_data.map(checker => {
              // Use the same matching logic as frontend
              const systemForm = String(recheckItem.form || '').trim();
              const checkerForm = String(checker.form || '').trim();
              
              const systemGrade = String(recheckItem.grade || '').trim();
              const checkerGrade = String(checker.grade || '').trim();
              
              const systemSize = String(recheckItem.size || '').trim();
              const checkerSize = String(checker.size || '').trim();
              
              const systemFinish = String(recheckItem.finish || '').trim();
              const checkerFinish = String(checker.finish || '').trim();
              
              const systemExtFinish = String(recheckItem.ext_finish || '').trim();
              const checkerExtFinish = String(checker.ext_finish || '').trim();
              
              const systemWidth = String(Number(recheckItem.width || 0)).trim();
              const checkerWidth = String(Number(checker.width || 0)).trim();
              
              const systemLength = String(Number(recheckItem.length || 0)).trim();
              const checkerLength = String(Number(checker.length || 0)).trim();
              
              const systemLocation = String(recheckItem.location || '').trim();
              const checkerLocation = String(checker.location || '').trim();
              
              const systemType = String(recheckItem.inv_type || '').trim();
              const checkerType = String(checker.type || '').trim();
              
              const systemQuality = String(recheckItem.inv_quality || '').trim();
              const checkerQuality = String(checker.remarks || '').trim();
              
              const isMatch = (
                systemForm === checkerForm &&
                systemGrade === checkerGrade &&
                systemSize === checkerSize &&
                systemFinish === checkerFinish &&
                systemExtFinish === checkerExtFinish &&
                systemWidth === checkerWidth &&
                systemLength === checkerLength &&
                systemLocation === checkerLocation &&
                systemType === checkerType &&
                systemQuality === checkerQuality
              );

              if (isMatch) {
                console.log('Updating reconciliation record - found matching checker item, updating quantity from', checker.qty, 'to', new_counted_qty);
                return { ...checker, qty: new_counted_qty };
              }
              return checker;
            });
            
            summaryData.checker_data = updatedCheckerData;
          }
          
          // Update the items_data with the new quantity (enhanced items with comparison data)
          const updatedItemsData = itemsData.map(item => {
            const systemForm = String(recheckItem.form || '').trim();
            const itemForm = String(item.form || '').trim();
            
            const systemGrade = String(recheckItem.grade || '').trim();
            const itemGrade = String(item.grade || '').trim();
            
            const systemSize = String(recheckItem.size || '').trim();
            const itemSize = String(item.size || '').trim();
            
            const systemFinish = String(recheckItem.finish || '').trim();
            const itemFinish = String(item.finish || '').trim();
            
            const systemExtFinish = String(recheckItem.ext_finish || '').trim();
            const itemExtFinish = String(item.ext_finish || '').trim();
            
            const systemWidth = String(Number(recheckItem.width || 0)).trim();
            const itemWidth = String(Number(item.width || 0)).trim();
            
            const systemLength = String(Number(recheckItem.length || 0)).trim();
            const itemLength = String(Number(item.length || 0)).trim();
            
            const systemLocation = String(recheckItem.location || '').trim();
            const itemLocation = String(item.location || '').trim();
            
            const systemType = String(recheckItem.inv_type || '').trim();
            const itemType = String(item.inv_type || '').trim();
            
            const systemQuality = String(recheckItem.inv_quality || '').trim();
            const itemQuality = String(item.inv_quality || '').trim();
            
            const isMatch = (
              systemForm === itemForm &&
              systemGrade === itemGrade &&
              systemSize === itemSize &&
              systemFinish === itemFinish &&
              systemExtFinish === itemExtFinish &&
              systemWidth === itemWidth &&
              systemLength === itemLength &&
              systemLocation === itemLocation &&
              systemType === itemType &&
              systemQuality === itemQuality
            );

            if (isMatch && item.has_comparison) {
              const systemQty = item.total_qty || 0; // Use total_qty as the system quantity
              const newVariance = new_counted_qty - systemQty;
              const newStatus = new_counted_qty === systemQty ? 'Match' : 
                               new_counted_qty > systemQty ? 'Over Count' : 'Under Count';
              
              console.log('Updating items_data - found matching item, updating quantity from', item.checker_qty, 'to', new_counted_qty);
              return { 
                ...item, 
                checker_qty: new_counted_qty,
                variance: newVariance,
                status: newStatus
              };
            }
            return item;
          });
          
          // Update the reconciliation record
          const updateReconciliationQuery = `
            UPDATE reconciliation_records 
            SET summary_data = $1, items_data = $2, updated_at = NOW()
            WHERE id = $3
          `;
          
          await pool.query(updateReconciliationQuery, [
            JSON.stringify(summaryData),
            JSON.stringify(updatedItemsData),
            reconciliationRecord.id
          ]);
          
          console.log('Reconciliation record updated successfully with enhanced items_data');
        }
      } catch (error) {
        console.error('Error updating reconciliation record:', error);
        // Don't fail the entire request if reconciliation update fails
      }
    }

    res.json({
      success: true,
      message: "Recheck item completed successfully",
      item: updateResult.rows[0],
      updated_data: {
        form: recheckItem.form,
        grade: recheckItem.grade,
        size: recheckItem.size,
        finish: recheckItem.finish,
        ext_finish: recheckItem.ext_finish,
        width: recheckItem.width,
        length: recheckItem.length,
        location: recheckItem.location,
        mill: recheckItem.mill,
        heat: recheckItem.heat,
        system_qty: recheckItem.system_qty,
        counted_qty: new_counted_qty,
        variance: newVariance
      }
    });

  } catch (error) {
    console.error('Complete recheck item error:', error);
    res.status(500).json({ 
      error: "Failed to complete recheck item",
      details: error.message 
    });
  }
};

// Remove item from recheck
exports.removeFromRecheck = async (req, res) => {
  try {
    const { item_id } = req.params;

    if (!item_id) {
      return res.status(400).json({ 
        error: "Item ID is required" 
      });
    }

    // Delete the recheck item
    const deleteQuery = `
      DELETE FROM recheck_items 
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(deleteQuery, [item_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: "Recheck item not found" 
      });
    }

    res.json({
      success: true,
      message: "Item removed from recheck successfully",
      item: result.rows[0]
    });

  } catch (error) {
    console.error('Remove from recheck error:', error);
    res.status(500).json({ 
      error: "Failed to remove item from recheck",
      details: error.message 
    });
  }
};