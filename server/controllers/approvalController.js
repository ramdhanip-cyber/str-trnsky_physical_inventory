const pool = require("../database/db");
const { runErpSql } = require("../database/erpOdbc");

const normalizeApprovalRequestType = (requestType) => {
  const normalized = String(requestType || '').trim().toUpperCase();
  return ['STANDARD', 'NEW', 'MIXED'].includes(normalized) ? normalized : 'STANDARD';
};

// Save adjustment data for approval (star.str_adj_aprvl and star.str_adj_aprvl_dtl)
exports.saveAdjustmentForApproval = async (req, res) => {
  try {
    const { location_id, adj_name, items, adj_id } = req.body;

    if (!location_id || !adj_name || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Location ID, adjustment name, and items are required"
      });
    }

    console.log('Saving adjustment data for approval:', {
      location_id,
      adj_name,
      itemCount: items.length,
      source_adj_id: adj_id || 'none'
    });

    await pool.query('BEGIN');

    // Insert approval header
    const aprvlInsertQuery = `
      INSERT INTO star.str_adj_aprvl (
        location_id, adj_name, request_type, status, approval_status, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING aprvl_id
    `;

    // Insert approval details
    const detailInsertQuery = `
      INSERT INTO star.str_adj_aprvl_dtl (
        aprvl_id, item_control_no, system_tag_no, form, grade, size, finish, ext_finish,
        width, length, location, mill, heat, quality_standards, type,
        system_qty, counted_qty, variance_qty, adj_qty, cost, amount, cost_uom, adj_res_data,
        adj_typ, is_reserved, is_adjusted, adjust_status, intchg_no
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      )
    `;

    const standardItems = items.filter((item) => String(item.adj_typ || 'QTY').trim().toUpperCase() !== 'NEW');
    const newItems = items.filter((item) => String(item.adj_typ || 'QTY').trim().toUpperCase() === 'NEW');
    const createdApprovals = [];

    const insertApprovalGroup = async (groupItems, requestType) => {
      if (!Array.isArray(groupItems) || groupItems.length === 0) return null;

      const aprvlResult = await pool.query(aprvlInsertQuery, [
        location_id,
        adj_name,
        requestType,
        'In Progress',
        'Under Approval',
        req.user?.full_name || 'System'
      ]);

      const aprvl_id = aprvlResult.rows[0].aprvl_id;
      console.log(`Created ${requestType} approval header with ID:`, aprvl_id);

      for (const item of groupItems) {
        const reservationRows = (() => {
          const d = item.adj_res_data;
          if (Array.isArray(d) && d.length > 0) return d;
          if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.reservations) && d.reservations.length > 0) {
            return d.reservations;
          }
          return [];
        })();
        const is_reserved = reservationRows.length > 0 ? 1 : 0;

        await pool.query(detailInsertQuery, [
          aprvl_id,
          item.item_control_no || null,
          item.system_tag_no || null,
          item.form,
          item.grade,
          item.size,
          item.finish,
          item.ext_finish,
          item.width,
          item.length,
          item.location,
          item.mill || null,
          item.heat || null,
          item.quality_standards || null,
          item.type || null,
          item.system_qty,
          item.counted_qty,
          item.variance_qty,
          item.adj_qty,
          item.cost,
          item.amount,
          item.cost_uom || null,
          item.adj_res_data ? JSON.stringify(item.adj_res_data) : null,
          item.adj_typ || 'QTY',
          is_reserved,
          0,
          'N',
          0
        ]);
      }

      createdApprovals.push({
        aprvl_id,
        request_type: requestType,
        item_count: groupItems.length,
      });

      return aprvl_id;
    };

    const standardAprvlId = await insertApprovalGroup(standardItems, 'STANDARD');
    const newAprvlId = await insertApprovalGroup(newItems, 'NEW');

    await pool.query('COMMIT');

    console.log(`Successfully saved adjustment for approval with ${items.length} items across ${createdApprovals.length} header(s)`);

    res.json({
      success: true,
      data: {
        aprvl_id: standardAprvlId || newAprvlId || null,
        standard_aprvl_id: standardAprvlId || null,
        new_aprvl_id: newAprvlId || null,
        created_approvals: createdApprovals,
        location_id,
        adj_name,
        item_count: items.length,
        status: 'In Progress',
        approval_status: 'Under Approval'
      },
      message: `Adjustment data submitted for approval with ${items.length} items`
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error saving adjustment for approval:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to save adjustment for approval',
      details: error.message
    });
  }
};

