import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Button,
  CircularProgress,
  Breadcrumbs,
  Link,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  TextField,
  InputAdornment,
  Collapse,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  DialogContentText,
} from '@mui/material';
import {
  Home,
  LocationOn,
  Refresh,
  DeleteOutline,
  Tune,
  ArrowBack,
  Search,
  Download,
  ExpandMore,
  ExpandLess,
  Inventory2Outlined,
  TrendingUp,
  TrendingDown,
  CheckCircleOutline,
  EditNote,
} from '@mui/icons-material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';
import { servicesAPI } from '../config/api';
import {
  loadAdjustmentItems,
  saveAdjustmentItems,
  clearAdjustmentItems,
} from '../utils/adjustmentSession';
import type { AdjustmentMarkedItem } from '../types/reconciliation';

interface AdjustmentResult {
  prd_itm_ctl_no: string;
  prd_frm: string;
  prd_grd: string;
  prd_size: string;
  prd_fnsh: string;
  prd_ef_svar: string;
  prd_wdth: number;
  prd_lgth: number;
  prd_mill: string;
  prd_heat: string;
  prd_loc: string;
  prd_invt_typ: string;
  prd_invt_qlty: string;
  prd_ohd_pcs: number;
  prd_ohd_wgt: number;
  prd_ohd_qty: number;
}

const NAVY = '#0C2C48';
const NAVY_MID = '#1E5A8A';
const ROW_BG_EVEN = '#ffffff';
const ROW_BG_ODD = '#f4f7fb';
const ROW_BG_HOVER = '#e8eef6';

const isFoundItem = (item: AdjustmentMarkedItem): boolean => {
  const status = String(item.recon_status || item.status || '').toLowerCase();
  return status === 'orphaned' || status === 'found' || status === 'counted not in system';
};

const isOverUnderItem = (item: AdjustmentMarkedItem): boolean => {
  if (isFoundItem(item)) return false;
  const status = String(item.recon_status || '').toLowerCase();
  if (status === 'overcount' || status === 'undercount') return true;
  return Number(item.variance) !== 0;
};

const itemHasAdjustment = (item: AdjustmentMarkedItem): boolean => {
  if (isFoundItem(item)) {
    return item.adjustment_amount != null && String(item.adjustment_amount).trim() !== '';
  }
  if (isOverUnderItem(item)) {
    return Boolean(
      item.adjustment_type?.trim()
      && item.adjustment_location?.trim()
      && item.adjustment_quantity != null && String(item.adjustment_quantity).trim() !== ''
      && item.adjustment_amount != null && String(item.adjustment_amount).trim() !== ''
    );
  }
  return item.adjustment_amount != null && String(item.adjustment_amount).trim() !== '';
};

const resolveCountTagNoForApproval = (item: AdjustmentMarkedItem): string | undefined => {
  const tid = item.tag_id != null ? String(item.tag_id).trim() : '';
  if (tid) return tid;
  const sys = String(item.sys_tag_no ?? '').trim();
  if (sys && sys !== '-' && sys !== '—' && sys !== 'N/A') return sys;
  return undefined;
};

interface AdjustmentFormState {
  adjustment_type: string;
  adjustment_location: string;
  adjustment_quantity: string;
  adjustment_amount: string;
}

