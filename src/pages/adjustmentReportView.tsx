import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  Typography, Card, CardContent, IconButton, Box, Button, TextField, InputAdornment,
  Chip, Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TuneIcon from '@mui/icons-material/Tune';
import InventoryIcon from '@mui/icons-material/Inventory';
import ScaleIcon from '@mui/icons-material/Scale';
import AssessmentIcon from '@mui/icons-material/Assessment';
import * as XLSX from 'xlsx';

const AdjustmentReportView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const reportData: any[] = location.state?.reportData || [];
  const locationName: string = location.state?.locationName || 'Unknown Location';

  const [searchTerm, setSearchTerm] = useState('');

  // ── Filtered data ────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return reportData;
    const term = searchTerm.toLowerCase();
    return reportData.filter((row) =>
      (row.form && String(row.form).toLowerCase().includes(term)) ||
      (row.grade && String(row.grade).toLowerCase().includes(term)) ||
      (row.size && String(row.size).toLowerCase().includes(term)) ||
      (row.finish && String(row.finish).toLowerCase().includes(term)) ||
      (row.ext_finish && String(row.ext_finish).toLowerCase().includes(term)) ||
      (row.sys_tag_no && String(row.sys_tag_no).toLowerCase().includes(term)) ||
      (row.tag_id && String(row.tag_id).toLowerCase().includes(term)) ||
      (row.location && String(row.location).toLowerCase().includes(term)) ||
      (row.section_desc && String(row.section_desc).toLowerCase().includes(term)) ||
      (row.mill && String(row.mill).toLowerCase().includes(term)) ||
      (row.heat && String(row.heat).toLowerCase().includes(term)) ||
      (row.status && String(row.status).toLowerCase().includes(term))
    );
  }, [reportData, searchTerm]);

  // ── KPI stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalItems = reportData.length;
    const totalSysQty = reportData.reduce((s, r) => s + (Number(r.system_qty) || 0), 0);
    const totalCountQty = reportData.reduce((s, r) => s + (Number(r.counted_qty) || 0), 0);
    const totalVariance = reportData.reduce((s, r) => s + (Number(r.variance) || 0), 0);
    const totalWeight = reportData.reduce((s, r) => s + (Number(r.weight) || 0), 0);
    return { totalItems, totalSysQty, totalCountQty, totalVariance, totalWeight };
  }, [reportData]);

  const filteredTotals = useMemo(() => {
    const sysQty = filteredData.reduce((s, r) => s + (Number(r.system_qty) || 0), 0);
    const countQty = filteredData.reduce((s, r) => s + (Number(r.counted_qty) || 0), 0);
    const variance = filteredData.reduce((s, r) => s + (Number(r.variance) || 0), 0);
    const weight = filteredData.reduce((s, r) => s + (Number(r.weight) || 0), 0);
    return { sysQty, countQty, variance, weight };
  }, [filteredData]);

  // ── Excel Export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (filteredData.length === 0) return;

    const rows = filteredData.map((r) => ({
      'System Tag No': r.sys_tag_no ?? '',
      'Tag ID': r.tag_id ?? '',
      'Form': r.form ?? '',
      'Grade': r.grade ?? '',
      'Size': r.size ?? '',
      'Finish': r.finish ?? '',
      'Ext Finish': r.ext_finish ?? '',
      'Width': r.width ?? '',
      'Length': r.length ?? '',
      'Location': r.location ?? '',
      'Section': r.section_desc ?? '',
      'Mill': r.mill ?? '',
      'Heat': r.heat ?? '',
      'Type': r.type ?? '',
      'Quality': r.quality ?? '',
      'System Qty': Number(r.system_qty) || 0,
      'Counted Qty': Number(r.counted_qty) || 0,
      'Variance Qty': Number(r.variance) || 0,
      'Weight': Number(r.weight) || 0,
      'Status': r.status ?? 'Pending Adjustment',
      'Reason': r.adjustment_reason ?? '',
      'Marked At': r.marked_at ? new Date(r.marked_at).toLocaleString() : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Adjustment Report');
    XLSX.writeFile(wb, `Pre_Adjustment_Report_${locationName.replace(/\s+/g, '_')}.xlsx`);
  };

  // ── Column header style ───────────────────────────────────────────────────────
  const thSx = {
    fontWeight: 700,
    bgcolor: '#0C2C48',
    color: '#ffffff',
    py: 1.75,
    px: 2,
    fontSize: '0.8rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
    borderBottom: 'none',
    top: 0,
    zIndex: 10,
  };

  return (
    <Box sx={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
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
                  Pre-Adjustment Report
                </Typography>
                <Chip
                  icon={<LocationOnIcon fontSize="small" sx={{ color: '#2563eb !important' }} />}
                  label={locationName}
                  sx={{ bgcolor: '#eff6ff', color: '#1e40af', fontWeight: 700, fontSize: '0.85rem', py: 0.5, px: 0.5, borderRadius: '8px', border: '1px solid #bfdbfe' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Items saved in adjustment table (star.st_adj_items) for {locationName}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
            disabled={filteredData.length === 0}
            sx={{
              bgcolor: '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              px: 2.5, py: 1,
              borderRadius: '10px',
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              '&:hover': { bgcolor: '#15803d' },
              '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
            }}
          >
            Export to Excel
          </Button>
        </Box>

        {/* ── Metric Summary Cards ────────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <InventoryIcon sx={{ color: '#2563eb' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Items</Typography>
                  <Typography variant="h6" fontWeight={800} color="#0f172a">{stats.totalItems}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScaleIcon sx={{ color: '#16a34a' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Counted Qty</Typography>
                  <Typography variant="h6" fontWeight={800} color="#0f172a">{stats.totalCountQty.toLocaleString()}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AssessmentIcon sx={{ color: '#dc2626' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Variance</Typography>
                  <Typography variant="h6" fontWeight={800} color={stats.totalVariance < 0 ? '#dc2626' : '#16a34a'}>
                    {stats.totalVariance.toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TuneIcon sx={{ color: '#9333ea' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Weight</Typography>
                  <Typography variant="h6" fontWeight={800} color="#0f172a">{stats.totalWeight.toLocaleString()}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Search Input ────────────────────────────────────────────────────── */}
        <TextField
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Form, Grade, Size, Tag No, Location, Section..."
          variant="outlined"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#64748b' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            bgcolor: '#ffffff',
            borderRadius: '10px',
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              '& fieldset': { borderColor: '#cbd5e1' },
              '&:hover fieldset': { borderColor: '#2563eb' },
            },
          }}
        />
      </Box>

      {/* ── Table Container ───────────────────────────────────────────────────── */}
      <TableContainer
        sx={{
          flexGrow: 1,
          bgcolor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          overflow: 'auto',
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={thSx}>Sys Tag / Tag ID</TableCell>
              <TableCell sx={thSx}>Form</TableCell>
              <TableCell sx={thSx}>Grade</TableCell>
              <TableCell sx={thSx}>Size</TableCell>
              <TableCell sx={thSx}>Finish</TableCell>
              <TableCell sx={thSx}>Ext Finish</TableCell>
              <TableCell sx={thSx}>Dim (W x L)</TableCell>
              <TableCell sx={thSx}>Location</TableCell>
              <TableCell sx={thSx}>Section</TableCell>
              <TableCell sx={thSx}>Mill / Heat</TableCell>
              <TableCell align="right" sx={thSx}>Sys Qty</TableCell>
              <TableCell align="right" sx={thSx}>Count Qty</TableCell>
              <TableCell align="right" sx={thSx}>Variance</TableCell>
              <TableCell align="right" sx={thSx}>Weight</TableCell>
              <TableCell sx={thSx}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} align="center" sx={{ py: 8 }}>
                  <Typography variant="body1" color="text.secondary" fontWeight={600}>
                    No marked adjustment items found for this location.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, idx) => (
                <TableRow
                  key={row.id || idx}
                  sx={{
                    '&:nth-of-type(even)': { bgcolor: '#f8fafc' },
                    '&:hover': { bgcolor: '#f1f5f9' },
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {row.sys_tag_no || row.tag_id || '-'}
                  </TableCell>
                  <TableCell>{row.form || '-'}</TableCell>
                  <TableCell>{row.grade || '-'}</TableCell>
                  <TableCell>{row.size || '-'}</TableCell>
                  <TableCell>{row.finish || '-'}</TableCell>
                  <TableCell>{row.ext_finish || '-'}</TableCell>
                  <TableCell>{`${row.width || '0'} x ${row.length || '0'}`}</TableCell>
                  <TableCell>{row.location || '-'}</TableCell>
                  <TableCell>{row.section_desc || '-'}</TableCell>
                  <TableCell>{`${row.mill || '-'} / ${row.heat || '-'}`}</TableCell>
                  <TableCell align="right">{Number(row.system_qty) || 0}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a' }}>
                    {Number(row.counted_qty) || 0}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: Number(row.variance) < 0 ? '#dc2626' : '#2563eb' }}>
                    {Number(row.variance) || 0}
                  </TableCell>
                  <TableCell align="right">{Number(row.weight) || 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status || 'Pending Adjustment'}
                      size="small"
                      sx={{
                        bgcolor: '#fff7ed',
                        color: '#c2410c',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        border: '1px solid #ffedd5',
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {filteredData.length > 0 && (
            <TableFooter>
              <TableRow sx={{ bgcolor: '#f1f5f9', fontWeight: 800 }}>
                <TableCell colSpan={10} sx={{ fontWeight: 800, color: '#0f172a', py: 1.5 }}>
                  TOTALS ({filteredData.length} Items)
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {filteredTotals.sysQty.toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#16a34a' }}>
                  {filteredTotals.countQty.toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: filteredTotals.variance < 0 ? '#dc2626' : '#2563eb' }}>
                  {filteredTotals.variance.toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {filteredTotals.weight.toLocaleString()}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdjustmentReportView;