// Get approval records list
exports.getApprovalRecords = async (req, res) => {
  try {
    const requestType = normalizeApprovalRequestType(req.query.request_type);
    const result = await pool.query(
      `SELECT a.aprvl_id, a.location_id, l.location_desc, COALESCE(a.request_type, 'STANDARD') AS request_type,
              COALESCE(NULLIF(l.branch, ''), NULLIF(split_part(a.adj_name, '_', 1), '')) AS branch,
              COALESCE(NULLIF(l.warehouse, ''), NULLIF(split_part(a.adj_name, '_', 2), '')) AS warehouse,
              a.adj_name, a.status, a.approval_status, a.created_by, a.created_at, a.updated_at
       FROM star.str_adj_aprvl a
       LEFT JOIN st_locations l ON a.location_id = l.location_id
       WHERE (
         $1 = 'STANDARD' AND COALESCE(a.request_type, 'STANDARD') IN ('STANDARD', 'MIXED')
       ) OR (
         $1 = 'NEW' AND COALESCE(a.request_type, 'STANDARD') = 'NEW'
       ) OR (
         $1 = 'MIXED' AND COALESCE(a.request_type, 'STANDARD') = 'MIXED'
       )
       ORDER BY a.created_at DESC`,
      [requestType]
    );
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error listing approval records:', error);
    res.status(500).json({ success: false, error: 'Failed to list approval records', details: error.message });
  }
};

