import React, { useEffect, useState } from "react";
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, CircularProgress, IconButton,
  Collapse, Chip, Button, Alert, Badge, Avatar, useTheme
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ArrowBack, Refresh, Edit, Check, Add, Close, Send, ExpandLess, ExpandMore, CompareArrows, FactCheck } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { green } from "@mui/material/colors";
import EditTransactionDialog from "../components/EditTransactionDialog";
import AddLineItemDialog from '../components/AddLineItemDialog';
import { servicesAPI } from '../config/api';

const CHECKER_VERIFY_UI_PREFIX = 'checker-verify-ui-v1';

interface Transaction {
  transaction_id: number;
  tag_id: string;
  sys_tag_no?: string;
  form: string;
  grade: string;
  size: string;
  width: string;
  finish: string;
  ext_finish: string;
  length: string;
  count_type: 'bundle' | 'piece';
  qty: number;
  checker_count?: number;
  location_id: number;
  section_id: number;
  location_desc?: string;
  section_desc?: string;
  location?: string;
  verified?: boolean;
  status?: string;
  remarks?: string;
  mill?: string;
  heat?: string;
  ad_cmts?: string;
  type?: string;
  role?: string | null;
  counted_by?: number;
  team_id?: number;
  created_at?: string;
  updated_at?: string;
}

interface Bundle {
  id: number;
  transaction_id: number;
  tag_id: string;
  num_of_bundle: number;
  bundle_count: number;
}


