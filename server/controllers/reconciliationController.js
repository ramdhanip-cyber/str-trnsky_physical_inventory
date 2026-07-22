const pool = require("../database/db");
const { runErpSql } = require("../database/erpOdbc");

// Quality standards mapping - shared across all functions
const qualityCodeToDescription = {
  '-': 'Prime',
  'C': 'Claim',
  'R': 'Reject',
  'S': 'Scrap',
  'Y': 'Secondary',
  'P': 'Processing',
  'X': 'Special Buy',
  'Z': 'Write Down',
  'B': 'Buyout',
  'G': 'BERG Pipe',
  'U': 'Used',
  'J': 'ReJect',
  'M': 'Mill Claim',
  'E': 'Price Protct Ex',
  'A': 'Pre-Bill Collec',
  'T': 'Solar 0 Value',
  'N': 'NZ Write Down',
  'O': 'Over-roll NZ'
};

// Reverse mapping - descriptions to codes (for bidirectional lookup)
const qualityDescriptionToCode = {};
Object.entries(qualityCodeToDescription).forEach(([code, desc]) => {
  qualityDescriptionToCode[desc.toLowerCase()] = code;
  // Also handle variations
  if (desc === 'ReJect') {
    qualityDescriptionToCode['reject'] = code;
  }
  if (desc === 'Mill Claim') {
    qualityDescriptionToCode['millclaim'] = code;
    qualityDescriptionToCode['mill claim'] = code;
  }
  if (desc === 'Special Buy') {
    qualityDescriptionToCode['specialbuy'] = code;
    qualityDescriptionToCode['special buy'] = code;
  }
  if (desc === 'Write Down') {
    qualityDescriptionToCode['writedown'] = code;
    qualityDescriptionToCode['write down'] = code;
  }
  if (desc === 'Price Protct Ex') {
    qualityDescriptionToCode['price protct ex'] = code;
    qualityDescriptionToCode['priceprotected'] = code;
  }
  if (desc === 'Pre-Bill Collec') {
    qualityDescriptionToCode['pre-bill collec'] = code;
    qualityDescriptionToCode['prebill'] = code;
  }
  if (desc === 'Solar 0 Value') {
    qualityDescriptionToCode['solar 0 value'] = code;
    qualityDescriptionToCode['solar'] = code;
  }
  if (desc === 'NZ Write Down') {
    qualityDescriptionToCode['nz write down'] = code;
    qualityDescriptionToCode['nzwritedown'] = code;
  }
  if (desc === 'Over-roll NZ') {
    qualityDescriptionToCode['over-roll nz'] = code;
    qualityDescriptionToCode['overroll'] = code;
  }
});

// Normalize quality value - converts both codes and descriptions to normalized description format
// This handles the case where system has codes (like '-', 'C', 'R') and counted has descriptions (like 'Prime', 'Claim', 'Reject')
const normalizeQuality = (quality) => {
  // Handle empty, null, undefined, and dash values - all should normalize to 'Prime'
  if (!quality || quality === '' || quality === '-' || quality === null || quality === undefined) {
    return 'Prime'; // Default to Prime for empty values
  }

  const qualityStr = String(quality).trim();

  // If after trimming it's empty or dash, return Prime
  if (qualityStr === '' || qualityStr === '-') {
    return 'Prime';
  }

  // First check if it's a code (single character or '-')
  if (qualityCodeToDescription[qualityStr]) {
    return qualityCodeToDescription[qualityStr];
  }

  // Check if it's a description (case-insensitive)
  const qualityLower = qualityStr.toLowerCase();
  if (qualityDescriptionToCode[qualityLower]) {
    // It's a description, convert to code then back to description for normalization
    const code = qualityDescriptionToCode[qualityLower];
    return qualityCodeToDescription[code];
  }

  // Check for partial matches in descriptions
  for (const [code, desc] of Object.entries(qualityCodeToDescription)) {
    const descLower = desc.toLowerCase();
    if (qualityLower.includes(descLower) || descLower.includes(qualityLower)) {
      return desc; // Return normalized description
    }
  }

  // If no match found, return the original value (but this shouldn't happen in normal cases)
  return qualityStr;
};