// Get approval record details by id
exports.getApprovalRecordDetails = async (req, res) => {
  try {
    const { aprvl_id } = req.params;
    if (!aprvl_id) {
      return res.status(400).json({ success: false, error: 'aprvl_id is required' });
    }
    const header = await pool.query(
      `SELECT aprvl_id, location_id, adj_name, COALESCE(request_type, 'STANDARD') AS request_type, status, approval_status, created_by, created_at, updated_at
       FROM star.str_adj_aprvl WHERE aprvl_id = $1`,
      [aprvl_id]
    );
    const details = await pool.query(
      `SELECT aprvl_id, item_control_no, system_tag_no, form, grade, size, finish, ext_finish,
              width, length, location, mill, heat, quality_standards, type,
              system_qty, counted_qty, variance_qty, adj_qty, cost, amount, cost_uom, adj_res_data,
              adj_typ, is_reserved, is_adjusted, adjust_status, intchg_no
       FROM star.str_adj_aprvl_dtl
       WHERE aprvl_id = $1
       ORDER BY system_tag_no NULLS LAST, form, grade, size`,
      [aprvl_id]
    );

    const detailRows = details.rows || [];
    const uniqueIntchgNos = [
      ...new Set(
        detailRows
          .map(row => Number(row.intchg_no))
          .filter(no => Number.isFinite(no) && no > 0)
      )
    ];

    const parseOAuthRows = (payload) => {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload.rows)) return payload.rows;
      if (Array.isArray(payload.data)) return payload.data;
      if (Array.isArray(payload.Data)) return payload.Data;
      if (Array.isArray(payload.result)) return payload.result;
      if (Array.isArray(payload.results)) return payload.results;
      return [];
    };

    const messageMap = {};

    if (uniqueIntchgNos.length > 0) {
      for (const intchgNo of uniqueIntchgNos) {
          const remoteQuery = `
            SELECT DISTINCT msg_err_msg_typ, msg_msg_var
            FROM xcti00_rec
            LEFT OUTER JOIN sctslg_rec ON slg_ssn_log_ctl_no = i00_ssn_log_ctl_no
            LEFT OUTER JOIN sctmsg_rec ON slg_clnt_pid = msg_clnt_pid AND slg_clnt_host_nm = msg_clnt_host_nm AND slg_clnt_pid = msg_clnt_pid
            WHERE i00_intchg_no = ${intchgNo} AND i00_intchg_pfx='XI'
          `;

          try {
            const response = await runErpSql(remoteQuery, { timeoutSeconds: 60 });

            const rows = parseOAuthRows(response);

            if (rows.length > 0) {
              const statusValue =
                rows.find(r => r.msg_err_msg_typ)?.msg_err_msg_typ ||
                rows[0].msg_err_msg_typ ||
                null;
              const reasonValue = rows
                .map(r => r.msg_msg_var)
                .filter(Boolean)
                .join('; ');

              messageMap[intchgNo] = {
                msg_err_msg_typ: statusValue,
                msg_msg_var: reasonValue || null
              };
            } else {
              messageMap[intchgNo] = {
                msg_err_msg_typ: null,
                msg_msg_var: null
              };
            }
          } catch (lookupError) {
            console.error(`Error fetching interchange status for ${intchgNo}:`, lookupError);
            messageMap[intchgNo] = {
              msg_err_msg_typ: null,
              msg_msg_var: null
            };
          }
        }
    }

    const enrichedItems = detailRows.map(item => {
      const intchgNo = Number(item.intchg_no);
      const message = Number.isFinite(intchgNo) && intchgNo > 0 ? messageMap[intchgNo] : null;
      return {
        ...item,
        msg_err_msg_typ: message?.msg_err_msg_typ || null,
        msg_msg_var: message?.msg_msg_var || null
      };
    });

    res.json({ success: true, data: { header: header.rows[0] || null, items: enrichedItems } });
  } catch (error) {
    console.error('Error getting approval record details:', error);
    res.status(500).json({ success: false, error: 'Failed to get approval record details', details: error.message });
  }
};

// Approve adjustment - processes items and updates status
exports.approveAdjustment = async (req, res) => {
  try {
    const { aprvl_id } = req.body;

    if (!aprvl_id) {
      return res.status(400).json({
        success: false,
        error: "Approval ID is required"
      });
    }

    console.log('Approving adjustment:', aprvl_id);

    await pool.query('BEGIN');

    // Get approval details
    const detailsResult = await pool.query(
      `SELECT item_control_no, system_tag_no, variance_qty
       FROM star.str_adj_aprvl_dtl
       WHERE aprvl_id = $1`,
      [aprvl_id]
    );

    if (detailsResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: "No items found for this approval record"
      });
    }

    // Prepare items for processing
    const items = detailsResult.rows.map(row => ({
      item_control_no: row.item_control_no || undefined,
      system_tag_no: row.system_tag_no || undefined,
      variance_qty: row.variance_qty || 0
    }));

    // Process items into system tables (this will be called from frontend separately)
    // For now, just update the status
    await pool.query(
      `UPDATE star.str_adj_aprvl
       SET status = 'Adjusting Items', approval_status = 'Approved', updated_at = CURRENT_TIMESTAMP
       WHERE aprvl_id = $1`,
      [aprvl_id]
    );

    await pool.query('COMMIT');

    res.json({
      success: true,
      data: {
        aprvl_id,
        items: items,
        item_count: items.length
      },
      message: `Approval record updated. Ready to process ${items.length} items.`
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error approving adjustment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve adjustment',
      details: error.message
    });
  }
};

