import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  Paper, Typography, Card, CardContent, IconButton, Box, Button, TextField, InputAdornment,
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

const ReconciliationReportView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const reportData = location.state?.reportData || [];
  const locationName = location.state?.locationName || 'Unknown Location';

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Column visibility state (all columns enabled by default)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(REPORT_COLUMNS.map((col) => [col.id, true]))
  );

  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);

  const activeColumns = REPORT_COLUMNS.filter((col) => visibleColumns[col.id]);
  const visibleCount = activeColumns.length;

  // Filtered dataset
  const filteredReportData = useMemo(() => {
    if (!searchTerm.trim()) return reportData;
    const term = searchTerm.toLowerCase();
    return reportData.filter((row: any) => 
      (row.form && String(row.form).toLowerCase().includes(term)) ||
      (row.size && String(row.size).toLowerCase().includes(term))
    );
  }, [reportData, searchTerm]);

  // Overall KPI stats
  const stats = useMemo(() => {
    let totalSystemQty = 0;
    let totalCountedQty = 0;
    let totalOhdTons = 0;
    let totalCountTons = 0;
    let totalVarTons = 0;
    let totalMatVal = 0;

    reportData.forEach((row: any) => {
      totalSystemQty += Number(row.total_system_qty || 0);
      totalCountedQty += Number(row.total_counted_qty || 0);
      totalOhdTons += Number(row.ohdtons || 0);
      totalCountTons += Number(row.counttons || 0);
      totalVarTons += Number(row.vartons || 0);
      totalMatVal += Number(row.prd_ohd_mat_val || 0);
    });

    return {
      totalRecords: reportData.length,
      totalSystemQty,
      totalCountedQty,
      totalOhdTons,
      totalCountTons,
      totalVarTons,
      totalMatVal
    };
  }, [reportData]);

  // Filtered Totals for sticky Footer
  const filteredTotals = useMemo(() => {
    let systemQty = 0;
    let countedQty = 0;
    let ohdTons = 0;
    let countTons = 0;
    let varTons = 0;
    let matCost = 0;
    let matVal = 0;

    filteredReportData.forEach((row: any) => {
      systemQty += Number(row.total_system_qty || 0);
      countedQty += Number(row.total_counted_qty || 0);
      ohdTons += Number(row.ohdtons || 0);
      countTons += Number(row.counttons || 0);
      varTons += Number(row.vartons || 0);
      matCost += Number(row.prd_ohd_mat_cst || 0);
      matVal += Number(row.prd_ohd_mat_val || 0);
    });

    return { systemQty, countedQty, ohdTons, countTons, varTons, matCost, matVal };
  }, [filteredReportData]);

  const toggleColumn = (colId: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [colId]: !prev[colId]
    }));
  };

  const handleSelectAllColumns = () => {
    setVisibleColumns(Object.fromEntries(REPORT_COLUMNS.map((col) => [col.id, true])));
  };

  const handleHideAllColumns = () => {
    setVisibleColumns(Object.fromEntries(REPORT_COLUMNS.map((col) => [col.id, false])));
  };

  const handleExportExcel = () => {
    if (filteredReportData.length === 0 || activeColumns.length === 0) return;

    const formattedData: any[] = [];
    let lastForm = "";

    filteredReportData.forEach((row: any) => {
      if (row.form !== lastForm) {
        const headerRow: Record<string, any> = {};
        activeColumns.forEach((col) => {
          headerRow[col.label] = col.id === 'form' ? row.form : '';
        });
        formattedData.push(headerRow);
        lastForm = row.form;
      }

      const dataRow: Record<string, any> = {};
      activeColumns.forEach((col) => {
        dataRow[col.label] = col.id === 'form' ? '' : col.getExcelValue(row);
      });
      formattedData.push(dataRow);
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reconciliation Report");

    XLSX.writeFile(workbook, `Reconciliation_Report_${locationName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Fixed Header & Location Bar */}
      <Box sx={{ flexShrink: 0, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={() => navigate(-1)} 
              sx={{ 
                bgcolor: '#ffffff', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0',
                '&:hover': { bgcolor: '#f8fafc' } 
              }}
            >
              <ArrowBackIcon sx={{ color: '#0C2C48' }} />
            </IconButton>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ letterSpacing: '-0.02em' }}>
                  Reconciliation Report
                </Typography>
                <Chip
                  icon={<LocationOnIcon fontSize="small" sx={{ color: '#2563eb !important' }} />}
                  label={locationName}
                  sx={{
                    bgcolor: '#eff6ff',
                    color: '#1e40af',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    py: 0.5,
                    px: 0.5,
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe'
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Comprehensive Form & Size inventory breakdown for {locationName}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Summary KPI Cards Grid */}
        <Grid container spacing={2}>
          {/* Card 1: Total Items */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)', 
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Total Line Items
                  </Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#2563eb', 0.1), color: '#2563eb', display: 'flex' }}>
                    <LayersIcon fontSize="small" />
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">
                  {stats.totalRecords}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unique Form & Size entries
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2: Counted Qty */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)', 
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Total Counted Qty
                  </Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#7c3aed', 0.1), color: '#7c3aed', display: 'flex' }}>
                    <AssessmentIcon fontSize="small" />
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">
                  {stats.totalCountedQty}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  System Qty: <b>{stats.totalSystemQty}</b>
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 3: Net Variance Tons */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)', 
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Net Variance Tons
                  </Typography>
                  <Box sx={{ 
                    p: 0.75, 
                    borderRadius: 2, 
                    bgcolor: stats.totalVarTons < 0 ? alpha('#dc2626', 0.1) : stats.totalVarTons > 0 ? alpha('#059669', 0.1) : alpha('#64748b', 0.1), 
                    color: stats.totalVarTons < 0 ? '#dc2626' : stats.totalVarTons > 0 ? '#059669' : '#475569', 
                    display: 'flex' 
                  }}>
                    {stats.totalVarTons < 0 ? <TrendingDownIcon fontSize="small" /> : <TrendingUpIcon fontSize="small" />}
                  </Box>
                </Box>
                <Typography 
                  variant="h5" 
                  fontWeight={800} 
                  sx={{ color: stats.totalVarTons < 0 ? '#dc2626' : stats.totalVarTons > 0 ? '#059669' : '#0f172a' }}
                >
                  {stats.totalVarTons > 0 ? `+${stats.totalVarTons.toFixed(2)}` : stats.totalVarTons.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Count: <b>{stats.totalCountTons.toFixed(2)}</b> / OHD: <b>{stats.totalOhdTons.toFixed(2)}</b> T
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 4: Total Material Value */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)', 
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Total Material Value
                  </Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#d97706', 0.1), color: '#d97706', display: 'flex' }}>
                    <AttachMoneyIcon fontSize="small" />
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">
                  ${stats.totalMatVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  On-Hand Valuation Sum
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Main Report Table Flex Container */}
      <Card sx={{ 
        flex: 1, 
        minHeight: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        borderRadius: 3, 
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)', 
        border: '1px solid #e2e8f0', 
        overflow: 'hidden' 
      }}>
        
        {/* Search & Actions Toolbar */}
        <Box sx={{ 
          flexShrink: 0,
          p: 1.5, 
          px: 2.5,
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 2, 
          alignItems: 'center', 
          justifyContent: 'space-between',
          bgcolor: '#ffffff',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <TextField
            placeholder="Search by Form or Size..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ 
              minWidth: 280,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: '#f8fafc',
                '& fieldset': { borderColor: '#cbd5e1' },
                '&:hover fieldset': { borderColor: '#94a3b8' },
                '&.Mui-focused fieldset': { borderColor: '#0C2C48', bgcolor: '#ffffff' }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#64748b' }} fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />

          <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto', alignItems: 'center' }}>
            {searchTerm && (
              <Button
                variant="text"
                size="small"
                startIcon={<RestartAltIcon />}
                onClick={() => setSearchTerm('')}
                sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
              >
                Clear Filter
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<ViewColumnIcon />}
              onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
              sx={{
                borderRadius: 2,
                color: '#0C2C48',
                borderColor: '#cbd5e1',
                bgcolor: '#ffffff',
                '&:hover': {
                  borderColor: '#0C2C48',
                  bgcolor: '#f8fafc'
                },
                textTransform: 'none',
                fontWeight: 600,
                px: 2
              }}
            >
              Columns ({visibleCount}/{REPORT_COLUMNS.length})
            </Button>

            <Button 
              variant="contained" 
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              disabled={filteredReportData.length === 0 || activeColumns.length === 0}
              sx={{ 
                borderRadius: 2,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)'
                },
                textTransform: 'none', 
                fontWeight: 700,
                px: 2.5
              }}
            >
              Export Excel
            </Button>
          </Box>
        </Box>

        {/* Column Selector Menu */}
        <Menu
          anchorEl={columnMenuAnchor}
          open={Boolean(columnMenuAnchor)}
          onClose={() => setColumnMenuAnchor(null)}
          PaperProps={{
            sx: {
              width: 270,
              maxHeight: 460,
              p: 1,
              borderRadius: 2.5,
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)'
            }
          }}
        >
          <Box sx={{ px: 1.5, py: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
              Show / Hide Columns
            </Typography>
            <Chip 
              label={`${visibleCount}/${REPORT_COLUMNS.length}`} 
              size="small" 
              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
            />
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ px: 1, pb: 1, display: 'flex', gap: 1, justifyContent: 'space-between' }}>
            <Button 
              size="small" 
              onClick={handleSelectAllColumns} 
              disabled={visibleCount === REPORT_COLUMNS.length}
              sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
            >
              Select All
            </Button>
            <Button 
              size="small" 
              color="secondary"
              onClick={handleHideAllColumns}
              disabled={visibleCount === 0}
              sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
            >
              Hide All
            </Button>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
            {REPORT_COLUMNS.map((col) => (
              <MenuItem 
                key={col.id}
                dense
                onClick={() => toggleColumn(col.id)}
                sx={{ borderRadius: 1.5, my: 0.25, px: 1 }}
              >
                <Checkbox 
                  checked={!!visibleColumns[col.id]} 
                  size="small"
                  sx={{ p: 0.5, mr: 1, color: '#94a3b8', '&.Mui-checked': { color: '#0C2C48' } }}
                />
                <ListItemText 
                  primary={col.label} 
                  primaryTypographyProps={{ variant: 'body2', fontWeight: visibleColumns[col.id] ? 600 : 400, color: '#1e293b' }}
                />
              </MenuItem>
            ))}
          </Box>
        </Menu>

        {/* Scrollable Sticky Header Table Container (Fills exact remaining card height) */}
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Table stickyHeader sx={{ minWidth: 750 }} aria-label="reconciliation report table">
            <TableHead>
              <TableRow>
                {activeColumns.map((col) => (
                  <TableCell 
                    key={col.id} 
                    align={col.align} 
                    sx={{ 
                      fontWeight: 700, 
                      bgcolor: '#0C2C48',
                      color: '#ffffff',
                      py: 1.75,
                      px: 2,
                      fontSize: '0.825rem',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      borderBottom: 'none',
                      whiteSpace: 'nowrap',
                      top: 0,
                      zIndex: 10
                    }}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {activeColumns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={REPORT_COLUMNS.length} align="center" sx={{ py: 8 }}>
                    <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>
                      All columns are currently hidden
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Select columns from the "Columns" menu above to view report details.
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<RestartAltIcon />}
                      onClick={handleSelectAllColumns}
                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                    >
                      Show All Columns
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filteredReportData.length > 0 ? (
                filteredReportData.map((row: any, index: number) => (
                  <TableRow 
                    key={index} 
                    sx={{ 
                      bgcolor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                      '&:hover': { bgcolor: '#f1f5f9' },
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {activeColumns.map((col) => (
                      <TableCell key={col.id} align={col.align} sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                        {col.getDisplayValue(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={activeColumns.length} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" fontWeight={600} color="text.secondary">
                      No matching record found for "{searchTerm}".
                    </Typography>
                    <Button 
                      variant="text" 
                      size="small"
                      onClick={() => setSearchTerm('')}
                      sx={{ textTransform: 'none', mt: 1 }}
                    >
                      Clear Search Filter
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            {/* Sticky Table Footer Summary Row */}
            {filteredReportData.length > 0 && activeColumns.length > 0 && (
              <TableFooter sx={{ position: 'sticky', bottom: 0, zIndex: 5 }}>
                <TableRow sx={{ borderTop: '2px solid #cbd5e1', bgcolor: '#f8fafc' }}>
                  {activeColumns.map((col) => {
                    if (col.id === 'form') {
                      return (
                        <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, color: '#0C2C48', py: 1.75, px: 2 }}>
                          TOTALS ({filteredReportData.length} items)
                        </TableCell>
                      );
                    }
                    if (col.id === 'size') {
                      return <TableCell key={col.id} align={col.align} sx={{ fontWeight: 700, py: 1.75, px: 2 }}></TableCell>;
                    }
                    if (col.id === 'total_system_qty') {
                      return <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, color: '#0f172a', py: 1.75, px: 2 }}>{filteredTotals.systemQty}</TableCell>;
                    }
                    if (col.id === 'total_counted_qty') {
                      return <TableCell key={col.id} align={col.align} sx={{ fontWeight: 800, color: '#0f172a', py: 1.75, px: 2 }}>{filteredTotals.countedQty}</TableCell>;
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
                          <Chip
                            label={v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              bgcolor: v > 0 ? '#ecfdf5' : v < 0 ? '#fff1f2' : '#e2e8f0',
                              color: v > 0 ? '#047857' : v < 0 ? '#be123c' : '#334155',
                              border: `1px solid ${v > 0 ? '#a7f3d0' : v < 0 ? '#fecdd3' : '#cbd5e1'}`
                            }}
                          />
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

export default ReconciliationReportView;