const Checker: React.FC = () => {
  const theme = useTheme();
  const { location_id, section_id, team_id } = useParams();
  const navigate = useNavigate();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bundles, setBundles] = useState<Record<number, Bundle[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBundles, setEditingBundles] = useState<Bundle[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [addLineDialogOpen, setAddLineDialogOpen] = useState(false);
  const [verifyingTransactions, setVerifyingTransactions] = useState<Set<number>>(new Set());
  const [unverifyingTransactions, setUnverifyingTransactions] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedExpandedRows, setVerifiedExpandedRows] = useState<Record<number, boolean>>({});
  const [verifiedDiffs, setVerifiedDiffs] = useState<Record<number, { before: Transaction; after: Transaction; changedFields: string[] }>>({});
  const [editingBeforeSnapshot, setEditingBeforeSnapshot] = useState<Transaction | null>(null);


  // Fetch all marked items for checking from checker_sku_item table (both verified and unverified)
  const fetchMarkedItems = async () => {
    try {
      const response = await servicesAPI.getMarkedItemsForChecker({
        location_id: location_id || '',
        section_id: section_id || ''
      });
      
      // Transform checker_sku_item data to Transaction format
      const transformedData: Transaction[] = response.data.map((item: {
        id: number;
        transaction_id?: number;
        sys_tag_no?: string;
        form?: string;
        grade?: string;
        size?: string;
        width?: string;
        finish?: string;
        ext_finish?: string;
        length?: string;
        counted_qty?: number;
        checker_count?: number | null;
        status?: string;
        location_id: number;
        section_id: number;
        location?: string;
        verified?: boolean;
        quality?: string;
        mill?: string;
        heat?: string;
        type?: string;
        created_at?: string;
        verified_at?: string;
      }) => ({
        transaction_id: item.id, // Use checker_sku_item id as transaction_id
        tag_id: item.transaction_id ? String(item.transaction_id) : '', // Use original transaction_id as tag_id if available
        sys_tag_no: item.sys_tag_no || '', // System tag number from transactions table
        form: item.form || '',
        grade: item.grade || '',
        size: item.size || '',
        width: item.width || '',
        finish: item.finish || '',
        ext_finish: item.ext_finish || '',
        length: item.length || '',
        count_type: 'piece' as const, // Default to piece, can be updated if needed
        qty: item.counted_qty || 0,
        checker_count: item.checker_count || null,
        location_id: item.location_id,
        section_id: item.section_id,
        location: item.location || '',
        verified: item.verified || false,
        status: item.status || '',
        remarks: item.quality || '',
        mill: item.mill || '',
        heat: item.heat || '',
        type: item.type || '',
        role: 'Checker',
        created_at: item.created_at,
        updated_at: item.verified_at
      }));
      
      return transformedData;
    } catch (error) {
      console.error('Error fetching marked items:', error);
      throw error;
    }
  };

  const fetchData = async (): Promise<Transaction[]> => {
    let allMarkedItemsData: Transaction[] = [];
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all marked items (both verified and unverified) for main table
      allMarkedItemsData = await fetchMarkedItems();
      setTransactions(allMarkedItemsData);

      // Restore "after verify" dropdown state (survives leaving the page and coming back)
      const storageKey = `${CHECKER_VERIFY_UI_PREFIX}:${location_id ?? ''}:${section_id ?? ''}`;
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            expanded?: Record<string, boolean>;
            diffs?: Record<string, { before: Transaction; after: Transaction; changedFields: string[] }>;
          };
          const validIds = new Set(allMarkedItemsData.map((t) => t.transaction_id));
          const expanded: Record<number, boolean> = {};
          const diffs: Record<number, { before: Transaction; after: Transaction; changedFields: string[] }> = {};
          if (parsed.expanded) {
            Object.entries(parsed.expanded).forEach(([k, v]) => {
              const id = Number(k);
              if (validIds.has(id)) expanded[id] = v;
            });
          }
          if (parsed.diffs) {
            Object.entries(parsed.diffs).forEach(([k, v]) => {
              const id = Number(k);
              if (validIds.has(id) && v?.before && v?.after) diffs[id] = v;
            });
          }
          setVerifiedExpandedRows(expanded);
          setVerifiedDiffs(diffs);
        }
      } catch (e) {
        console.warn('Could not restore checker verify UI state', e);
      }

      // Note: Bundles are not applicable for marked items from checker_sku_item
      // as these are SKU-based items, not transaction-based bundles
      setBundles({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
    return allMarkedItemsData;
  };

  useEffect(() => { 
    fetchData(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location_id, section_id]);

  // Persist verify dropdown + diff highlights while navigating away / back (same tab session)
  useEffect(() => {
    if (loading) return;
    if (!location_id || !section_id) return;
    const storageKey = `${CHECKER_VERIFY_UI_PREFIX}:${location_id}:${section_id}`;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          expanded: verifiedExpandedRows,
          diffs: verifiedDiffs
        })
      );
    } catch (e) {
      console.warn('Could not persist checker verify UI state', e);
    }
  }, [loading, location_id, section_id, verifiedExpandedRows, verifiedDiffs]);

  const toggleRowExpand = (transactionId: number) => {
    setExpandedRows(prev => ({
      ...prev, 
      [transactionId]: !prev[transactionId]
    }));
  };

  const calculateTotal = (bundles: Bundle[]) => {
    return bundles.reduce((sum, b) => sum + (b.num_of_bundle * b.bundle_count), 0);
  };

  const normalizeForCompare = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    const s = String(v).trim();
    return s === '-' ? '' : s;
  };

  const getDisplayedCheckerCount = (t: Transaction): number | null => {
    // This mirrors the main table display logic:
    // - if checker_count exists -> show it
    // - else if already verified -> show original qty
    // - else -> show '-'
    const explicit = t.checker_count;
    if (explicit !== null && explicit !== undefined) return explicit;
    if (t.verified) return t.qty;
    return null;
  };

  const computeChangedFields = (before: Transaction, after: Transaction): string[] => {
    const changed: string[] = [];
    const comparisons: Array<[string, unknown, unknown]> = [
      ['form', before.form, after.form],
      ['grade', before.grade, after.grade],
      ['size', before.size, after.size],
      ['width', before.width, after.width],
      ['finish', before.finish, after.finish],
      ['ext_finish', before.ext_finish, after.ext_finish],
      ['length', before.length, after.length],
      ['type', before.type, after.type],
      ['location', before.location, after.location],
      ['remarks', before.remarks, after.remarks],
      ['ad_cmts', before.ad_cmts, after.ad_cmts],
      ['mill', before.mill, after.mill],
      ['heat', before.heat, after.heat],
      ['count_type', before.count_type, after.count_type],
      ['checker_count', getDisplayedCheckerCount(before), getDisplayedCheckerCount(after)]
    ];

    comparisons.forEach(([key, beforeVal, afterVal]) => {
      if (normalizeForCompare(beforeVal) !== normalizeForCompare(afterVal)) {
        changed.push(key);
      }
    });

    return changed;
  };

  const handleEdit = (transaction: Transaction) => {
    // Snapshot values before checker edits so we can highlight changes after verify.
    setEditingBeforeSnapshot(transaction);
    // Initialize checker_count with the original qty if not already set
    const transactionWithDefaultCheckerCount = {
      ...transaction,
      checker_count: transaction.checker_count ?? transaction.qty
    };
    console.log('🔍 Editing transaction:', {
      original_qty: transaction.qty,
      existing_checker_count: transaction.checker_count,
      final_checker_count: transactionWithDefaultCheckerCount.checker_count
    });
    setEditingTransaction(transactionWithDefaultCheckerCount);
    setEditingBundles(bundles[transaction.transaction_id] || []);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editingTransaction) return;
    const beforeSnapshot = editingBeforeSnapshot;
  
    // Validate quantity
    if (editingTransaction.count_type === 'piece' && !editingTransaction.checker_count) {
      setError('Checker count cannot be empty for piece count');
      return;
    }
  
    if (editingTransaction.count_type === 'bundle') {
      const hasEmptyBundles = editingBundles.some(b => b.bundle_count <= 0);
      if (hasEmptyBundles) {
        setError('All bundles must have a count greater than 0');
        return;
      }
    }
  
    try {
      setIsSaving(true);
      setError(null);
      
      // Get original transaction_id from tag_id (which stores the original transaction_id)
      // transaction_id in editingTransaction is the checker_sku_item id
      const checkerSkuItemId = editingTransaction.transaction_id;
      const originalTransactionId = editingTransaction.tag_id ? parseInt(editingTransaction.tag_id) : null;

      // Prepare payload for edit and verify
      const payload = {
        checker_sku_item_id: checkerSkuItemId,
        ...(originalTransactionId && { original_transaction_id: originalTransactionId }),
        sys_tag_no: editingTransaction.sys_tag_no,
        form: editingTransaction.form,
        grade: editingTransaction.grade,
        size: editingTransaction.size,
        finish: editingTransaction.finish,
        ext_finish: editingTransaction.ext_finish,
        width: editingTransaction.width,
        length: editingTransaction.length,
        mill: editingTransaction.mill,
        heat: editingTransaction.heat,
        type: editingTransaction.type,
        remarks: editingTransaction.remarks,
        location: editingTransaction.location,
        checker_count: editingTransaction.checker_count,
        bundles: editingTransaction.count_type === 'bundle' ? editingBundles : []
      };

      // Call the edit and verify endpoint
      const response = await servicesAPI.editAndVerifyMarkedItem(payload);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to save and verify item');
      }

      // Refresh data to ensure consistency (this will update both tables)
      const updatedTransactions = await fetchData();
      const afterTransaction = updatedTransactions.find(t => t.transaction_id === checkerSkuItemId);

      if (beforeSnapshot && afterTransaction) {
        const changedFields = computeChangedFields(beforeSnapshot, afterTransaction);
        setVerifiedDiffs(prev => ({
          ...prev,
          [checkerSkuItemId]: { before: beforeSnapshot, after: afterTransaction, changedFields }
        }));
        setVerifiedExpandedRows(prev => ({ ...prev, [checkerSkuItemId]: true }));
      }

      setSuccessMessage('Item edited and verified successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);
      setEditingBeforeSnapshot(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickVerify = async (transactionId: number) => {
    // Add to verifying set
    setVerifyingTransactions(prev => new Set(prev).add(transactionId));
    
    try {
      // Find the marked item to verify (transactionId is the checker_sku_item id)
      const markedItem = transactions.find(t => t.transaction_id === transactionId);
      if (!markedItem) {
        setError('Marked item not found');
        return;
      }
      const beforeSnapshot = markedItem;

      // Get original transaction_id from tag_id (which stores the original transaction_id)
      // If tag_id is not available, the backend will use transaction_id from checker_sku_item
      const originalTransactionId = markedItem.tag_id ? parseInt(markedItem.tag_id) : null;

      // Call the quick verify endpoint
      const response = await servicesAPI.quickVerifyMarkedItem({
        checker_sku_item_id: transactionId, // This is the checker_sku_item id
        ...(originalTransactionId && { original_transaction_id: originalTransactionId })
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to quick verify item');
      }

      // Refresh data to ensure consistency (this will update both tables)
      const updatedTransactions = await fetchData();
      const afterTransaction = updatedTransactions.find(t => t.transaction_id === transactionId);

      if (beforeSnapshot && afterTransaction) {
        const changedFields = computeChangedFields(beforeSnapshot, afterTransaction);
        setVerifiedDiffs(prev => ({
          ...prev,
          [transactionId]: { before: beforeSnapshot, after: afterTransaction, changedFields }
        }));
        setVerifiedExpandedRows(prev => ({ ...prev, [transactionId]: true }));
      }

      setSuccessMessage('Item quick verified successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to quick verify item');
    } finally {
      // Remove from verifying set
      setVerifyingTransactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const handleUnverifyMarkedItem = async (transactionId: number) => {
    // Add to unverifying set
    setUnverifyingTransactions(prev => new Set(prev).add(transactionId));
    
    try {
      // Find the marked item to unverify (transactionId is the checker_sku_item id)
      const markedItem = transactions.find(t => t.transaction_id === transactionId);
      if (!markedItem) {
        setError('Marked item not found');
        return;
      }

      // Get original transaction_id from tag_id (which stores the original transaction_id)
      // If tag_id is not available, the backend will use transaction_id from checker_sku_item
      const originalTransactionId = markedItem.tag_id ? parseInt(markedItem.tag_id) : null;

      // Call the unverify endpoint
      const response = await servicesAPI.unverifyMarkedItem({
        checker_sku_item_id: transactionId, // This is the checker_sku_item id
        ...(originalTransactionId && { original_transaction_id: originalTransactionId })
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to unverify item');
      }

      // Refresh data to ensure consistency (this will update both tables)
      await fetchData();
      // Remove inline update dropdown/highlights after unverify
      setVerifiedExpandedRows(prev => ({ ...prev, [transactionId]: false }));
      setVerifiedDiffs(prev => {
        const next = { ...prev };
        delete next[transactionId];
        return next;
      });

      setSuccessMessage('Item unverified successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unverify item');
    } finally {
      // Remove from unverifying set
      setUnverifyingTransactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const handleFieldChange = (field: keyof Transaction, value: string | number) => {
    if (!editingTransaction) return;
    
    console.log('🔧 Field change:', {
      field,
      value,
      current_checker_count: editingTransaction.checker_count,
      current_qty: editingTransaction.qty
    });
    
    setEditingTransaction({
      ...editingTransaction,
      [field]: value
    });

    if (field === 'count_type' && value === 'bundle' && editingBundles.length === 0) {
      setEditingBundles([{
        id: 0,
        transaction_id: editingTransaction.transaction_id,
        tag_id: editingTransaction.tag_id,
        num_of_bundle: 1,
        bundle_count: 0,
      }]);
    }
  };

  const handleBundleChange = (index: number, field: keyof Bundle, value: number) => {
    const updated = [...editingBundles];
    updated[index] = {...updated[index], [field]: value};
    setEditingBundles(updated);
  };

  const addBundle = () => {
    setEditingBundles([...editingBundles, {
      id: 0,
      transaction_id: editingTransaction?.transaction_id || 0,
      tag_id: editingTransaction?.tag_id || '',
      num_of_bundle: editingBundles.length + 1,
      bundle_count: 0,
    }]);
  };

  const removeBundle = (index: number) => {
    const updated = [...editingBundles];
    updated.splice(index, 1);
    setEditingBundles(updated);
  };

  if (loading) return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: alpha(theme.palette.grey[500], 0.06),
        p: 4
      }}
    >
      <CircularProgress size={44} thickness={4} sx={{ color: 'primary.main' }} />
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        Loading verification items…
      </Typography>
    </Box>
  );

  if (error) return (
    <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: alpha(theme.palette.grey[500], 0.06), minHeight: '50vh' }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 560,
          mx: 'auto',
          p: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
          bgcolor: alpha(theme.palette.error.main, 0.06)
        }}
      >
        <Alert
          severity="error"
          sx={{ borderRadius: 2, alignItems: 'center' }}
          action={
            <Button color="inherit" size="small" onClick={fetchData} sx={{ fontWeight: 600, textTransform: 'none' }}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Paper>
    </Box>
  );



  const handleAddNewLine = async (payload: Record<string, unknown>) => {
    try {
      const response = await servicesAPI.addLineItem(payload);
      const result = response.data;
      
      if (result.success) {
        // Refresh transactions
        await fetchData();
        
        setSuccessMessage('New line item added successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.message || 'Failed to add new line item');
      }
    } catch (error) {
      console.error("Error adding new line item:", error);
      setError('Failed to add new line item');
    }
  };

  const handleSubmit = async () => {
    const verifiedItems = transactions.filter(t => t.verified);
    
    if (verifiedItems.length === 0) {
      setError('No verified items to submit');
      return;
    }

    if (!location_id || !section_id) {
      setError('Location ID and Section ID are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      // Call API to update assigned_locations status to 'Completed'
      const response = await servicesAPI.completeCheckerVerification({
        location_id: location_id,
        section_id: section_id
      });

      if (response.data.success) {
        setSuccessMessage(`Successfully submitted ${verifiedItems.length} verified item(s)! Section status updated to Completed.`);
        
        // Wait a moment to show the success message, then navigate back to checker home
        setTimeout(() => {
          navigate('/checker');
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Failed to complete verification');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit verified items');
      setIsSubmitting(false);
    }
  };


  const btnBase = {
    textTransform: 'none' as const,
    fontWeight: 600,
    borderRadius: 2,
    px: 2,
    boxShadow: 'none',
    '&:hover': { boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.25)}` }
  };

  const verifiedCount = transactions.filter(t => t.verified).length;

  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: alpha(theme.palette.grey[500], 0.06),
        pb: 3,
        pt: { xs: 2, sm: 2.5 },
        px: { xs: 1.5, sm: 2.5 }
      }}
    >
      {successMessage && (
        <Alert
          severity="success"
          sx={{
            mb: 2.5,
            borderRadius: 2,
            boxShadow: `0 4px 20px ${alpha(theme.palette.success.main, 0.2)}`,
            '& .MuiAlert-message': { fontWeight: 500 }
          }}
        >
          {successMessage}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          mb: 2.5,
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.09)} 0%, ${alpha(theme.palette.primary.dark, 0.04)} 55%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.06)}`
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap'
          }}
        >
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            variant="outlined"
            color="inherit"
            sx={{
              ...btnBase,
              borderColor: alpha(theme.palette.divider, 0.9),
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                boxShadow: 'none'
              }
            }}
          >
            Back
          </Button>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexGrow: 1,
              justifyContent: 'center',
              minWidth: 0
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.15),
                color: 'primary.main',
                boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.25)}`
              }}
            >
              <FactCheck sx={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                <Badge
                  badgeContent={verifiedCount}
                  color="success"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      minWidth: 22,
                      height: 22
                    }
                  }}
                  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  Verification
                </Badge>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mt: 0.5 }}>
                Review and verify marked line items for this section
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={() => setAddLineDialogOpen(true)}
              startIcon={<Add />}
              sx={{ ...btnBase, bgcolor: 'primary.main' }}
            >
              Add New Line
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <Send />}
              disabled={isSubmitting || verifiedCount === 0}
              sx={{
                ...btnBase,
                '&:hover': { boxShadow: `0 4px 14px ${alpha(theme.palette.success.main, 0.35)}` }
              }}
            >
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </Button>
            <Button
              variant="outlined"
              onClick={fetchData}
              startIcon={<Refresh />}
              sx={{
                ...btnBase,
                borderColor: alpha(theme.palette.divider, 0.9),
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  boxShadow: 'none'
                }
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          maxHeight: '75vh',
          overflow: 'auto',
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.07)}`
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell
                width="72px"
                sx={{
                  background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'text.secondary',
                  borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                  py: 1.75
                }}
              >
                Quick Verify
              </TableCell>
              <TableCell
                width="72px"
                sx={{
                  background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'text.secondary',
                  borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                  py: 1.75
                }}
              >
                Status
              </TableCell>
              {[
                'Tag no',
                'Form',
                'Grade',
                'Size',
                'Width',
                'Finish',
                'Ext. Finish',
                'Length',
                'Type',
                'Location',
                'Quality',
                'Comments',
                'Count Type'
              ].map((label) => (
                <TableCell
                  key={label}
                  sx={{
                    background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'text.secondary',
                    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                    py: 1.75,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {label}
                </TableCell>
              ))}
              <TableCell
                align="right"
                sx={{
                  background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'text.secondary',
                  borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                  py: 1.75
                }}
              >
                Counter Count
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'text.secondary',
                  borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                  py: 1.75
                }}
              >
                Checker Count
              </TableCell>
              <TableCell
                width="108px"
                sx={{
                  background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'text.secondary',
                  borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                  py: 1.75
                }}
              >
                Edit & Check
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => {
              const isVerified = transaction.verified || false;
              const isBundle = transaction.count_type === 'bundle';
              const isExpanded = expandedRows[transaction.transaction_id];
              const transactionBundles = bundles[transaction.transaction_id] || [];
              const verifiedUpdate = verifiedDiffs[transaction.transaction_id];
              const statusUpper = (transaction.status || '').toString().toUpperCase();
              const isNew =
                !isVerified &&
                (statusUpper === 'NEW' || statusUpper.includes('NEW'));
              const isNewByAge =
                !isVerified &&
                transaction.created_at &&
                !transaction.updated_at &&
                Number.isFinite(Date.parse(transaction.created_at)) &&
                Date.now() - Date.parse(transaction.created_at) < 5 * 60 * 1000;

              return (
                <React.Fragment key={transaction.transaction_id}>
                  <TableRow
                    hover
                    sx={{
                      transition: 'background-color 0.15s ease',
                      bgcolor: transaction.verified
                        ? alpha(theme.palette.success.main, 0.09)
                        : alpha(theme.palette.background.paper, 1),
                      '&:hover': {
                        bgcolor: transaction.verified
                          ? alpha(theme.palette.success.main, 0.16)
                          : alpha(theme.palette.action.hover, 0.5)
                      },
                      '& .MuiTableCell-root': {
                        borderColor: alpha(theme.palette.divider, 0.55),
                        fontSize: '0.8125rem'
                      }
                    }}
                  >
                    <TableCell>
                      {transaction.verified ? (
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Avatar sx={{ 
                            bgcolor: green[500], 
                            width: 26, 
                            height: 26,
                            color: 'white',
                            boxShadow: `0 2px 8px ${alpha(green[500], 0.4)}`
                          }}>
                            ✓
                          </Avatar>
                          <IconButton 
                            size="small" 
                            onClick={() => handleUnverifyMarkedItem(transaction.transaction_id)}
                            color="error"
                            title="Unverify Item"
                            disabled={verifyingTransactions.has(transaction.transaction_id) || unverifyingTransactions.has(transaction.transaction_id)}
                            sx={{ borderRadius: 2, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) } }}
                          >
                            {unverifyingTransactions.has(transaction.transaction_id) ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Close fontSize="small" />
                            )}
                          </IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleQuickVerify(transaction.transaction_id)}
                            color="success"
                            title="Quick Verify (No Edit Required)"
                            disabled={verifyingTransactions.has(transaction.transaction_id) || unverifyingTransactions.has(transaction.transaction_id)}
                            sx={{ borderRadius: 2, '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.12) } }}
                          >
                            {verifyingTransactions.has(transaction.transaction_id) ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Check fontSize="small" />
                            )}
                          </IconButton>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {isVerified ? (
                        <Chip 
                          label="VERIFIED" 
                          size="small" 
                          color="success" 
                          variant="filled"
                          sx={{ fontSize: '0.7rem', fontWeight: 700, borderRadius: 999, height: 24 }}
                        />
                      ) : isNew || isNewByAge ? (
                        <Chip
                          label="NEW"
                          size="small"
                          color="primary"
                          variant="filled"
                          sx={{ fontSize: '0.7rem', fontWeight: 800, borderRadius: 999, height: 24 }}
                        />
                      ) : (
                        <Chip 
                          label="PENDING" 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', fontWeight: 700, borderRadius: 999, height: 24 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {transaction.sys_tag_no ? transaction.sys_tag_no : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{transaction.form}</TableCell>
                    <TableCell>{transaction.grade}</TableCell>
                    <TableCell>{transaction.size}</TableCell>
                    <TableCell>{transaction.width}</TableCell>
                    <TableCell>{transaction.finish}</TableCell>
                    <TableCell>{transaction.ext_finish}</TableCell>
                    <TableCell>{transaction.length}</TableCell>
                    <TableCell>{transaction.type || '-'}</TableCell>
                    <TableCell>{transaction.location || '-'}</TableCell>
                    <TableCell>{transaction.remarks || '-'}</TableCell>
                    <TableCell>{transaction.ad_cmts || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={transaction.count_type} 
                        size="small" 
                        color={isBundle ? 'primary' : 'default'}
                        variant={isBundle ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, borderRadius: 999, height: 24 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium">
                        {transaction.qty}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium">
                        {transaction.checker_count || (isVerified ? transaction.qty : '-')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEdit(transaction)}
                          color="primary"
                          title={isVerified ? "Edit Verified Item" : "Edit & Verify (Check Required)"}
                          disabled={verifyingTransactions.has(transaction.transaction_id) || unverifyingTransactions.has(transaction.transaction_id)}
                          sx={{ borderRadius: 2, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        {verifiedDiffs[transaction.transaction_id] && (
                          <IconButton
                            size="small"
                            onClick={() =>
                              setVerifiedExpandedRows(prev => ({
                                ...prev,
                                [transaction.transaction_id]: !prev[transaction.transaction_id]
                              }))
                            }
                            color="inherit"
                            title={verifiedExpandedRows[transaction.transaction_id] ? "Hide update" : "Show update"}
                            sx={{ borderRadius: 2 }}
                          >
                            {verifiedExpandedRows[transaction.transaction_id] ? (
                              <ExpandLess fontSize="small" />
                            ) : (
                              <ExpandMore fontSize="small" />
                            )}
                          </IconButton>
                        )}
                        {isBundle && (
                          <IconButton 
                            size="small" 
                            onClick={() => toggleRowExpand(transaction.transaction_id)}
                            title="View Bundle Details"
                            sx={{ borderRadius: 2 }}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  {verifiedUpdate && verifiedExpandedRows[transaction.transaction_id] && (
                    <TableRow
                      sx={{
                        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.grey[500], 0.04)} 100%)`,
                        boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
                        '& .MuiTableCell-root': {
                          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`
                        }
                      }}
                    >
                      {(() => {
                        const before = verifiedUpdate.before;
                        const after = verifiedUpdate.after;
                        const changed = new Set(verifiedUpdate.changedFields);
                        const displayValue = (v: unknown) => {
                          const s = normalizeForCompare(v);
                          return s === '' ? '-' : s;
                        };

                        const beforeTag = before.sys_tag_no ? before.sys_tag_no : '';
                        const afterTag = after.sys_tag_no ? after.sys_tag_no : '';
                        const tagChanged = normalizeForCompare(beforeTag) !== normalizeForCompare(afterTag);

                        const afterCheckerCount = getDisplayedCheckerCount(after);

                        const columns: Array<{
                          key: string;
                          afterVal: unknown;
                          beforeVal: unknown;
                          isChanged: boolean;
                          align?: 'right';
                        }> = [
                          { key: 'tag', beforeVal: beforeTag, afterVal: afterTag, isChanged: tagChanged },
                          { key: 'form', beforeVal: before.form, afterVal: after.form, isChanged: changed.has('form') },
                          { key: 'grade', beforeVal: before.grade, afterVal: after.grade, isChanged: changed.has('grade') },
                          { key: 'size', beforeVal: before.size, afterVal: after.size, isChanged: changed.has('size') },
                          { key: 'width', beforeVal: before.width, afterVal: after.width, isChanged: changed.has('width') },
                          { key: 'finish', beforeVal: before.finish, afterVal: after.finish, isChanged: changed.has('finish') },
                          { key: 'ext_finish', beforeVal: before.ext_finish, afterVal: after.ext_finish, isChanged: changed.has('ext_finish') },
                          { key: 'length', beforeVal: before.length, afterVal: after.length, isChanged: changed.has('length') },
                          { key: 'type', beforeVal: before.type, afterVal: after.type, isChanged: changed.has('type') },
                          { key: 'location', beforeVal: before.location, afterVal: after.location, isChanged: changed.has('location') },
                          { key: 'remarks', beforeVal: before.remarks, afterVal: after.remarks, isChanged: changed.has('remarks') },
                          { key: 'ad_cmts', beforeVal: before.ad_cmts, afterVal: after.ad_cmts, isChanged: changed.has('ad_cmts') },
                          { key: 'count_type', beforeVal: before.count_type, afterVal: after.count_type, isChanged: changed.has('count_type') },
                          { key: 'counter_qty', beforeVal: before.qty, afterVal: before.qty, isChanged: false, align: 'right' },
                          {
                            key: 'checker_count',
                            beforeVal: getDisplayedCheckerCount(before),
                            afterVal: afterCheckerCount,
                            isChanged: changed.has('checker_count'),
                            align: 'right'
                          }
                        ];

                        const changeCount = verifiedUpdate.changedFields.length;

                        return (
                          <>
                            <TableCell
                              colSpan={2}
                              sx={{
                                verticalAlign: 'middle',
                                py: 1.25,
                                px: 1.5,
                                width: 128,
                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                                borderRight: `1px solid ${alpha(theme.palette.divider, 0.85)}`
                              }}
                            >
                              <Collapse in={true} timeout="auto" unmountOnExit>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, minWidth: 0 }}>
                                  <Box
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: 2,
                                      flexShrink: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      bgcolor: alpha(theme.palette.primary.main, 0.14),
                                      color: 'primary.main',
                                      boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`
                                    }}
                                  >
                                    <CompareArrows sx={{ fontSize: 22 }} />
                                  </Box>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        display: 'block',
                                        color: 'text.secondary',
                                        fontWeight: 700,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        mb: 0.75
                                      }}
                                    >
                                      After verify
                                    </Typography>
                                    <Chip
                                      label={changeCount === 0 ? 'No field changes' : `${changeCount} field${changeCount === 1 ? '' : 's'} changed`}
                                      size="small"
                                      color={changeCount > 0 ? 'warning' : 'default'}
                                      variant={changeCount > 0 ? 'filled' : 'outlined'}
                                      sx={{
                                        alignSelf: 'flex-start',
                                        fontWeight: 700,
                                        borderRadius: 999,
                                        height: 26,
                                        '& .MuiChip-label': { px: 1.25 }
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Collapse>
                            </TableCell>
                            {columns.map(c => (
                              <TableCell
                                key={c.key}
                                align={c.align}
                                sx={{
                                  verticalAlign: 'middle',
                                  py: 1.1,
                                  px: 1,
                                  borderLeft: `1px solid ${alpha(theme.palette.divider, 0.35)}`
                                }}
                                title={`From: ${displayValue(c.beforeVal)} | To: ${displayValue(c.afterVal)}`}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                                    width: c.align === 'right' ? '100%' : 'auto',
                                    maxWidth: '100%',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 2,
                                    fontSize: '0.8125rem',
                                    fontWeight: c.isChanged ? 700 : 500,
                                    fontVariantNumeric: 'tabular-nums',
                                    color: c.isChanged ? 'warning.dark' : 'text.primary',
                                    bgcolor: c.isChanged
                                      ? alpha(theme.palette.warning.main, 0.16)
                                      : alpha(theme.palette.grey[500], 0.08),
                                    border: `1px solid ${
                                      c.isChanged
                                        ? alpha(theme.palette.warning.main, 0.45)
                                        : alpha(theme.palette.divider, 0.9)
                                    }`,
                                    boxShadow: c.isChanged
                                      ? `0 1px 4px ${alpha(theme.palette.warning.main, 0.2)}`
                                      : 'none'
                                  }}
                                >
                                  {displayValue(c.afterVal)}
                                </Box>
                              </TableCell>
                            ))}
                            <TableCell
                              sx={{
                                verticalAlign: 'middle',
                                py: 1.1,
                                borderLeft: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
                                bgcolor: alpha(theme.palette.grey[500], 0.03)
                              }}
                            />
                          </>
                        );
                      })()}
                    </TableRow>
                  )}
                  
                  {isBundle && isExpanded && (
                    <TableRow>
                      <TableCell colSpan={18} sx={{ p: 0, borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}` }}>
                        <Collapse in={isExpanded}>
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: alpha(theme.palette.grey[500], 0.06),
                              borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`
                            }}
                          >
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
                              Bundle Details — Total: {calculateTotal(transactionBundles)}
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Bundle #</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Count</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Total</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {transactionBundles.map((bundle, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{bundle.num_of_bundle}</TableCell>
                                    <TableCell>{bundle.bundle_count}</TableCell>
                                    <TableCell>
                                      {bundle.num_of_bundle * bundle.bundle_count}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper
        elevation={0}
        sx={{
          mt: 2,
          py: 1.5,
          px: 2,
          borderRadius: 2.5,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.9)
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {transactions.length} item{transactions.length === 1 ? '' : 's'} in this list
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`${verifiedCount} verified`}
            color="success"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
          <Chip
            size="small"
            label={`${transactions.length - verifiedCount} pending`}
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Box>
      </Paper>

      <EditTransactionDialog
        open={isEditing}
        transaction={editingTransaction}
        bundles={editingBundles}
        onClose={() => setIsEditing(false)}
        onSave={handleSave}
        onFieldChange={handleFieldChange}
        onBundleChange={handleBundleChange}
        onAddBundle={addBundle}
        onRemoveBundle={removeBundle}
        isSaving={isSaving}
      />
      <AddLineItemDialog
        open={addLineDialogOpen}
        onClose={() => setAddLineDialogOpen(false)}
        onSubmit={handleAddNewLine}
        locationId={location_id || ''}
        teamId={team_id || ''}
      />
    </Box>
  );
};

export default Checker;