// Reject adjustment - updates status
exports.rejectAdjustment = async (req, res) => {
  try {
    const { aprvl_id, rejection_reason } = req.body;

    if (!aprvl_id) {
      return res.status(400).json({
        success: false,
        error: "Approval ID is required"
      });
    }

    await pool.query(
      `UPDATE star.str_adj_aprvl
       SET approval_status = 'Rejected', status = 'Rejected', updated_at = CURRENT_TIMESTAMP
       WHERE aprvl_id = $1`,
      [aprvl_id]
    );

    res.json({
      success: true,
      data: { aprvl_id },
      message: 'Adjustment rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting adjustment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject adjustment',
      details: error.message
    });
  }
};

// Process adjustment items into system tables (xcti28_rec, xcti29_rec, xcti30_rec, xcti00_rec)
exports.processAdjustmentItems = async (req, res) => {
  try {
    const { items, aprvl_id, lgnId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Items array is required and must not be empty"
      });
    }

    const resolvedLgnId = String(lgnId || '').trim();
    if (!resolvedLgnId) {
      return res.status(400).json({
        success: false,
        error: "lgnId is required to process QTY/AMT adjustments"
      });
    }

    console.log(`Processing ${items.length} adjustment items into system tables${aprvl_id ? ` for approval ID: ${aprvl_id}` : ''} as user ${resolvedLgnId}`);

    // Helper function to escape SQL strings
    const escapeSQL = (value) => {
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }
      return value;
    };

    // Helper function to execute SQL via ERP pool (same shape as legacy OAuth API)
    const executeSQL = async (sql) => {
      const result = await runErpSql(sql, { timeoutSeconds: 60 });
      console.log('ERP SQL result rows:', result?.Data?.length ?? 0);
      return result;
    };

    try {
      const processedItems = [];

      // Process each item individually - each gets its own maxCtlNum
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`Processing item ${i + 1} of ${items.length}: ${item.item_control_no || 'N/A'}`);

        // Step 1: Get maxCtlNum from xcti00_rec for this item
        const maxCtlNumQuery = `
          SELECT COALESCE(MAX(i00_intchg_no), 0) + 1 as maxCtlNum
          FROM xcti00_rec
        `;

        const maxCtlNumResult = await executeSQL(maxCtlNumQuery);

        // Log the full response for debugging
        console.log(`Item ${i + 1} - maxCtlNumResult full response:`, JSON.stringify(maxCtlNumResult, null, 2));

        // Handle different response structures from OAuth API
        let maxCtlNum;
        if (maxCtlNumResult.Data && Array.isArray(maxCtlNumResult.Data) && maxCtlNumResult.Data.length > 0) {
          maxCtlNum = maxCtlNumResult.Data[0].maxCtlNum || maxCtlNumResult.Data[0].maxctlnum;
        } else if (maxCtlNumResult.data && Array.isArray(maxCtlNumResult.data) && maxCtlNumResult.data.length > 0) {
          maxCtlNum = maxCtlNumResult.data[0].maxCtlNum || maxCtlNumResult.data[0].maxctlnum;
        } else if (Array.isArray(maxCtlNumResult) && maxCtlNumResult.length > 0) {
          maxCtlNum = maxCtlNumResult[0].maxCtlNum || maxCtlNumResult[0].maxctlnum;
        } else if (maxCtlNumResult.maxCtlNum !== undefined) {
          maxCtlNum = maxCtlNumResult.maxCtlNum;
        } else if (maxCtlNumResult.maxctlnum !== undefined) {
          maxCtlNum = maxCtlNumResult.maxctlnum;
        }

        // Convert to number if it's a string
        maxCtlNum = maxCtlNum ? Number(maxCtlNum) : null;

        console.log(`Item ${i + 1} - Generated maxCtlNum:`, maxCtlNum);
        console.log(`Item ${i + 1} - maxCtlNum type:`, typeof maxCtlNum);

        if (!maxCtlNum || maxCtlNum <= 0 || isNaN(maxCtlNum)) {
          throw new Error(`Item ${i + 1}: Failed to generate adjustment control number. Got: ${maxCtlNum}, Result structure: ${JSON.stringify(maxCtlNumResult)}`);
        }

        // Step 2: Insert into xcti00_rec (header - one per item)
        const i00InsertQuery = `
          INSERT INTO xcti00_rec (
            i00_cmpy_id, i00_intchg_pfx, i00_intchg_no, i00_evnt, i00_usr_id,
            i00_crtd_dtts, i00_crtd_dtms, i00_upd_dtts, i00_upd_dtms,
            i00_sts_cd, i00_ssn_log_ctl_no, i00_intrf_cl
          ) VALUES (
            'SSS', 'XI', ${maxCtlNum}, 'PRG', ${escapeSQL(resolvedLgnId)},
            NOW(), 0, NULL, 0, 'N', 0, 'E'
          )
        `;

        await executeSQL(i00InsertQuery);
        console.log(`Item ${i + 1} - Inserted into xcti00_rec with maxCtlNum: ${maxCtlNum}`);

        // Determine adjustment type (default to QTY if not specified)
        const adjType = (item.adj_typ || 'QTY').toUpperCase();
        const isAmtAdjustment = adjType === 'AMT';
        const isNewAdjustment = adjType === 'NEW';

        // Step 3: Insert into xcti29_rec (adjustment header - one per item)
        // Keep system adjustment code as existing mappings:
        // AMT -> 07, QTY/NEW -> 06
        const i29AdjType = isAmtAdjustment ? '07' : '06';
        const i29AdjRmk = isAmtAdjustment
          ? 'Correction for Amount'
          : (isNewAdjustment ? 'New orphaned item adjustment' : 'Change in quantity');

        const i29InsertQuery = `
          INSERT INTO xcti29_rec (
            i29_cmpy_id, i29_intchg_pfx, i29_intchg_no, i29_intchg_itm,
            i29_crtd_dtts, i29_crtd_dtms, i29_upd_dtts, i29_upd_dtms,
            i29_adj_typ, i29_adj_rsn, i29_adj_rmk,
            i29_init_pfx, i29_init_no, i29_init_itm, i29_init_sitm, i29_sts_cd
          ) VALUES (
            'SSS', 'XI', ${maxCtlNum}, 1,
            NOW(), NULL, NULL, NULL,
            '${i29AdjType}', 'IAJ', ${escapeSQL(i29AdjRmk)},
            '', 0, 0, 0, 'N'
          )
        `;

        await executeSQL(i29InsertQuery);
        console.log(`Item ${i + 1} - Inserted into xcti29_rec with maxCtlNum: ${maxCtlNum}, adj_type: ${adjType}`);

        // Step 4: Insert into xcti28_rec for this item
        // i28_itm_ctl_no / i28_tag_no are numeric in Stratix schema.
        // Guard against placeholders like "-" to avoid numeric cast errors.
        const toNumericLiteral = (value, fallback = 0) => {
          const raw = String(value ?? '').trim();
          if (!raw || raw === '-') return String(fallback);
          const num = Number(raw);
          return Number.isFinite(num) ? String(num) : String(fallback);
        };

        const tagNo = toNumericLiteral(item.system_tag_no, 0);
        const itemControlNo = toNumericLiteral(item.item_control_no, 0);
        const toNumber = (value) => {
          const n = Number(value);
          return Number.isFinite(n) ? n : 0;
        };
        const varianceQty = toNumber(item.variance_qty);
        const adjQty = toNumber(item.adj_qty);
        const countedQty = toNumber(item.counted_qty);
        const systemQty = toNumber(item.system_qty);

        const i28InsertQuery = `
          INSERT INTO xcti28_rec (
            i28_cmpy_id, i28_intchg_pfx, i28_intchg_no, i28_itm_ctl_no,
            i28_tag_no, i28_mrg_ctl_no, i28_trnt_pfx, i28_trnt_no, i28_trnt_itm, i28_trnt_sbitm, i28_trnt_seq_no
          ) VALUES (
            'SSS', 'XI', ${maxCtlNum}, ${itemControlNo}, ${tagNo}, 0, '', 0,0,0,0
          )
        `;

        await executeSQL(i28InsertQuery);
        console.log(`Item ${i + 1} - Inserted into xcti28_rec with maxCtlNum: ${maxCtlNum}`);

        // Step 5: Insert into xcti30_rec for this item
        // Different values for AMT/QTY/NEW adjustments.
        // Requirement:
        // - NEW  -> use adj_qty only (no fallback)
        // - QTY  -> keep variance_qty behavior
        // - AMT  -> no qty change
        const newAmount = item.amount || 0;
        const ohdPcs = isAmtAdjustment ? 0 : (isNewAdjustment ? adjQty : varianceQty); // NEW strict adj_qty
        const ohdMatVal = (isAmtAdjustment || isNewAdjustment) ? newAmount : 0; // NEW carries amount + qty
        console.log(
          `Item ${i + 1} qty mapping => adj_typ=${adjType}, adj_qty=${adjQty}, variance_qty=${varianceQty}, counted_qty=${countedQty}, system_qty=${systemQty}, i30_ohd_pcs=${ohdPcs} (NEW uses adj_qty only)`
        );

        const i30InsertQuery = `
          INSERT INTO xcti30_rec (
            i30_cmpy_id, i30_intchg_pfx, i30_intchg_no, i30_intchg_itm,
            i30_frm, i30_grd, i30_size, i30_fnsh, i30_ef_evar,
            i30_wdth, i30_lgth, i30_dim_dsgn, i30_idia, i30_odia, i30_ga_size, i30_ga_typ,
            i30_rdm_dim_1, i30_rdm_dim_2, i30_rdm_dim_3, i30_rdm_dim_4, i30_rdm_dim_5, i30_rdm_dim_6, i30_rdm_dim_7, i30_rdm_dim_8,
            i30_mill, i30_heat, i30_tag_no, i30_loc,
            i30_ohd_pcs, i30_ohd_msr, i30_ohd_wgt, i30_ohd_mat_val,
            i30_bgt_for, i30_bgt_for_id, i30_brh, i30_invt_typ, i30_invt_qlty,
            i30_rjct_rsn, i30_rjct_dt, i30_rjct_lgn_id, i30_rjct_rmk,
            i30_prod_cus_id, i30_prod_part, i30_prod_revno,
            i30_bgt_as_ven_id, i30_bgt_as_part, i30_pkg, i30_skd_typ, i30_skd_wgt,
            i30_cut_no, i30_id, i30_od, i30_coil_lgth, i30_coil_lgth_typ, i30_part_coil_indc,
            i30_fc_wdth,
            i30_act_wdth_1, i30_act_wdth_2, i30_act_lgth_1, i30_act_lgth_2, i30_act_idia_1, i30_act_idia_2, i30_act_odia_1, i30_act_odia_2,
            i30_act_ga_1, i30_act_ga_2, i30_act_diag_1, i30_act_diag_2,
            i30_act_sq, i30_act_fltns_1, i30_act_fltns_2,
            i30_mill_id, i30_thpty_id, i30_cus_tag_no
          ) VALUES (
            'SSS', 'XI', ${maxCtlNum}, 1,
            '', '', '', '', '',
            0, 0, '', 0, 0, 0, '',
            0, 0, 0, 0, 0, 0, 0, 0,
            '', '', '', '',
            ${ohdPcs}, 0, 0, ${ohdMatVal},
            '', '', '', '', '',
            '', NULL, '', '',
            '', '', '',
            '', '', '', '', 0,
            '', 0, 0, 0, '', 0,
            0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0,
            '', '', ''
          )
        `;

        await executeSQL(i30InsertQuery);
        console.log(`Item ${i + 1} - Inserted into xcti30_rec with maxCtlNum: ${maxCtlNum}, adj_type: ${adjType}, amount: ${ohdMatVal}`);

        // Track processed item
        processedItems.push({
          item_control_no: item.item_control_no || 'N/A',
          system_tag_no: item.system_tag_no || 'N/A',
          intchg_no: maxCtlNum,
          adj_typ: item.adj_typ || 'QTY' // Include adj_typ for proper matching
        });

        // If aprvl_id is provided, update the intchg_no in star.str_adj_aprvl_dtl
        if (aprvl_id) {
          try {
            // Build a more flexible matching query
            // IMPORTANT: Include adj_typ in matching to ensure QTY and AMT adjustments are treated as separate line items
            let updateQuery;
            let queryParams;

            const itemControlNo = item.item_control_no || null;
            const systemTagNo = item.system_tag_no || null;
            const varianceQty = item.variance_qty || 0;
            const itemAdjTyp = item.adj_typ || 'QTY';

            // Try to match by item_control_no + adj_typ first (most reliable)
            if (itemControlNo) {
              updateQuery = `
                UPDATE star.str_adj_aprvl_dtl
                SET intchg_no = $1, is_adjusted = 1, adjust_status = 'Y'
                WHERE aprvl_id = $2
                  AND item_control_no = $3
                  AND adj_typ = $4
                  AND intchg_no = 0
              `;
              queryParams = [maxCtlNum, aprvl_id, itemControlNo, itemAdjTyp];
            }
            // Fallback to system_tag_no + adj_typ if item_control_no is not available
            else if (systemTagNo) {
              updateQuery = `
                UPDATE star.str_adj_aprvl_dtl
                SET intchg_no = $1, is_adjusted = 1, adjust_status = 'Y'
                WHERE aprvl_id = $2
                  AND system_tag_no = $3
                  AND adj_typ = $4
                  AND (item_control_no IS NULL OR item_control_no = '')
                  AND intchg_no = 0
              `;
              queryParams = [maxCtlNum, aprvl_id, systemTagNo, itemAdjTyp];
            }
            // Last resort: match by variance_qty + adj_typ (less reliable but better than nothing)
            else {
              updateQuery = `
                UPDATE star.str_adj_aprvl_dtl
                SET intchg_no = $1, is_adjusted = 1, adjust_status = 'Y'
                WHERE aprvl_id = $2
                  AND variance_qty = $3
                  AND adj_typ = $4
                  AND intchg_no = 0
              `;
              queryParams = [maxCtlNum, aprvl_id, varianceQty, itemAdjTyp];
            }

            if (updateQuery) {
              const result = await pool.query(updateQuery, queryParams);
              if (result.rowCount > 0) {
                console.log(`Item ${i + 1} - Updated intchg_no (${maxCtlNum}) in star.str_adj_aprvl_dtl for aprvl_id: ${aprvl_id}, adj_typ: ${itemAdjTyp}`);
              } else {
                console.warn(`Item ${i + 1} - No matching record found in star.str_adj_aprvl_dtl to update intchg_no (adj_typ: ${itemAdjTyp})`);
              }
            }
          } catch (updateError) {
            console.error(`Item ${i + 1} - Error updating intchg_no in approval detail:`, updateError);
            // Don't throw - continue processing other items
          }
        }

        console.log(`Item ${i + 1} (${item.item_control_no || 'N/A'}) completed with maxCtlNum: ${maxCtlNum}`);
      }

      console.log(`Successfully processed ${items.length} adjustment items`);

      // Fetch status and reason for all processed interchange numbers
      const intchgNos = processedItems.map(p => p.intchg_no).filter(n => n && n > 0);
      const statusReasonMap = {};

      if (intchgNos.length > 0) {
        const parseOAuthRows = (payload) => {
          if (!payload) return [];
          if (Array.isArray(payload)) return payload;
          if (Array.isArray(payload.rows)) return payload.rows;
          if (Array.isArray(payload.data)) return payload.data;
          if (Array.isArray(payload.Data)) return payload.Data;
          if (Array.isArray(payload.result)) return payload.result;
          if (Array.isArray(payload.results)) return payload.results;
          return [];
        };

        // Add a small delay to allow the database to process the inserts
        await new Promise(resolve => setTimeout(resolve, 1000));

        for (const intchgNo of intchgNos) {
          const remoteQuery = `
            SELECT DISTINCT msg_err_msg_typ, msg_msg_var
            FROM xcti00_rec
            LEFT OUTER JOIN sctslg_rec ON slg_ssn_log_ctl_no = i00_ssn_log_ctl_no
            LEFT OUTER JOIN sctmsg_rec ON slg_clnt_pid = msg_clnt_pid AND slg_clnt_host_nm = msg_clnt_host_nm AND slg_clnt_pid = msg_clnt_pid
            WHERE i00_intchg_no = ${intchgNo} AND i00_intchg_pfx='XI'
          `;

          try {
            const response = await runErpSql(remoteQuery, { timeoutSeconds: 60 });

            const rows = parseOAuthRows(response);

            if (rows.length > 0) {
              const statusValue =
                rows.find(r => r.msg_err_msg_typ)?.msg_err_msg_typ ||
                rows[0].msg_err_msg_typ ||
                null;
              const reasonValue = rows
                .map(r => r.msg_msg_var)
                .filter(Boolean)
                .join('; ');

              statusReasonMap[intchgNo] = {
                msg_err_msg_typ: statusValue,
                msg_msg_var: reasonValue || null
              };
            } else {
              statusReasonMap[intchgNo] = {
                msg_err_msg_typ: null,
                msg_msg_var: null
              };
            }
          } catch (lookupError) {
            console.error(`Error fetching interchange status for ${intchgNo}:`, lookupError);
            statusReasonMap[intchgNo] = {
              msg_err_msg_typ: null,
              msg_msg_var: null
            };
          }
        }
      }

      // Enrich processed items with status and reason
      const enrichedProcessedItems = processedItems.map(item => ({
        ...item,
        msg_err_msg_typ: statusReasonMap[item.intchg_no]?.msg_err_msg_typ || null,
        msg_msg_var: statusReasonMap[item.intchg_no]?.msg_msg_var || null
      }));

      res.json({
        success: true,
        data: {
          processed_items: enrichedProcessedItems,
          item_count: items.length,
          status_reason_map: statusReasonMap
        },
        message: `Successfully processed ${items.length} adjustment items into system tables. Each item has its own control number.`
      });

    } catch (error) {
      console.error('Error processing adjustment items:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error processing adjustment items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process adjustment items',
      details: error.message
    });
  }
};

// List adjustment headers
exports.listAdjustments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT adj_id, location_id, adj_name, status, created_by, created_at, updated_at
       FROM str_phy_adj
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error listing adjustments:', error);
    res.status(500).json({ success: false, error: 'Failed to list adjustments', details: error.message });
  }
};

// Get adjustment details by header id
exports.getAdjustmentDetails = async (req, res) => {
  try {
    const { adj_id } = req.params;
    if (!adj_id) {
      return res.status(400).json({ success: false, error: 'adj_id is required' });
    }
    const header = await pool.query(
      `SELECT adj_id, location_id, adj_name, status, created_by, created_at, updated_at
       FROM str_phy_adj WHERE adj_id = $1`,
      [adj_id]
    );
    const details = await pool.query(
      `SELECT adj_id, item_control_no, system_tag_no, form, grade, size, finish, ext_finish,
              width, length, location, mill, heat, quality_standards, type,
              system_qty, counted_qty, variance_qty, adj_qty, cost, amount, cost_uom, adj_res_data
       FROM str_phy_adj_dtl
       WHERE adj_id = $1
       ORDER BY system_tag_no NULLS LAST, form, grade, size`,
      [adj_id]
    );
    res.json({ success: true, data: { header: header.rows[0] || null, items: details.rows } });
  } catch (error) {
    console.error('Error getting adjustment details:', error);
    res.status(500).json({ success: false, error: 'Failed to get adjustment details', details: error.message });
  }
};

// Get unit of measure options (for adjustment cost dialog)