const fmt = (value: unknown, digits = 2) => {
  if (value == null || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : String(value);
};

const display = (value: unknown) => {
  if (value == null || String(value).trim() === '') return '—';
  return String(value);
};

const parseTags = (value?: string | null) =>
  (value || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

const varianceColor = (variance: number): 'success' | 'info' | 'warning' => {
  if (variance === 0) return 'success';
  if (variance > 0) return 'info';
  return 'warning';
};

const statusColor = (status?: string): 'default' | 'success' | 'warning' | 'info' | 'error' => {
  switch (status) {
    case 'Match':
    case 'Matched':
      return 'success';
    case 'Undercount':
      return 'warning';
    case 'Overcount':
      return 'info';
    case 'Orphaned':
    case 'Counted Not In System':
      return 'error';
    default:
      return 'default';
  }
};

const AdjustmentMarkedItemsPage: React.FC = () => {
  const { location_id } = useParams<{ location_id: string }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const [items, setItems] = useState<AdjustmentMarkedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [locationDesc, setLocationDesc] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [erpResults, setErpResults] = useState<Record<number, AdjustmentResult[]>>({});
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<AdjustmentMarkedItem | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustmentFormState>({
    adjustment_type: '',
    adjustment_location: '',
    adjustment_quantity: '',
    adjustment_amount: '',
  });
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const loadLocationContext = useCallback(async () => {
    const state = routerLocation.state as { branch?: string; warehouse?: string; location_desc?: string } | null;
    if (state?.branch && state?.warehouse) {
      setBranch(state.branch);
      setWarehouse(state.warehouse);
      if (state.location_desc) setLocationDesc(state.location_desc);
      return;
    }
    if (!location_id) return;
    try {
      const response = await servicesAPI.getLocation(location_id);
      setBranch(response.data?.branch || '');
      setWarehouse(response.data?.warehouse || '');
      setLocationDesc(response.data?.location_desc || '');
    } catch {
      // Non-fatal
    }
  }, [location_id, routerLocation.state]);

  const loadItems = useCallback(() => {
    if (!location_id) return;
    setLoading(true);
    try {
      const state = routerLocation.state as { items?: AdjustmentMarkedItem[] } | null;
      const fromState = state?.items;
      const fromSession = loadAdjustmentItems(location_id);
      const nextItems = fromState && fromState.length > 0 ? fromState : fromSession;
      setItems(nextItems);
      if (nextItems.length > 0) {
        saveAdjustmentItems(location_id, nextItems);
      }
    } finally {
      setLoading(false);
    }
  }, [location_id, routerLocation.state]);

  useEffect(() => {
    loadLocationContext();
    loadItems();
  }, [loadLocationContext, loadItems]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [
        item.sys_tag_no,
        item.tag_id,
        item.form,
        item.grade,
        item.size,
        item.finish,
        item.ext_finish,
        item.mill,
        item.heat,
        item.location,
        item.type,
        item.quality,
        item.branch,
        item.warehouse,
        item.section_desc,
        item.recon_status,
        item.marked_by_name,
      ]
        .map((v) => String(v || '').toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [items, searchTerm]);

  const stats = useMemo(() => {
    const over = items.filter((i) => Number(i.variance) > 0).length;
    const under = items.filter((i) => Number(i.variance) < 0).length;
    const match = items.filter((i) => Number(i.variance) === 0).length;
    return { total: items.length, over, under, match };
  }, [items]);

  const handleRemove = (itemId: number) => {
    setRemovingId(itemId);
    try {
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== itemId);
        if (location_id) saveAdjustmentItems(location_id, next);
        return next;
      });
      setErpResults((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      enqueueSnackbar('Item removed from adjustment list', { variant: 'success' });
    } finally {
      setRemovingId(null);
    }
  };

  const handleFetchErpData = async (item: AdjustmentMarkedItem) => {
    if (!branch || !warehouse) {
      enqueueSnackbar('Branch and warehouse are required for ERP lookup', { variant: 'warning' });
      return;
    }

    setFetchingId(item.id);
    try {
      const response = await servicesAPI.getAdjustmentData({
        selectedItems: [{
          form: item.form,
          grade: item.grade,
          size: item.size,
          finish: item.finish,
          ext_finish: item.ext_finish || '',
          width: Number(item.width) || 0,
          length: Number(item.length) || 0,
          location: item.location || '',
          branch,
          warehouse,
          inv_type: item.type || '',
          inv_quality: item.quality || '',
          tag_id: item.tag_id || item.sys_tag_no,
        }],
        branch,
        warehouse,
      });
      const data = response.data?.data || [];
      setErpResults((prev) => ({ ...prev, [item.id]: data }));
      setExpandedRows((prev) => new Set(prev).add(item.id));

      if (data.length > 0) {
        const ctlNo = data[0]?.prd_itm_ctl_no;
        if (ctlNo) {
          setItems((prev) => {
            const next = prev.map((row) =>
              row.id === item.id ? { ...row, item_control_no: String(ctlNo) } : row
            );
            if (location_id) saveAdjustmentItems(location_id, next);
            return next;
          });
        }
        enqueueSnackbar(`Found ${data.length} ERP record(s)`, { variant: 'success' });
      } else {
        enqueueSnackbar('No ERP adjustment data found for this item', { variant: 'info' });
      }
    } catch (error) {
      console.error('Error fetching ERP adjustment data:', error);
      enqueueSnackbar('Failed to fetch ERP adjustment data', { variant: 'error' });
    } finally {
      setFetchingId(null);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAdjustDialog = (item: AdjustmentMarkedItem) => {
    setAdjustingItem(item);
    setAdjustForm({
      adjustment_type: item.adjustment_type || item.type || '',
      adjustment_location: item.adjustment_location || item.location || '',
      adjustment_quantity: item.adjustment_quantity != null ? String(item.adjustment_quantity) : '',
      adjustment_amount: item.adjustment_amount != null ? String(item.adjustment_amount) : '',
    });
    setAdjustDialogOpen(true);
  };

  const closeAdjustDialog = () => {
    setAdjustDialogOpen(false);
    setAdjustingItem(null);
  };

  const handleSaveAdjustment = () => {
    if (!adjustingItem) return;

    const foundOnly = isFoundItem(adjustingItem);
    if (foundOnly) {
      if (!adjustForm.adjustment_amount.trim()) {
        enqueueSnackbar('Amount is required for found items', { variant: 'warning' });
        return;
      }
    } else if (isOverUnderItem(adjustingItem)) {
      if (!adjustForm.adjustment_type.trim() || !adjustForm.adjustment_location.trim()
        || !adjustForm.adjustment_quantity.trim() || !adjustForm.adjustment_amount.trim()) {
        enqueueSnackbar('Type, Location, Quantity, and Amount are required', { variant: 'warning' });
        return;
      }
    }

    setItems((prev) => {
      const next = prev.map((item) => {
        if (item.id !== adjustingItem.id) return item;
        return {
          ...item,
          adjustment_type: foundOnly ? undefined : adjustForm.adjustment_type,
          adjustment_location: foundOnly ? undefined : adjustForm.adjustment_location,
          adjustment_quantity: foundOnly ? undefined : adjustForm.adjustment_quantity,
          adjustment_amount: adjustForm.adjustment_amount,
        };
      });
      if (location_id) saveAdjustmentItems(location_id, next);
      return next;
    });

    enqueueSnackbar('Adjustment details saved', { variant: 'success' });
    closeAdjustDialog();
  };

  const buildApprovalItems = () => {
    type ApprovalItemPayload = Parameters<typeof servicesAPI.saveAdjustmentForApproval>[0]['items'][number];
    const approvalItems: ApprovalItemPayload[] = [];

    items.forEach((item) => {
      const amount = parseFloat(String(item.adjustment_amount || 0)) || 0;
      const adjQty = parseFloat(String(item.adjustment_quantity ?? item.variance ?? 0)) || 0;
      const countedQty = Number(item.counted_qty) || 0;
      const unitCost = countedQty > 0 ? Math.round((amount / countedQty) * 1000000) / 1000000 : 0;
      const foundOnly = isFoundItem(item);

      const baseItem = {
        item_control_no: item.item_control_no || undefined,
        system_tag_no: item.sys_tag_no || item.tag_id || undefined,
        form: item.form,
        grade: item.grade,
        size: item.size,
        finish: item.finish || '',
        ext_finish: item.ext_finish || '',
        width: Number(item.width) || 0,
        length: Number(item.length) || 0,
        location: foundOnly ? (item.location || '') : (item.adjustment_location || item.location || ''),
        mill: item.mill || undefined,
        heat: item.heat || undefined,
        quality_standards: item.quality || undefined,
        type: foundOnly ? (item.type || undefined) : (item.adjustment_type || item.type || undefined),
        system_qty: Number(item.system_qty) || 0,
        counted_qty: countedQty,
        cost: unitCost,
        cost_uom: item.cost_uom || 'CWT',
      };

      if (foundOnly) {
        const physicalCount = {
          section_desc: (item.section_desc || '').trim() || undefined,
          count_tag_no: resolveCountTagNoForApproval(item),
        };
        const hasPhysicalMeta = Boolean(physicalCount.section_desc || physicalCount.count_tag_no);
        approvalItems.push({
          ...baseItem,
          variance_qty: Number(item.variance) || 0,
          adj_qty: Number(item.variance) || 0,
          amount,
          adj_typ: 'NEW',
          adj_res_data: hasPhysicalMeta ? { physicalCount } : undefined,
        });
        return;
      }

      if (isOverUnderItem(item) || adjQty !== 0) {
        approvalItems.push({
          ...baseItem,
          variance_qty: Number(item.variance) || 0,
          adj_qty: adjQty,
          amount,
          adj_typ: 'QTY',
        });
      }
    });

    return approvalItems;
  };

  const handleSendForApproval = () => {
    if (items.length === 0) {
      enqueueSnackbar('No items to submit', { variant: 'warning' });
      return;
    }

    const incomplete = items.filter((item) => !itemHasAdjustment(item));
    if (incomplete.length > 0) {
      enqueueSnackbar(
        `Enter adjustment details for all items before submitting (${incomplete.length} remaining)`,
        { variant: 'warning', autoHideDuration: 6000 }
      );
      return;
    }

    const zeroAmountItems = items.filter((item) => (parseFloat(String(item.adjustment_amount || 0)) || 0) <= 0);
    if (zeroAmountItems.length > 0) {
      enqueueSnackbar('Items with $0 amount cannot be submitted for approval', { variant: 'error' });
      return;
    }

    setApprovalDialogOpen(true);
  };

  const handleConfirmApproval = async () => {
    setApprovalDialogOpen(false);
    if (!location_id) return;

    try {
      setSubmittingApproval(true);
      enqueueSnackbar('Submitting adjustment for approval...', { variant: 'info' });

      const approvalItems = buildApprovalItems();
      if (approvalItems.length === 0) {
        enqueueSnackbar('No valid adjustment lines to submit', { variant: 'warning' });
        return;
      }

      const adjName = `${branch || 'Unknown'}_${warehouse || 'Unknown'}_${locationDesc || `Location_${location_id}`}_${new Date().toISOString().split('T')[0]}`;
      const response = await servicesAPI.saveAdjustmentForApproval({
        location_id: Number(location_id),
        adj_name: adjName,
        items: approvalItems,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to save adjustment for approval');
      }

      const createdApprovals = Array.isArray(response.data?.data?.created_approvals)
        ? response.data.data.created_approvals
        : [];
      const createdSummary = createdApprovals.length > 0
        ? createdApprovals
            .map((entry: { request_type?: string; aprvl_id?: number }) => `${entry.request_type || 'STANDARD'}: ${entry.aprvl_id ?? '—'}`)
            .join(' | ')
        : `Approval ID: ${response.data.data.aprvl_id}`;

      clearAdjustmentItems(location_id);
      setItems([]);
      enqueueSnackbar(`Submitted for approval successfully! ${createdSummary}`, { variant: 'success', autoHideDuration: 6000 });
      navigate('/adjustment-records');
    } catch (error) {
      console.error('Error submitting adjustment for approval:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      enqueueSnackbar(`Failed to submit for approval: ${message}`, { variant: 'error' });
    } finally {
      setSubmittingApproval(false);
    }
  };

  const getStickyCellSx = (rowBg: string) => ({
    position: 'sticky' as const,
    right: 0,
    zIndex: 2,
    backgroundColor: rowBg,
    boxShadow: `-8px 0 16px ${alpha('#000', 0.08)}`,
    borderLeft: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
  });

  const handleExport = () => {
    if (filteredItems.length === 0) {
      enqueueSnackbar('No items to export', { variant: 'warning' });
      return;
    }

    const rows = filteredItems.map((item) => ({
      'System Tag No': item.sys_tag_no || item.tag_id || '',
      Form: item.form,
      Grade: item.grade,
      Size: item.size,
      Finish: item.finish,
      'Ext Finish': item.ext_finish || '',
      Width: item.width ?? '',
      Length: item.length ?? '',
      Location: item.location || '',
      Section: item.section_desc || '',
      Mill: item.mill || '',
      Heat: item.heat || '',
      Type: item.type || '',
      Quality: item.quality || '',
      Weight: item.weight ?? '',
      Branch: item.branch || branch || '',
      Warehouse: item.warehouse || warehouse || '',
      'System Qty': item.system_qty,
      'Counted Qty': item.counted_qty,
      Variance: item.variance,
      'Recon Status': item.recon_status || '',
      Status: item.status,
      'Marked By': item.marked_by_name || '',
      'Marked At': item.marked_at || '',
      Reason: item.adjustment_reason || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Adjustments');
    XLSX.writeFile(wb, `Adjustment_Marked_Location_${location_id}.xlsx`);
    enqueueSnackbar('Exported successfully', { variant: 'success' });
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const headCellSx = {
    bgcolor: NAVY,
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.72rem',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap' as const,
    py: 1.25,
    borderBottom: 'none',
  };

  const statCards = [
    { label: 'Marked', value: stats.total, icon: <Inventory2Outlined />, color: NAVY_MID },
    { label: 'Over', value: stats.over, icon: <TrendingUp />, color: theme.palette.info.main },
    { label: 'Under', value: stats.under, icon: <TrendingDown />, color: theme.palette.warning.main },
    { label: 'Zero Var', value: stats.match, icon: <CheckCircleOutline />, color: theme.palette.success.main },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1800, mx: 'auto' }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" onClick={() => navigate('/dashboard')} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <Home sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        <Link underline="hover" color="inherit" onClick={() => navigate(-1)} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <LocationOn sx={{ mr: 0.5 }} fontSize="inherit" />
          Reconciliation
        </Link>
        <Typography color="text.primary">Adjustments</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 2.5,
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${alpha(NAVY, 0.12)}`,
          background: `linear-gradient(135deg, ${alpha(NAVY, 0.06)} 0%, #fff 45%, ${alpha(NAVY_MID, 0.05)} 100%)`,
        }}
      >
        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${NAVY}, ${NAVY_MID}, #4a9fd8)` }} />
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ p: { xs: 2, md: 2.5 } }}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  background: `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})`,
                  color: '#fff',
                  boxShadow: `0 8px 20px ${alpha(NAVY, 0.28)}`,
                }}
              >
                <Tune fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: NAVY, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                  Marked for Adjustment
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Location {location_id || '—'}
                  {branch || warehouse ? ` · ${branch || '—'}${warehouse ? ` / ${warehouse}` : ''}` : ''}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<ArrowBack />} variant="outlined" onClick={() => navigate(-1)} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
              Back
            </Button>
            <Button startIcon={<Refresh />} variant="outlined" onClick={loadItems} disabled={loading} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
              Refresh
            </Button>
            <Button
              startIcon={<Download />}
              variant="outlined"
              onClick={handleExport}
              disabled={filteredItems.length === 0}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
            >
              Export
            </Button>
            <Button
              startIcon={submittingApproval ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutline />}
              variant="contained"
              onClick={handleSendForApproval}
              disabled={items.length === 0 || submittingApproval}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})`,
                boxShadow: `0 8px 18px ${alpha(NAVY, 0.28)}`,
              }}
            >
              Send for Approval
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Stats */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {statCards.map((card) => (
          <Grid item xs={6} md={3} key={card.label}>
            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: 2.5,
                border: `1px solid ${alpha(card.color, 0.18)}`,
                background: alpha(card.color, 0.04),
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {card.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>
                    {card.value}
                  </Typography>
                </Box>
                <Box sx={{ color: card.color, opacity: 0.85 }}>{card.icon}</Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Search + table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(NAVY, 0.12)}`,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}` }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search system tag, form, grade, mill, heat, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: NAVY_MID }} />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: 480,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                bgcolor: alpha(NAVY, 0.03),
              },
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <Inventory2Outlined sx={{ fontSize: 48, color: alpha(NAVY, 0.35), mb: 1 }} />
            <Typography variant="h6" sx={{ color: NAVY, fontWeight: 700, mb: 0.5 }}>
              {items.length === 0 ? 'No adjustment items yet' : 'No matches for your search'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {items.length === 0
                ? 'Mark items from reconciliation to review them here. Items are kept in this browser session only.'
                : 'Try a different tag, form, or grade.'}
            </Typography>
            <Button variant="contained" onClick={() => (items.length === 0 ? navigate(-1) : setSearchTerm(''))} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, background: `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})` }}>
              {items.length === 0 ? 'Back to Reconciliation' : 'Clear Search'}
            </Button>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={headCellSx} />
                  <TableCell sx={headCellSx}>System Tag No</TableCell>
                  <TableCell sx={headCellSx}>Form</TableCell>
                  <TableCell sx={headCellSx}>Grade</TableCell>
                  <TableCell sx={headCellSx}>Size</TableCell>
                  <TableCell sx={headCellSx}>Finish</TableCell>
                  <TableCell sx={headCellSx}>Ext Finish</TableCell>
                  <TableCell sx={headCellSx} align="right">Width</TableCell>
                  <TableCell sx={headCellSx} align="right">Length</TableCell>
                  <TableCell sx={headCellSx}>Location</TableCell>
                  <TableCell sx={headCellSx}>Section</TableCell>
                  <TableCell sx={headCellSx}>Mill</TableCell>
                  <TableCell sx={headCellSx}>Heat</TableCell>
                  <TableCell sx={headCellSx}>Type</TableCell>
                  <TableCell sx={headCellSx}>Quality</TableCell>
                  <TableCell sx={headCellSx} align="right">Weight</TableCell>
                  <TableCell sx={headCellSx}>Branch</TableCell>
                  <TableCell sx={headCellSx}>Warehouse</TableCell>
                  <TableCell sx={headCellSx} align="right">System Qty</TableCell>
                  <TableCell sx={headCellSx} align="right">Counted Qty</TableCell>
                  <TableCell sx={headCellSx} align="right">Variance</TableCell>
                  <TableCell sx={headCellSx}>Recon</TableCell>
                  <TableCell sx={headCellSx}>Marked By</TableCell>
                  <TableCell sx={headCellSx}>Marked At</TableCell>
                  <TableCell sx={{ ...headCellSx, ...getStickyCellSx(NAVY), zIndex: 4 }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item, index) => {
                  const tags = parseTags(item.sys_tag_no || item.tag_id);
                  const variance = Number(item.variance) || 0;
                  const isExpanded = expandedRows.has(item.id);
                  const erpRows = erpResults[item.id] || [];
                  const rowBg = index % 2 === 0 ? ROW_BG_EVEN : ROW_BG_ODD;
                  const foundItem = isFoundItem(item);
                  const hasAdjustment = itemHasAdjustment(item);

                  return (
                    <React.Fragment key={item.id}>
                      <TableRow
                        hover
                        sx={{
                          bgcolor: rowBg,
                          '&:hover': { bgcolor: ROW_BG_HOVER },
                          '&:hover td': { backgroundColor: ROW_BG_HOVER },
                          '&:hover td:last-of-type': { backgroundColor: ROW_BG_HOVER },
                          '& td': {
                            borderColor: alpha(theme.palette.divider, 0.6),
                            py: 1,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            backgroundColor: rowBg,
                          },
                        }}
                      >
                        <TableCell>
                          <IconButton size="small" onClick={() => toggleExpand(item.id)} disabled={erpRows.length === 0 && fetchingId !== item.id}>
                            {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ maxWidth: 220 }}>
                            {tags.length > 0 ? (
                              tags.map((tag) => (
                                <Chip
                                  key={`${item.id}-${tag}`}
                                  label={tag}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontWeight: 700,
                                    fontSize: '0.68rem',
                                    bgcolor: alpha(NAVY_MID, 0.1),
                                    color: NAVY,
                                    border: `1px solid ${alpha(NAVY_MID, 0.25)}`,
                                  }}
                                />
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">—</Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>{display(item.form)}</TableCell>
                        <TableCell>{display(item.grade)}</TableCell>
                        <TableCell>{display(item.size)}</TableCell>
                        <TableCell>{display(item.finish)}</TableCell>
                        <TableCell>{display(item.ext_finish)}</TableCell>
                        <TableCell align="right">{fmt(item.width)}</TableCell>
                        <TableCell align="right">{fmt(item.length)}</TableCell>
                        <TableCell>{display(item.location)}</TableCell>
                        <TableCell>{display(item.section_desc)}</TableCell>
                        <TableCell>{display(item.mill)}</TableCell>
                        <TableCell>{display(item.heat)}</TableCell>
                        <TableCell>{display(item.type)}</TableCell>
                        <TableCell>{display(item.quality)}</TableCell>
                        <TableCell align="right">{fmt(item.weight)}</TableCell>
                        <TableCell>{display(item.branch || branch)}</TableCell>
                        <TableCell>{display(item.warehouse || warehouse)}</TableCell>
                        <TableCell align="right">{fmt(item.system_qty)}</TableCell>
                        <TableCell align="right">{fmt(item.counted_qty)}</TableCell>
                        <TableCell align="right">
                          <Chip size="small" label={fmt(variance)} color={varianceColor(variance)} sx={{ fontWeight: 700, height: 22 }} />
                        </TableCell>
                        <TableCell>
                          {item.recon_status ? (
                            <Stack spacing={0.5} alignItems="flex-start">
                              <Chip size="small" label={foundItem ? 'Found' : item.recon_status} color={statusColor(item.recon_status)} variant="outlined" sx={{ height: 22, fontWeight: 600 }} />
                              {hasAdjustment && (
                                <Chip size="small" label="Adjusted" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                              )}
                            </Stack>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{display(item.marked_by_name)}</TableCell>
                        <TableCell>{formatDate(item.marked_at)}</TableCell>
                        <TableCell align="center" sx={getStickyCellSx(rowBg)}>
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            <Tooltip title={foundItem ? 'Add adjustment amount' : 'Adjust type, location, quantity & amount'}>
                              <IconButton size="small" color="secondary" onClick={() => openAdjustDialog(item)}>
                                <EditNote fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Lookup ERP inventory">
                              <span>
                                <IconButton size="small" color="primary" onClick={() => handleFetchErpData(item)} disabled={fetchingId === item.id}>
                                  {fetchingId === item.id ? <CircularProgress size={16} /> : <Search fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Remove from list">
                              <span>
                                <IconButton size="small" color="error" onClick={() => handleRemove(item.id)} disabled={removingId === item.id}>
                                  {removingId === item.id ? <CircularProgress size={16} /> : <DeleteOutline fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell colSpan={25} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded && erpRows.length > 0} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 2.5, py: 1.75, bgcolor: alpha(NAVY_MID, 0.04) }}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: NAVY }}>
                                  ERP Inventory Matches ({erpRows.length})
                                </Typography>
                                <Chip size="small" label={item.form} sx={{ fontWeight: 600 }} />
                              </Stack>
                              <Divider sx={{ mb: 1.25 }} />
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    {['Item Ctrl No', 'Form', 'Grade', 'Size', 'Finish', 'Location', 'Mill', 'Heat', 'Type', 'Quality', 'OHD Qty', 'OHD Wgt', 'OHD Pcs'].map((h) => (
                                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: NAVY, py: 0.75 }}>{h}</TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {erpRows.map((row, idx) => (
                                    <TableRow key={`${item.id}-erp-${idx}`}>
                                      <TableCell>{row.prd_itm_ctl_no}</TableCell>
                                      <TableCell>{row.prd_frm}</TableCell>
                                      <TableCell>{row.prd_grd}</TableCell>
                                      <TableCell>{row.prd_size}</TableCell>
                                      <TableCell>{row.prd_fnsh}</TableCell>
                                      <TableCell>{row.prd_loc}</TableCell>
                                      <TableCell>{row.prd_mill}</TableCell>
                                      <TableCell>{row.prd_heat}</TableCell>
                                      <TableCell>{row.prd_invt_typ}</TableCell>
                                      <TableCell>{row.prd_invt_qlty}</TableCell>
                                      <TableCell>{row.prd_ohd_qty}</TableCell>
                                      <TableCell>{row.prd_ohd_wgt}</TableCell>
                                      <TableCell>{row.prd_ohd_pcs}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={adjustDialogOpen} onClose={closeAdjustDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>
          {adjustingItem && isFoundItem(adjustingItem) ? 'Add Adjustment Amount' : 'Item Adjustment'}
        </DialogTitle>
        <DialogContent dividers>
          {adjustingItem && (
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(NAVY, 0.03) }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: NAVY }}>
                  {adjustingItem.form} · {adjustingItem.size} · {adjustingItem.grade}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tag: {adjustingItem.sys_tag_no || adjustingItem.tag_id || '—'}
                  {' · '}
                  {isFoundItem(adjustingItem) ? 'Found item' : isOverUnderItem(adjustingItem) ? 'Over/Under count' : 'Adjustment'}
                </Typography>
              </Paper>

              {adjustingItem && isFoundItem(adjustingItem) ? (
                <TextField
                  label="Amount"
                  type="number"
                  fullWidth
                  required
                  value={adjustForm.adjustment_amount}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, adjustment_amount: e.target.value }))}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              ) : (
                <>
                  <TextField
                    select
                    label="Type"
                    fullWidth
                    required
                    value={adjustForm.adjustment_type}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, adjustment_type: e.target.value }))}
                  >
                    {['M', 'D', 'W', 'S'].map((opt) => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Location"
                    fullWidth
                    required
                    value={adjustForm.adjustment_location}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, adjustment_location: e.target.value }))}
                  />
                  <TextField
                    label="Quantity"
                    type="number"
                    fullWidth
                    required
                    value={adjustForm.adjustment_quantity}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, adjustment_quantity: e.target.value }))}
                    inputProps={{ step: '0.01' }}
                    helperText={`Variance: ${fmt(adjustingItem.variance)}`}
                  />
                  <TextField
                    label="Amount"
                    type="number"
                    fullWidth
                    required
                    value={adjustForm.adjustment_amount}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, adjustment_amount: e.target.value }))}
                    inputProps={{ min: 0, step: '0.01' }}
                  />
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeAdjustDialog} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveAdjustment}
            sx={{ textTransform: 'none', fontWeight: 700, background: `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})` }}
          >
            Save Adjustment
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>Send for Approval</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Submit {items.length} marked item{items.length === 1 ? '' : 's'} to the gatekeeper for approval?
            Standard adjustments and new found items will be routed to the appropriate approval queue.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setApprovalDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmApproval}
            disabled={submittingApproval}
            startIcon={submittingApproval ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutline />}
            sx={{ textTransform: 'none', fontWeight: 700, background: `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})` }}
          >
            Confirm & Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdjustmentMarkedItemsPage;
