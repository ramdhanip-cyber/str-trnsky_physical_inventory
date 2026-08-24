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
} from '@mui/icons-material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';
import { servicesAPI } from '../config/api';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [erpResults, setErpResults] = useState<Record<number, AdjustmentResult[]>>({});
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const loadLocationContext = useCallback(async () => {
    const state = routerLocation.state as { branch?: string; warehouse?: string } | null;
    if (state?.branch && state?.warehouse) {
      setBranch(state.branch);
      setWarehouse(state.warehouse);
      return;
    }
    if (!location_id) return;
    try {
      const response = await servicesAPI.getLocation(location_id);
      setBranch(response.data?.branch || '');
      setWarehouse(response.data?.warehouse || '');
    } catch {
      // Non-fatal
    }
  }, [location_id, routerLocation.state]);

  const loadItems = useCallback(async () => {
    if (!location_id) return;
    setLoading(true);
    try {
      const response = await servicesAPI.getAdjustmentItems(location_id);
      setItems(response.data?.success ? response.data.items || [] : []);
    } catch (error) {
      console.error('Error loading adjustment items:', error);
      enqueueSnackbar('Failed to load marked adjustment items', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [location_id, enqueueSnackbar]);

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

  const handleRemove = async (itemId: number) => {
    setRemovingId(itemId);
    try {
      await servicesAPI.removeFromAdjustment(String(itemId));
      enqueueSnackbar('Item removed from adjustment list', { variant: 'success' });
      setItems((prev) => prev.filter((item) => item.id !== itemId));
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
    } catch (error) {
      console.error('Error removing adjustment item:', error);
      enqueueSnackbar('Failed to remove item', { variant: 'error' });
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
              variant="contained"
              onClick={handleExport}
              disabled={filteredItems.length === 0}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})`,
                boxShadow: `0 8px 18px ${alpha(NAVY, 0.28)}`,
              }}
            >
              Export
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
                ? 'Mark counted items from reconciliation to build this list.'
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
                  <TableCell sx={{ ...headCellSx, position: 'sticky', right: 0, zIndex: 3 }} align="center">
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

                  return (
                    <React.Fragment key={item.id}>
                      <TableRow
                        hover
                        sx={{
                          bgcolor: index % 2 === 0 ? '#fff' : alpha(NAVY, 0.025),
                          '& td': { borderColor: alpha(theme.palette.divider, 0.6), py: 1, fontSize: '0.8rem', whiteSpace: 'nowrap' },
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
                            <Chip size="small" label={item.recon_status} color={statusColor(item.recon_status)} variant="outlined" sx={{ height: 22, fontWeight: 600 }} />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{display(item.marked_by_name)}</TableCell>
                        <TableCell>{formatDate(item.marked_at)}</TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            position: 'sticky',
                            right: 0,
                            bgcolor: index % 2 === 0 ? '#fff' : alpha(NAVY, 0.025),
                            boxShadow: `-6px 0 12px ${alpha('#000', 0.04)}`,
                          }}
                        >
                          <Stack direction="row" spacing={0.25} justifyContent="center">
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
    </Box>
  );
};

export default AdjustmentMarkedItemsPage;