// Default list of fields used for matching system vs counted (order matters for key consistency)
const DEFAULT_COMPARE_FIELDS = ['sys_tag_no', 'form', 'grade', 'size', 'finish', 'ext_finish', 'width', 'length', 'location', 'mill', 'heat', 'type', 'quality'];

exports.reconcileInventory = async (req, res) => {
  try {
    const { location_id, warehouse, branch, role, compare_fields } = req.body;
    const compareFields = Array.isArray(compare_fields) && compare_fields.length > 0
      ? compare_fields.filter(f => DEFAULT_COMPARE_FIELDS.includes(f))
      : DEFAULT_COMPARE_FIELDS;

    const includeTagNo = compareFields.includes('sys_tag_no');
    const includeLocation = compareFields.includes('location');
    const includeMill = compareFields.includes('mill');
    const includeHeat = compareFields.includes('heat');
    const includeType = compareFields.includes('type');
    const includeQuality = compareFields.includes('quality');

    console.log('Reconciliation request:', {
      location_id,
      warehouse,
      branch,
      role,
      compare_fields: compareFields,
      includeTagNo,
      includeLocation,
      includeMill,
      includeHeat,
      includeType,
      includeQuality
    });

    if (!location_id || !warehouse) {
      return res.status(400).json({ error: "Location ID and warehouse are required" });
    }

    // Default to 'Counter' if role is not specified
    const transactionRole = role || 'Counter';
    console.log('Using transaction role for comparison:', transactionRole);

    // Get assigned forms (items) for this location so we only reconcile those forms
    let formFilterClause = '';
    try {
      const assignedItemsResult = await pool.query(
        'SELECT DISTINCT item_name FROM assigned_items WHERE location_id = $1',
        [location_id]
      );
      const assignedForms = (assignedItemsResult.rows || [])
        .map((row) => row.item_name)
        .filter((name) => name != null && String(name).trim() !== '');
      if (assignedForms.length > 0) {
        const escapedForms = assignedForms.map((f) => `'${String(f).replace(/'/g, "''")}'`);
        formFilterClause = ` AND prd_frm IN (${escapedForms.join(', ')})`;
        console.log('Reconciliation filtered by assigned forms for location:', location_id, assignedForms);
      }
    } catch (assignedErr) {
      console.warn('Could not fetch assigned items for location', location_id, assignedErr.message);
      // Proceed without form filter
    }

    // Build dynamic SELECT and GROUP BY based on which comparison fields the user chose.
    // Excluded fields still appear in SELECT via MIN() so they remain visible in results.
    const systemSelectParts = [
      includeTagNo ? 'prd_tag_no as sys_tag_no' : 'MIN(prd_tag_no) as sys_tag_no',
      'prd_frm as form',
      'prd_grd as grade',
      'prd_size as size',
      'prd_fnsh as finish',
      'prd_ef_svar as ext_finish',
      'prd_wdth as width',
      'prd_lgth as length',
      includeLocation ? 'prd_loc as location' : 'MIN(prd_loc) as location',
      includeMill ? 'prd_mill as mill' : 'MIN(prd_mill) as mill',
      includeHeat ? 'prd_heat as heat' : 'MIN(prd_heat) as heat',
      'sum(prd_ohd_wgt) as weight',
      'prd_brh as branch',
      'prd_whs as warehouse',
      includeType ? 'prd_invt_typ as inv_type' : 'MIN(prd_invt_typ) as inv_type',
      includeQuality ? 'prd_invt_qlty as inv_quality' : 'MIN(prd_invt_qlty) as inv_quality',
      'COUNT(*) as system_combined_count',
      'MAX(prd_tag_no) as max_sys_tag_no',
      'CAST(sum(prd_ohd_qty) AS INTEGER) as system_qty',
      'CAST(sum(COALESCE(prd_ohd_pcs, prd_ohd_qty)) AS INTEGER) as total_qty',
      "round(case when sum(prd_ohd_mat_val) = 0 then sum(prd_ohd_qty*(acp_tot_mat_val/nullif(acp_tot_wgt,0))) else sum(prd_ohd_mat_val) end,2) as prd_ohd_mat_val",
      "round((case when sum(prd_ohd_mat_val) = 0 then sum(prd_ohd_qty*(acp_tot_mat_val/nullif(acp_tot_wgt,0))) else sum(prd_ohd_mat_val) end/nullif(sum(prd_ohd_qty),0))*100,2) as prd_ohd_mat_cst"
    ];

    const systemGroupByParts = [
      ...(includeTagNo ? ['sys_tag_no'] : []),
      'form',
      'grade',
      'size',
      'finish',
      'ext_finish',
      'width',
      'length',
      ...(includeLocation ? ['location'] : []),
      ...(includeMill ? ['mill'] : []),
      ...(includeHeat ? ['heat'] : []),
      'branch',
      'warehouse',
      ...(includeType ? ['inv_type'] : []),
      ...(includeQuality ? ['inv_quality'] : [])
    ];

    const query = `
      select * from (SELECT 
        ${systemSelectParts.join(',\n        ')}
      FROM intprd_rec 
      LEFT JOIN intacp_rec
      ON prd_cmpy_id = acp_cmpy_id
      AND prd_avg_cst_pool = acp_avg_cst_pool
      WHERE prd_whs = '${warehouse}' AND prd_invt_sts = 'S'${formFilterClause}
      GROUP BY ${systemGroupByParts.join(', ')}) as tst
      ORDER BY form ASC, size ASC
    `;

    console.log('Executing query:', query);

    const response = { data: await runErpSql(query, { timeoutSeconds: 60 }) };

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

    // Fetch raw (non-grouped) system rows so UI can show exactly which system items were combined.
    const systemDetailsQuery = `
      SELECT
        prd_tag_no as sys_tag_no,
        prd_frm as form,
        prd_grd as grade,
        prd_size as size,
        prd_fnsh as finish,
        prd_ef_svar as ext_finish,
        prd_wdth as width,
        prd_lgth as length,
        prd_loc as location,
        prd_mill as mill,
        prd_heat as heat,
        prd_invt_typ as inv_type,
        prd_invt_qlty as inv_quality,
        CAST(COALESCE(prd_ohd_pcs, prd_ohd_qty) AS INTEGER) as total_qty
      FROM intprd_rec
      WHERE prd_whs = '${warehouse}' AND prd_invt_sts = 'S'${formFilterClause}
      ORDER BY prd_frm ASC, prd_size ASC
    `;

    const systemDetailsResponse = { data: await runErpSql(systemDetailsQuery, { timeoutSeconds: 60 }) };

    let systemDetailData = [];
    if (systemDetailsResponse.data && Array.isArray(systemDetailsResponse.data)) {
      systemDetailData = systemDetailsResponse.data;
    } else if (systemDetailsResponse.data && systemDetailsResponse.data.rows && Array.isArray(systemDetailsResponse.data.rows)) {
      systemDetailData = systemDetailsResponse.data.rows;
    } else if (systemDetailsResponse.data && systemDetailsResponse.data.data && Array.isArray(systemDetailsResponse.data.data)) {
      systemDetailData = systemDetailsResponse.data.data;
    } else if (systemDetailsResponse.data && systemDetailsResponse.data.Data && Array.isArray(systemDetailsResponse.data.Data)) {
      systemDetailData = systemDetailsResponse.data.Data;
    }
    console.log('Extracted raw system detail rows count:', systemDetailData.length);

    // Legacy function for backward compatibility
    const mapQualityStandards = (quality) => {
      return normalizeQuality(quality);
    };

    // Build dynamic counter query – exclude fields from GROUP BY when not in comparison,
    // but still SELECT them via MIN() so values remain visible.
    const counterSelectParts = [
      includeTagNo ? 't.sys_tag_no' : 'MIN(t.sys_tag_no) as sys_tag_no',
      't.form',
      't.grade',
      't.size',
      't.finish',
      't.ext_finish',
      't.width',
      't.length',
      includeMill ? 't.mill' : 'MIN(t.mill) as mill',
      includeHeat ? 't.heat' : 'MIN(t.heat) as heat',
      includeLocation ? 't.location' : 'MIN(t.location) as location',
      includeType ? 't.type' : 'MIN(t.type) as type',
      'SUM(t.qty) as counted_qty'
    ];
    const counterGroupByParts = [
      ...(includeTagNo ? ['t.sys_tag_no'] : []),
      't.form',
      't.grade',
      't.size',
      't.finish',
      't.ext_finish',
      't.width',
      't.length',
      ...(includeMill ? ['t.mill'] : []),
      ...(includeHeat ? ['t.heat'] : []),
      ...(includeLocation ? ['t.location'] : []),
      ...(includeType ? ['t.type'] : [])
    ];

    const transactionsQuery = `
      SELECT ${counterSelectParts.join(', ')}
      FROM transactions t
      WHERE t.location_id = $1 
        AND t.role = $2
      GROUP BY ${counterGroupByParts.join(', ')}
    `;

    const transactionsResult = await pool.query(transactionsQuery, [location_id, transactionRole]);
    const counterTransactions = transactionsResult.rows;

    console.log(`${transactionRole} transactions count:`, counterTransactions.length);
    if (counterTransactions.length > 0) {
      console.log(`Sample ${transactionRole} transaction:`, counterTransactions[0]);
    }

    // Normalize numeric for width/length
    const normalizeNumeric = (value) => {
      if (value === null || value === undefined || value === '') return '';
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return String(value).trim();
      return numValue === 0 ? '0' : numValue.toFixed(4);
    };
    const normalizeMillHeat = (value) => {
      if (!value || value === '' || value === '-' || value === null || value === undefined) return '';
      return String(value).trim().toUpperCase();
    };

    // Normalize length for comparison:
    // - Counter/counted lengths are already in feet -> never convert.
    // - System length is converted from inches only when it clearly looks like inches.
    const normalizeLength = (rawValue, source) => {
      if (rawValue === null || rawValue === undefined || rawValue === '') return '';
      const num = parseFloat(rawValue);
      if (isNaN(num)) return String(rawValue).trim();
      if (num === 0) return '0';

      // Heuristic: values over 100 are very likely inches (e.g. 240 => 20 ft).
      // Keep smaller values as-is to avoid converting feet a second time.
      const normalized = source === 'system' && num > 100 ? num / 12 : num;
      return normalized.toFixed(4);
    };

    // Build comparison key from selected fields only
    const getFieldValue = (item, source, fieldName) => {
      switch (fieldName) {
        case 'sys_tag_no':
          return (item.sys_tag_no || item.prd_tag_no || item.tag_no || item.sys_tag_id || '').toString().trim().toUpperCase();
        case 'form':
          return (item.form || '').toString().trim().toUpperCase();
        case 'grade':
          return (item.grade || '').toString().trim().toUpperCase();
        case 'size':
          return (item.size || '').toString().trim().toUpperCase();
        case 'finish':
          return (item.finish || '').toString().trim().toUpperCase();
        case 'ext_finish':
          return (item.ext_finish || '').toString().trim().toUpperCase();
        case 'width':
          return normalizeNumeric(item.width);
        case 'length': {
          return normalizeLength(item.length, source);
        }
        case 'location':
          return (item.location || '').toString().trim().toUpperCase();
        case 'mill':
          return normalizeMillHeat(item.mill);
        case 'heat':
          return normalizeMillHeat(item.heat);
        case 'type':
          return (source === 'system' ? (item.inv_type || '') : (item.type || '')).toString().trim().toUpperCase();
        case 'quality': {
          const qualityValue = source === 'system' ? (item.inv_quality || '') : (item.remarks || '');
          return normalizeQuality(qualityValue).toString().trim().toUpperCase();
        }
        default:
          return '';
      }
    };

    const createComparisonKey = (item, source = 'system') => {
      return compareFields.map(f => getFieldValue(item, source, f)).join('|');
    };

    // Build a map of combined raw system rows by comparison key for UI drill-down.
    const systemCombinedMap = {};
    systemDetailData.forEach((sysRow) => {
      const key = createComparisonKey(sysRow, 'system');
      if (!systemCombinedMap[key]) {
        systemCombinedMap[key] = [];
      }
      systemCombinedMap[key].push({
        sys_tag_no: sysRow.sys_tag_no || null,
        form: sysRow.form || null,
        grade: sysRow.grade || null,
        size: sysRow.size || null,
        finish: sysRow.finish || null,
        ext_finish: sysRow.ext_finish || null,
        width: sysRow.width || null,
        length: sysRow.length || null,
        location: sysRow.location || null,
        mill: sysRow.mill || null,
        heat: sysRow.heat || null,
        inv_type: sysRow.inv_type || null,
        inv_quality: sysRow.inv_quality || null,
        qty: parseInt(sysRow.total_qty) || 0
      });
    });

    // Build a map of counter transactions for quick lookup
    const counterMap = {};
    counterTransactions.forEach(transaction => {
      const key = createComparisonKey(transaction, 'counter');
      if (!counterMap[key]) {
        counterMap[key] = [];
      }
      counterMap[key].push(transaction);
      console.log(`Counter key: ${key}, qty: ${transaction.counted_qty}`);
    });

    console.log('Counter map keys:', Object.keys(counterMap).length);

    // Transform and compare the data
    const transformedData = data.map(item => {
      const key = createComparisonKey(item);
      console.log(`System key: ${key}`);
      const systemCombinedItems = systemCombinedMap[key] || [];

      const counterTransactions = counterMap[key];
      // Sum all counted quantities for this key (might have multiple entries due to different mill/heat)
      const countedQty = counterTransactions ?
        counterTransactions.reduce((sum, t) => sum + (parseInt(t.counted_qty) || 0), 0) : 0;

      const systemQty = parseInt(item.total_qty) || 0;
      const difference = countedQty - systemQty;

      console.log(`System item: ${item.form} ${item.grade} ${item.size}, System Qty: ${systemQty}, Counted Qty: ${countedQty}, Diff: ${difference}`);

      let status = 'Not Counted';
      if (countedQty === 0) {
        status = 'Not Counted';
      } else if (difference === 0) {
        status = 'Matched';
      } else if (difference > 0) {
        status = 'Overcount';
      } else {
        status = 'Undercount';
      }

      return {
        sys_tag_no: item.sys_tag_no,
        tag_no: item.sys_tag_no,
        prd_tag_no: item.sys_tag_no,
        form: item.form,
        grade: item.grade,
        size: item.size,
        finish: item.finish,
        ext_finish: item.ext_finish,
        width: item.width,
        length: item.length,
        location: item.location,
        mill: item.mill,
        heat: item.heat,
        weight: item.weight,
        inv_type: item.inv_type,
        inv_quality: item.inv_quality,
        system_combined_count: systemCombinedItems.length > 0 ? systemCombinedItems.length : (parseInt(item.system_combined_count) || 1),
        system_combined_items: systemCombinedItems,
        max_sys_tag_no: item.max_sys_tag_no || item.sys_tag_no,
        branch: item.branch,
        warehouse: item.warehouse,
        system_qty: systemQty,
        total_qty: systemQty,
        counted_qty: countedQty,
        difference: difference,
        variance: difference,
        status: status,
        prd_ohd_mat_val: item.prd_ohd_mat_val,
        prd_ohd_mat_cst: item.prd_ohd_mat_cst
      };
    });

    // Calculate summary statistics
    const matchedItems = transformedData.filter(item => item.status === 'Matched').length;
    const overcounts = transformedData.filter(item => item.status === 'Overcount').length;
    const undercounts = transformedData.filter(item => item.status === 'Undercount').length;
    const notCounted = transformedData.filter(item => item.status === 'Not Counted').length;
    const discrepancies = overcounts + undercounts;

    const summary = {
      total_system_items: data.length,
      total_system_quantity: data.reduce((sum, item) => sum + (parseInt(item.total_qty) || 0), 0),
      totalItems: data.length,
      matchedItems: matchedItems,
      discrepancies: discrepancies,
      missingItems: notCounted,
      overcounts: overcounts,
      undercounts: undercounts,
      not_counted: notCounted,
      branch: branch,
      warehouse: warehouse,
      location_id: location_id,
      record_date: new Date().toISOString(),
      compare_fields: compareFields
    };

    console.log('=== RECONCILIATION SUMMARY ===');
    console.log('Total System Items:', summary.totalItems);
    console.log('Matched Items:', summary.matchedItems);
    console.log('Discrepancies:', summary.discrepancies);
    console.log('Missing/Not Counted:', summary.missingItems);
    console.log('Overcounts:', summary.overcounts);
    console.log('Undercounts:', summary.undercounts);
    console.log('Sample reconciliation items (first 3):');
    console.log(JSON.stringify(transformedData.slice(0, 3), null, 2));

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
    const savedCompareFields = Array.isArray(summary_data?.compare_fields) && summary_data.compare_fields.length > 0
      ? summary_data.compare_fields.filter(f => DEFAULT_COMPARE_FIELDS.includes(f))
      : DEFAULT_COMPARE_FIELDS;
    const includeLocation = savedCompareFields.includes('location');
    const includeHeat = savedCompareFields.includes('heat');
    const includeType = savedCompareFields.includes('type');
    const includeQuality = savedCompareFields.includes('quality');

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
        const systemHeat = normalizeMillHeat(systemItem.heat || '');
        const checkerHeat = normalizeMillHeat(checker.heat || '');

        // Normalize quality values - system might have codes, counted might have descriptions
        const systemQuality = normalizeQuality(systemItem.inv_quality || '');
        const checkerQuality = normalizeQuality(checker.remarks || '');

        return (
          systemForm === checkerForm &&
          systemGrade === checkerGrade &&
          systemSize === checkerSize &&
          systemFinish === checkerFinish &&
          systemExtFinish === checkerExtFinish &&
          systemWidth === checkerWidth &&
          systemLength === checkerLength &&
          (!includeLocation || systemLocation === checkerLocation) &&
          (!includeHeat || systemHeat === checkerHeat) &&
          (!includeType || systemType === checkerType) &&
          (!includeQuality || systemQuality === checkerQuality)
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

    const locQryCheck = await pool.query(`SELECT location_id FROM reconciliation_records WHERE location_id = $1`, [location_id]);
    console.log(locQryCheck);
    let result;
    if (locQryCheck.rows.length === 0) {
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

      result = await pool.query(query, values);
    } else {
      const updateQry = `
        UPDATE reconciliation_records 
        SET items_data = $1, 
            record_date = CURRENT_TIMESTAMP,
            created_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE location_id = $2
        RETURNING id, record_name, created_at
      `;
      const values = [JSON.stringify(enhancedItemsData), location_id];
      result = await pool.query(updateQry, values);
    }


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
    const skippedItems = [];
    const locationSectionMap = new Map(); // Track unique location_id + section_id combinations

    await pool.query('BEGIN');

    try {
      for (const item of items) {
        // Check if item is already marked in checker_sku_item based on transaction_id, location_id, and section_id
        let existingItem = null;
        if (item.transaction_id && item.section_id) {
          const checkQuery = `
            SELECT id, verified 
            FROM checker_sku_item 
            WHERE location_id = $1 
              AND transaction_id = $2 
              AND section_id = $3
              AND verified = false
            LIMIT 1
          `;
          const checkResult = await pool.query(checkQuery, [
            location_id,
            item.transaction_id,
            item.section_id
          ]);

          if (checkResult.rows.length > 0) {
            existingItem = checkResult.rows[0];
          }
        }

        // If item already exists, skip it
        if (existingItem) {
          skippedItems.push({
            form: item.form,
            grade: item.grade,
            size: item.size,
            transaction_id: item.transaction_id,
            section_id: item.section_id,
            reason: 'Item already marked for checking'
          });
          continue;
        }

        // Insert into recheck_items (keeping existing functionality)
        const recheckQuery = `
          INSERT INTO recheck_items 
          (location_id, form, grade, size, finish, ext_finish, width, length, 
           system_qty, counted_qty, variance, recheck_reason, marked_by, tag_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id
        `;

        const recheckValues = [
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

        const recheckResult = await pool.query(recheckQuery, recheckValues);

        // Insert into checker_sku_item with additional columns
        const checkerQuery = `
          INSERT INTO checker_sku_item 
          (location_id, form, grade, size, finish, ext_finish, width, length, 
           mill, heat, system_qty, counted_qty, variance, status, 
           transaction_id, section_id, location, type, quality, verified)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING id
        `;

        const checkerValues = [
          location_id,
          item.form || '',
          item.grade || '',
          item.size || '',
          item.finish || '',
          item.ext_finish || null,
          item.width || null,
          item.length || null,
          item.mill || null,
          item.heat || null,
          item.system_qty || 0,
          item.counted_qty || 0,
          item.variance || 0,
          item.status || 'Pending',
          item.transaction_id || null,
          item.section_id || null,
          item.location || null,
          item.type || null,
          item.quality || null,
          false // verified
        ];

        const checkerResult = await pool.query(checkerQuery, checkerValues);

        results.push({
          item_id: recheckResult.rows[0].id,
          checker_sku_item_id: checkerResult.rows[0].id,
          form: item.form,
          grade: item.grade,
          size: item.size,
          status: 'marked'
        });

        // Track unique location_id + section_id combinations for status update
        if (item.section_id) {
          const key = `${location_id}|${item.section_id}`;
          if (!locationSectionMap.has(key)) {
            locationSectionMap.set(key, {
              location_id: location_id,
              section_id: item.section_id
            });
          }
        }
      }

      // Update assigned_locations status for unique location_id and section_id combinations
      for (const { location_id: locId, section_id: sectionId } of locationSectionMap.values()) {
        const updateLocationQuery = `
          UPDATE assigned_locations
          SET status = 'Assigned Checker'
          WHERE location_id = $1 AND sub_location_id = $2
        `;
        await pool.query(updateLocationQuery, [locId, sectionId]);
      }

      await pool.query('COMMIT');

      let message = '';
      if (results.length > 0 && skippedItems.length > 0) {
        message = `${results.length} items marked for checking. ${skippedItems.length} items were already marked and skipped.`;
      } else if (results.length > 0) {
        message = `${results.length} items marked for recheck and saved to checker_sku_item`;
      } else if (skippedItems.length > 0) {
        message = `All ${skippedItems.length} items were already marked for checking.`;
      } else {
        message = 'No items were processed.';
      }

      res.json({
        success: true,
        message: message,
        results: results,
        skipped: skippedItems,
        newlyMarked: results.length,
        alreadyMarked: skippedItems.length
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

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

// Get marked items from checker_sku_item for a location
exports.getMarkedItemsForChecking = async (req, res) => {
  try {
    const { location_id } = req.params;

    if (!location_id) {
      return res.status(400).json({
        error: "Location ID is required"
      });
    }

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
        transaction_id,
        section_id,
        location,
        type,
        quality,
        verified,
        created_at
      FROM checker_sku_item
      WHERE location_id = $1 
        AND verified = false
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [location_id]);

    res.json({
      success: true,
      items: result.rows
    });

  } catch (error) {
    console.error('Get marked items for checking error:', error);
    res.status(500).json({
      error: "Failed to get marked items for checking",
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
          const savedCompareFields = Array.isArray(summaryData?.compare_fields) && summaryData.compare_fields.length > 0
            ? summaryData.compare_fields.filter(f => DEFAULT_COMPARE_FIELDS.includes(f))
            : DEFAULT_COMPARE_FIELDS;
          const includeLocation = savedCompareFields.includes('location');
          const includeHeat = savedCompareFields.includes('heat');
          const includeType = savedCompareFields.includes('type');
          const includeQuality = savedCompareFields.includes('quality');

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
              const systemHeat = normalizeMillHeat(recheckItem.heat || '');
              const checkerHeat = normalizeMillHeat(checker.heat || '');

              // Normalize quality values - system might have codes, counted might have descriptions
              const systemQuality = normalizeQuality(recheckItem.inv_quality || '');
              const checkerQuality = normalizeQuality(checker.remarks || '');

              const isMatch = (
                systemForm === checkerForm &&
                systemGrade === checkerGrade &&
                systemSize === checkerSize &&
                systemFinish === checkerFinish &&
                systemExtFinish === checkerExtFinish &&
                systemWidth === checkerWidth &&
                systemLength === checkerLength &&
                (!includeLocation || systemLocation === checkerLocation) &&
                (!includeHeat || systemHeat === checkerHeat) &&
                (!includeType || systemType === checkerType) &&
                (!includeQuality || systemQuality === checkerQuality)
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
            const systemHeat = normalizeMillHeat(recheckItem.heat || '');
            const itemHeat = normalizeMillHeat(item.heat || '');

            // Normalize quality values - system might have codes, counted might have descriptions
            const systemQuality = normalizeQuality(recheckItem.inv_quality || '');
            const itemQuality = normalizeQuality(item.inv_quality || '');

            const isMatch = (
              systemForm === itemForm &&
              systemGrade === itemGrade &&
              systemSize === itemSize &&
              systemFinish === itemFinish &&
              systemExtFinish === itemExtFinish &&
              systemWidth === itemWidth &&
              systemLength === itemLength &&
              (!includeLocation || systemLocation === itemLocation) &&
              (!includeHeat || systemHeat === itemHeat) &&
              (!includeType || systemType === itemType) &&
              (!includeQuality || systemQuality === itemQuality)
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


// getReport
exports.getReconciliationReport = async (req, res) => {
  try {
    // location_id can come from body, query, or params depending on how the frontend sends it
    const location_desc = req.body.location_desc || req.query.location_desc || req.params.location_desc;
    // console.log(location_desc, "location_desc");

    if (!location_desc) {
      return res.json({
        success: true,
        data: [],
        loc: getAllLocQryRes.rows
      });
    }

    

    const checklocqry = `Select location_id from st_locations where location_desc = $1`
    const checklocqryres = await pool.query(checklocqry, [location_desc]);
    // console.log(checklocqryres.rows, "checklocqryresRows");
    if (checklocqryres.rows.length === 0) {
      return res.status(404).json({ success: false, error: "location_desc is not found" });
    }

    const location_id = checklocqryres.rows[0].location_id;
    // console.log(location_id, "location_id");

    if (!location_id) {
      return res.status(400).json({ success: false, error: "location_id is required" });
    }

    const query = `
      SELECT 
          TRIM(item->>'form') AS form,
          TRIM(item->>'size') AS size,
      
          ROUND(SUM((item->>'system_qty')::numeric), 3) AS total_system_qty,
      
          ROUND(SUM((item->>'counted_qty')::numeric), 3) AS total_counted_qty,
      
          ROUND(SUM((item->>'weight')::numeric), 3) AS OhdTons,
      
          ROUND(
              (
                  SUM((item->>'weight')::numeric)
                  / NULLIF(SUM((item->>'system_qty')::numeric), 0)
              ) * SUM((item->>'counted_qty')::numeric),
              3
          ) AS CountTons,
        ROUND(
              (
                  (
                      SUM((item->>'weight')::numeric)
                      / NULLIF(SUM((item->>'system_qty')::numeric), 0)
                  ) * SUM((item->>'counted_qty')::numeric)
              )
              - SUM((item->>'weight')::numeric),
              3
          ) AS VarTons
      
      FROM reconciliation_records,
      jsonb_array_elements(items_data) AS item
      
      WHERE location_id = $1
      
      GROUP BY 
          TRIM(item->>'form'),
          TRIM(item->>'size')
      
      ORDER BY form, size;
    `;

    const result = await pool.query(query, [location_id]);

    return res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error('Error generating reconciliation report:', error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate reconciliation report",
      details: error.message
    });
  }
};

