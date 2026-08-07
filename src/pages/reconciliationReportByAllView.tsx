import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  Typography, Card, CardContent, IconButton, Box, Button, TextField, InputAdornment,
  Checkbox, ListItemText, Menu, MenuItem, Divider, Chip, Grid, alpha
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LayersIcon from '@mui/icons-material/Layers';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import * as XLSX from 'xlsx';

interface ColumnDef {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  getDisplayValue: (row: any) => React.ReactNode;
  getExcelValue: (row: any) => any;
}

const REPORT_COLUMNS: ColumnDef[] = [
  {
    id: 'sys_tag_no',
    label: 'Sys Tag No',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {row.sys_tag_no || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.sys_tag_no
  },
  {
    id: 'form',
    label: 'Form',
    align: 'left',
    getDisplayValue: (row) => (
      <Chip
        label={row.form || 'N/A'}
        size="small"
        sx={{
          bgcolor: '#eff6ff',
          color: '#1d4ed8',
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: '6px',
          border: '1px solid #bfdbfe'
        }}
      />
    ),
    getExcelValue: (row) => row.form
  },
  {
    id: 'grade',
    label: 'Grade',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" fontWeight={600} color="#1e293b">
        {row.grade || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.grade
  },
  {
    id: 'size',
    label: 'Size',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" fontWeight={600} color="#1e293b">
        {row.size}
      </Typography>
    ),
    getExcelValue: (row) => row.size
  },
  {
    id: 'finish',
    label: 'Finish',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155">
        {row.finish || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.finish
  },
  {
    id: 'ext_finish',
    label: 'Ext. Finish',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155">
        {row.ext_finish || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.ext_finish
  },
  {
    id: 'width',
    label: 'Width',
    align: 'right',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#475569">
        {row.width != null && Number(row.width) !== 0 ? Number(row.width).toFixed(4) : '—'}
      </Typography>
    ),
    getExcelValue: (row) => Number(row.width)
  },
  {
    id: 'length',
    label: 'Length',
    align: 'right',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#475569">
        {row.length != null && Number(row.length) !== 0 ? Number(row.length).toFixed(4) : '—'}
      </Typography>
    ),
    getExcelValue: (row) => Number(row.length)
  },
  {
    id: 'location',
    label: 'Location',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155">
        {row.location || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.location
  },
  {
    id: 'mill',
    label: 'Mill',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155">
        {row.mill || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.mill
  },
  {
    id: 'heat',
    label: 'Heat',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155">
        {row.heat || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.heat
  },
  {
    id: 'branch',
    label: 'Branch',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155">
        {row.branch || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.branch
  },
  {
    id: 'warehouse',
    label: 'Warehouse',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155">
        {row.warehouse || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.warehouse
  },
  {
    id: 'inv_type',
    label: 'Inv Type',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155">
        {row.inv_type || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.inv_type
  },
  {
    id: 'inv_quality',
    label: 'Inv Quality',
    align: 'left',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155">
        {row.inv_quality || '—'}
      </Typography>
    ),
    getExcelValue: (row) => row.inv_quality
  },
  {
    id: 'status',
    label: 'Status',
    align: 'left',
    getDisplayValue: (row) => {
      const val = row.status || '';
      const colorMap: Record<string, { bg: string; color: string; border: string }> = {
        'Match': { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
        'Over Count': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
        'Under Count': { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
        'No Match': { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
      };
      const style = colorMap[val] || { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
      return (
        <Chip
          label={val || '—'}
          size="small"
          sx={{
            fontWeight: 600,
            fontSize: '0.75rem',
            bgcolor: style.bg,
            color: style.color,
            border: `1px solid ${style.border}`,
            borderRadius: '6px'
          }}
        />
      );
    },
    getExcelValue: (row) => row.status
  },

  {
    id: 'total_system_qty',
    label: 'System Qty',
    align: 'right',
    getDisplayValue: (row) => (
      <Typography variant="body2" fontWeight={500} color="#334155">
        {row.total_system_qty}
      </Typography>
    ),
    getExcelValue: (row) => Number(row.total_system_qty)
  },
  {
    id: 'total_counted_qty',
    label: 'Counted Qty',
    align: 'right',
    getDisplayValue: (row) => (
      <Typography variant="body2" fontWeight={600} color="#0f172a">
        {row.total_counted_qty}
      </Typography>
    ),
    getExcelValue: (row) => Number(row.total_counted_qty)
  },
  {
    id: 'variance_qty',
    label: 'Var Qty',
    align: 'right',
    getDisplayValue: (row) => {
      const val = Number(row.variance_qty || 0);
      const isPositive = val > 0;
      const isNegative = val < 0;
      return (
        <Chip
          label={val > 0 ? `+${val}` : `${val}`}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            bgcolor: isPositive ? '#ecfdf5' : isNegative ? '#fff1f2' : '#f8fafc',
            color: isPositive ? '#047857' : isNegative ? '#be123c' : '#475569',
            border: `1px solid ${isPositive ? '#a7f3d0' : isNegative ? '#fecdd3' : '#e2e8f0'}`,
            borderRadius: '6px'
          }}
        />
      );
    },
    getExcelValue: (row) => Number(row.variance_qty)
  },
  {
    id: 'ohdtons',
    label: 'OHD Tons',
    align: 'right',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#475569">
        {Number(row.ohdtons || 0).toFixed(2)}
      </Typography>
    ),
    getExcelValue: (row) => Number(row.ohdtons)
  },
  {
    id: 'counttons',
    label: 'Count Tons',
    align: 'right',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#475569">
        {Number(row.counttons || 0).toFixed(2)}
      </Typography>
    ),
    getExcelValue: (row) => Number(row.counttons)
  },
  {
    id: 'vartons',
    label: 'Var Tons',
    align: 'right',
    getDisplayValue: (row) => {
      const val = Number(row.vartons || 0);
      const isPositive = val > 0;
      const isNegative = val < 0;
      return (
        <Chip
          label={val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            bgcolor: isPositive ? '#ecfdf5' : isNegative ? '#fff1f2' : '#f8fafc',
            color: isPositive ? '#047857' : isNegative ? '#be123c' : '#475569',
            border: `1px solid ${isPositive ? '#a7f3d0' : isNegative ? '#fecdd3' : '#e2e8f0'}`,
            borderRadius: '6px'
          }}
        />
      );
    },
    getExcelValue: (row) => Number(row.vartons)
  },
  {
    id: 'prd_ohd_mat_cst',
    label: 'Mat Cost',
    align: 'right',
    getDisplayValue: (row) => (
      <Typography variant="body2" color="#334155">
        ${Number(row.prd_ohd_mat_cst || 0).toFixed(2)}
      </Typography>
    ),
    getExcelValue: (row) => Number(row.prd_ohd_mat_cst || 0)
  },
  {
    id: 'prd_ohd_mat_val',
    label: 'Mat Value',
    align: 'right',
    getDisplayValue: (row) => (
      <Typography variant="body2" fontWeight={700} color="#0f172a">
        ${Number(row.prd_ohd_mat_val || 0).toFixed(2)}
      </Typography>
    ),
    getExcelValue: (row) => Number(row.prd_ohd_mat_val || 0)
  }
];

const TEXT_LABEL_COLS = ['sys_tag_no', 'grade', 'size', 'finish', 'ext_finish', 'width', 'length', 'location', 'mill', 'heat', 'branch', 'warehouse', 'inv_type', 'inv_quality', 'status'];



const ReconciliationReportByAllView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const reportData = location.state?.reportData || [];
  const locationName = location.state?.locationName || 'Unknown Location';

  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(REPORT_COLUMNS.map((col) => [col.id, true]))
  );
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const activeColumns = REPORT_COLUMNS.filter((col) => visibleColumns[col.id]);
  const visibleCount = activeColumns.length;

  const toggleRowExpand = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const filteredReportData = useMemo(() => {
    if (!searchTerm.trim()) return reportData;
    const term = searchTerm.toLowerCase();
    return reportData.filter((row: any) =>
      (row.form        && String(row.form).toLowerCase().includes(term)) ||
      (row.grade       && String(row.grade).toLowerCase().includes(term)) ||
      (row.size        && String(row.size).toLowerCase().includes(term)) ||
      (row.finish      && String(row.finish).toLowerCase().includes(term)) ||
      (row.ext_finish  && String(row.ext_finish).toLowerCase().includes(term)) ||
      (row.location    && String(row.location).toLowerCase().includes(term)) ||
      (row.mill        && String(row.mill).toLowerCase().includes(term)) ||
      (row.heat        && String(row.heat).toLowerCase().includes(term)) ||
      (row.branch      && String(row.branch).toLowerCase().includes(term)) ||
      (row.warehouse   && String(row.warehouse).toLowerCase().includes(term)) ||
      (row.inv_type    && String(row.inv_type).toLowerCase().includes(term)) ||
      (row.inv_quality && String(row.inv_quality).toLowerCase().includes(term)) ||
      (row.status      && String(row.status).toLowerCase().includes(term)) ||
      (row.sys_tag_no  && String(row.sys_tag_no).toLowerCase().includes(term))
    );
  }, [reportData, searchTerm]);

  const stats = useMemo(() => {
    let totalSystemQty = 0;
    let totalCountedQty = 0;
    let totalOhdTons = 0;
    let totalCountTons = 0;
    let totalVarTons = 0;
    let totalMatVal = 0;

    reportData.forEach((row: any) => {
      totalSystemQty  += Number(row.total_system_qty  || 0);
      totalCountedQty += Number(row.total_counted_qty || 0);
      totalOhdTons    += Number(row.ohdtons           || 0);
      totalCountTons  += Number(row.counttons         || 0);
      totalVarTons    += Number(row.vartons           || 0);
      totalMatVal     += Number(row.prd_ohd_mat_val   || 0);
    });

    return { totalRecords: reportData.length, totalSystemQty, totalCountedQty, totalOhdTons, totalCountTons, totalVarTons, totalMatVal };
  }, [reportData]);

  const filteredTotals = useMemo(() => {
    let systemQty = 0;
    let countedQty = 0;
    let varianceQty = 0;
    let ohdTons = 0;
    let countTons = 0;
    let varTons = 0;
    let matCost = 0;
    let matVal = 0;

    filteredReportData.forEach((row: any) => {
      systemQty   += Number(row.total_system_qty  || 0);
      countedQty  += Number(row.total_counted_qty || 0);
      varianceQty += Number(row.variance_qty      || 0);
      ohdTons     += Number(row.ohdtons           || 0);
      countTons   += Number(row.counttons         || 0);
      varTons     += Number(row.vartons           || 0);
      matCost     += Number(row.prd_ohd_mat_cst   || 0);
      matVal      += Number(row.prd_ohd_mat_val   || 0);
    });

    return { systemQty, countedQty, varianceQty, ohdTons, countTons, varTons, matCost, matVal };
  }, [filteredReportData]);

  const toggleColumn = (colId: string) => {
    setVisibleColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  const handleSelectAllColumns = () => {
    setVisibleColumns(Object.fromEntries(REPORT_COLUMNS.map((col) => [col.id, true])));
  };

  const handleHideAllColumns = () => {
    setVisibleColumns(Object.fromEntries(REPORT_COLUMNS.map((col) => [col.id, false])));
  };

  const handleExportExcel = () => {
    if (filteredReportData.length === 0 || activeColumns.length === 0) return;

    const formattedData: any[] = filteredReportData.map((row: any) => {
      const dataRow: Record<string, any> = {};
      activeColumns.forEach((col) => { dataRow[col.label] = col.getExcelValue(row); });
      return dataRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reconciliation Report By All');
    XLSX.writeFile(workbook, `Reconciliation_ReportByAll_${locationName.replace(/\s+/g, '_')}.xlsx`);
  };

  // Helper: get child items array from row
  const getChildItems = (row: any): any[] => {
    const items = row.system_combined_items;
    if (!items) return [];
    if (Array.isArray(items)) return items;
    // If it's a string (JSON), parse it
    if (typeof items === 'string') {
      try { return JSON.parse(items); } catch { return []; }
    }
    return [];
  };

  // Total columns including the expand button column
  const totalColSpan = activeColumns.length + 1;

  return (
    <Box sx={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ flexShrink: 0, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => navigate(-1)}
              sx={{ bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#f8fafc' } }}
            >
              <ArrowBackIcon sx={{ color: '#0C2C48' }} />
            </IconButton>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ letterSpacing: '-0.02em' }}>
                  Reconciliation Report By All
                </Typography>
                <Chip
                  icon={<LocationOnIcon fontSize="small" sx={{ color: '#2563eb !important' }} />}
                  label={locationName}
                  sx={{ bgcolor: '#eff6ff', color: '#1e40af', fontWeight: 700, fontSize: '0.85rem', py: 0.5, px: 0.5, borderRadius: '8px', border: '1px solid #bfdbfe' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Detailed inventory breakdown by Form, Grade, Size, Finish, Ext. Finish, Width, Length, Location, Mill, Heat, Branch, Warehouse, Inv Type, Inv Quality, Status &amp; Sys Tag No
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Total Line Items</Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#2563eb', 0.1), color: '#2563eb', display: 'flex' }}><LayersIcon fontSize="small" /></Box>
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">{stats.totalRecords}</Typography>
                <Typography variant="caption" color="text.secondary">Unique SKU combinations</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Total Counted Qty</Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#7c3aed', 0.1), color: '#7c3aed', display: 'flex' }}><AssessmentIcon fontSize="small" /></Box>
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">{stats.totalCountedQty}</Typography>
                <Typography variant="caption" color="text.secondary">System Qty: <b>{stats.totalSystemQty}</b></Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Net Variance Tons</Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: stats.totalVarTons < 0 ? alpha('#dc2626', 0.1) : stats.totalVarTons > 0 ? alpha('#059669', 0.1) : alpha('#64748b', 0.1), color: stats.totalVarTons < 0 ? '#dc2626' : stats.totalVarTons > 0 ? '#059669' : '#475569', display: 'flex' }}>
                    {stats.totalVarTons < 0 ? <TrendingDownIcon fontSize="small" /> : <TrendingUpIcon fontSize="small" />}
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={800} sx={{ color: stats.totalVarTons < 0 ? '#dc2626' : stats.totalVarTons > 0 ? '#059669' : '#0f172a' }}>
                  {stats.totalVarTons > 0 ? `+${stats.totalVarTons.toFixed(2)}` : stats.totalVarTons.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">Count: <b>{stats.totalCountTons.toFixed(2)}</b> / OHD: <b>{stats.totalOhdTons.toFixed(2)}</b> T</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Total Material Value</Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#d97706', 0.1), color: '#d97706', display: 'flex' }}><AttachMoneyIcon fontSize="small" /></Box>
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">
                  ${stats.totalMatVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">On-Hand Valuation Sum</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Table Card */}
      <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>

        {/* Toolbar */}
        <Box sx={{ flexShrink: 0, p: 1.5, px: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <TextField
            placeholder="Search by Form, Grade, Size, Finish, Location, Mill, Heat, Status..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 320, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc', '& fieldset': { borderColor: '#cbd5e1' }, '&:hover fieldset': { borderColor: '#94a3b8' }, '&.Mui-focused fieldset': { borderColor: '#0C2C48' } } }}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} fontSize="small" /></InputAdornment>),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null
            }}
          />
          <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto', alignItems: 'center' }}>
            {searchTerm && (
              <Button variant="text" size="small" startIcon={<RestartAltIcon />} onClick={() => setSearchTerm('')} sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}>
                Clear Filter
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<ViewColumnIcon />}
              onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
              sx={{ borderRadius: 2, color: '#0C2C48', borderColor: '#cbd5e1', bgcolor: '#ffffff', '&:hover': { borderColor: '#0C2C48', bgcolor: '#f8fafc' }, textTransform: 'none', fontWeight: 600, px: 2 }}
            >
              Columns ({visibleCount}/{REPORT_COLUMNS.length})
            </Button>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              disabled={filteredReportData.length === 0 || activeColumns.length === 0}
              sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)', '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }, textTransform: 'none', fontWeight: 700, px: 2.5 }}
            >
              Export Excel
            </Button>
          </Box>
        </Box>

        {/* Column Selector Menu */}
        <Menu anchorEl={columnMenuAnchor} open={Boolean(columnMenuAnchor)} onClose={() => setColumnMenuAnchor(null)} PaperProps={{ sx: { width: 270, maxHeight: 480, p: 1, borderRadius: 2.5, boxShadow: '0 12px 32px rgba(0,0,0,0.15)' } }}>
          <Box sx={{ px: 1.5, py: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight={700} color="#0f172a">Show / Hide Columns</Typography>
            <Chip label={`${visibleCount}/${REPORT_COLUMNS.length}`} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ px: 1, pb: 1, display: 'flex', gap: 1, justifyContent: 'space-between' }}>
            <Button size="small" onClick={handleSelectAllColumns} disabled={visibleCount === REPORT_COLUMNS.length} sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}>Select All</Button>
            <Button size="small" color="secondary" onClick={handleHideAllColumns} disabled={visibleCount === 0} sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}>Hide All</Button>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {REPORT_COLUMNS.map((col) => (
              <MenuItem key={col.id} dense onClick={() => toggleColumn(col.id)} sx={{ borderRadius: 1.5, my: 0.25, px: 1 }}>
                <Checkbox checked={!!visibleColumns[col.id]} size="small" sx={{ p: 0.5, mr: 1, color: '#94a3b8', '&.Mui-checked': { color: '#0C2C48' } }} />
                <ListItemText primary={col.label} primaryTypographyProps={{ variant: 'body2', fontWeight: visibleColumns[col.id] ? 600 : 400, color: '#1e293b' }} />
              </MenuItem>
            ))}
          </Box>
        </Menu>

        {/* Table */}
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Table stickyHeader sx={{ minWidth: 900 }} aria-label="reconciliation report by all table">
            <TableHead>
              <TableRow>
                {/* Expand/Collapse header cell */}
                <TableCell
                  sx={{
                    fontWeight: 700, bgcolor: '#0C2C48', color: '#ffffff', py: 1.75, px: 1,
                    fontSize: '0.825rem', borderBottom: 'none', whiteSpace: 'nowrap',
                    top: 0, zIndex: 10, width: 48, minWidth: 48
                  }}
                />
                {activeColumns.map((col) => (
                  <TableCell key={col.id} align={col.align} sx={{ fontWeight: 700, bgcolor: '#0C2C48', color: '#ffffff', py: 1.75, px: 2, fontSize: '0.825rem', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: 'none', whiteSpace: 'nowrap', top: 0, zIndex: 10 }}>
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {activeColumns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalColSpan} align="center" sx={{ py: 8 }}>
                    <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>All columns are currently hidden</Typography>
                    <Button variant="outlined" size="small" startIcon={<RestartAltIcon />} onClick={handleSelectAllColumns} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Show All Columns</Button>
                  </TableCell>
                </TableRow>
              ) : filteredReportData.length > 0 ? (
                filteredReportData.map((row: any, index: number) => {
                  const childItems = getChildItems(row);
                  const hasChildren = childItems.length > 1;
                  const isExpanded = expandedRows.has(index);

                  return (
                    <React.Fragment key={index}>
                      {/* Parent Row */}
                      <TableRow
                        sx={{
                          bgcolor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                          '&:hover': { bgcolor: '#f1f5f9' },
                          transition: 'background-color 0.15s ease',
                          ...(isExpanded && {
                            bgcolor: '#eef2ff !important',
                            borderLeft: '3px solid #6366f1',
                          })
                        }}
                      >
                        {/* Expand/Collapse button */}
                        <TableCell sx={{ py: 1, px: 1, borderBottom: '1px solid #f1f5f9', width: 48, minWidth: 48 }}>
                          {hasChildren && (
                            <IconButton
                              size="small"
                              onClick={() => toggleRowExpand(index)}
                              sx={{
                                width: 30, height: 30,
                                bgcolor: isExpanded ? '#6366f1' : '#e2e8f0',
                                color: isExpanded ? '#ffffff' : '#475569',
                                '&:hover': {
                                  bgcolor: isExpanded ? '#4f46e5' : '#cbd5e1',
                                },
                                transition: 'all 0.2s ease',
                                boxShadow: isExpanded ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                              }}
                            >
                              {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                            </IconButton>
                          )}
                        </TableCell>
                        {activeColumns.map((col) => (
                          <TableCell key={col.id} align={col.align} sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                            {col.getDisplayValue(row)}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Expanded child rows — rendered as regular table rows matching parent columns */}
                      {hasChildren && isExpanded && childItems.map((child: any, ci: number) => (
                        <TableRow
                          key={`${index}-child-${ci}`}
                          sx={{
                            bgcolor: ci % 2 === 0 ? '#f5f3ff' : '#ede9fe',
                            borderLeft: '3px solid #a78bfa',
                            '&:hover': { bgcolor: '#e0e7ff' },
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Empty cell under expand column — show child index badge */}
                          <TableCell sx={{ py: 1, px: 1, borderBottom: '1px solid #ddd6fe', width: 48, minWidth: 48 }}>
                            <Box sx={{
                              width: 22, height: 22, borderRadius: '50%',
                              bgcolor: '#8b5cf6', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem', fontWeight: 700, mx: 'auto',
                            }}>
                              {ci + 1}
                            </Box>
                          </TableCell>
                          {activeColumns.map((col) => {
                            // Map parent column IDs to child data fields
                            const childFieldMap: Record<string, string> = {
                              form: 'form',
                              grade: 'grade',
                              size: 'size',
                              finish: 'finish',
                              ext_finish: 'ext_finish',
                              width: 'width',
                              length: 'length',
                              location: 'location',
                              mill: 'mill',
                              heat: 'heat',
                              inv_type: 'inv_type',
                              inv_quality: 'inv_quality',
                              sys_tag_no: 'sys_tag_no',
                              total_system_qty: 'qty',
                            };

                            const childKey = childFieldMap[col.id];
                            let cellContent: React.ReactNode = '—';

                            if (childKey && child[childKey] != null && child[childKey] !== '') {
                              const val = child[childKey];
                              if (col.id === 'width' || col.id === 'length') {
                                cellContent = Number(val) !== 0 ? Number(val).toFixed(4) : '—';
                              } else if (col.id === 'form') {
                                cellContent = (
                                  <Chip
                                    label={val || 'N/A'}
                                    size="small"
                                    sx={{
                                      bgcolor: '#f3e8ff', color: '#7c3aed', fontWeight: 600,
                                      fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #ddd6fe'
                                    }}
                                  />
                                );
                              } else if (col.id === 'sys_tag_no') {
                                cellContent = (
                                  <Typography variant="body2" color="#334155" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    {val}
                                  </Typography>
                                );
                              } else if (col.id === 'total_system_qty') {
                                cellContent = (
                                  <Typography variant="body2" fontWeight={600} color="#4c1d95">
                                    {val}
                                  </Typography>
                                );
                              } else {
                                cellContent = (
                                  <Typography variant="body2" color="#475569" fontSize="0.85rem">
                                    {val}
                                  </Typography>
                                );
                              }
                            }

                            return (
                              <TableCell key={col.id} align={col.align} sx={{ py: 1, px: 2, borderBottom: '1px solid #ddd6fe' }}>
                                {cellContent}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={totalColSpan} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" fontWeight={600} color="text.secondary">No matching record found for "{searchTerm}".</Typography>
                    <Button variant="text" size="small" onClick={() => setSearchTerm('')} sx={{ textTransform: 'none', mt: 1 }}>Clear Search Filter</Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            {/* Sticky Footer */}
            {filteredReportData.length > 0 && activeColumns.length > 0 && (
              <TableFooter sx={{ position: 'sticky', bottom: 0, zIndex: 5 }}>
                <TableRow sx={{ borderTop: '2px solid #cbd5e1', bgcolor: '#f8fafc' }}>
                  {/* Empty cell for expand column */}
                  <TableCell sx={{ fontWeight: 700, py: 1.75, px: 1 }} />
                  {activeColumns.map((col) => {
                    if (col.id === 'form') {
                      return (<TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, color: '#0C2C48', py: 1.75, px: 2 }}>TOTALS ({filteredReportData.length} items)</TableCell>);
                    }
                    if (TEXT_LABEL_COLS.includes(col.id)) {
                      return <TableCell key={col.id} align={col.align} sx={{ py: 1.75, px: 2 }} />;
                    }
                    if (col.id === 'total_system_qty') {
                      return <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, color: '#0f172a', py: 1.75, px: 2 }}>{filteredTotals.systemQty}</TableCell>;
                    }
                    if (col.id === 'total_counted_qty') {
                      return <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, color: '#0f172a', py: 1.75, px: 2 }}>{filteredTotals.countedQty}</TableCell>;
                    }
                    if (col.id === 'variance_qty') {
                      const vq = filteredTotals.varianceQty;
                      return (
                        <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, py: 1.75, px: 2 }}>
                          <Chip label={vq > 0 ? `+${vq}` : `${vq}`} size="small" sx={{ fontWeight: 800, bgcolor: vq > 0 ? '#ecfdf5' : vq < 0 ? '#fff1f2' : '#e2e8f0', color: vq > 0 ? '#047857' : vq < 0 ? '#be123c' : '#334155', border: `1px solid ${vq > 0 ? '#a7f3d0' : vq < 0 ? '#fecdd3' : '#cbd5e1'}` }} />
                        </TableCell>
                      );
                    }
                    if (col.id === 'ohdtons') {
                      return <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, color: '#0f172a', py: 1.75, px: 2 }}>{filteredTotals.ohdTons.toFixed(2)}</TableCell>;
                    }
                    if (col.id === 'counttons') {
                      return <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, color: '#0f172a', py: 1.75, px: 2 }}>{filteredTotals.countTons.toFixed(2)}</TableCell>;
                    }
                    if (col.id === 'vartons') {
                      const v = filteredTotals.varTons;
                      return (
                        <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, py: 1.75, px: 2 }}>
                          <Chip label={v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)} size="small" sx={{ fontWeight: 800, bgcolor: v > 0 ? '#ecfdf5' : v < 0 ? '#fff1f2' : '#e2e8f0', color: v > 0 ? '#047857' : v < 0 ? '#be123c' : '#334155', border: `1px solid ${v > 0 ? '#a7f3d0' : v < 0 ? '#fecdd3' : '#cbd5e1'}` }} />
                        </TableCell>
                      );
                    }
                    if (col.id === 'prd_ohd_mat_cst') {
                      return <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, color: '#0f172a', py: 1.75, px: 2 }}>${filteredTotals.matCost.toFixed(2)}</TableCell>;
                    }
                    if (col.id === 'prd_ohd_mat_val') {
                      return <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, color: '#0f172a', py: 1.75, px: 2 }}>${filteredTotals.matVal.toFixed(2)}</TableCell>;
                    }
                    return <TableCell key={col.id} align={col.align} sx={{ fontWeight: 700, py: 1.75, px: 2 }} />;
                  })}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default ReconciliationReportByAllView;
