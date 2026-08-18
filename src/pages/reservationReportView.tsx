import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  Typography, Card, CardContent, IconButton, Box, Button, TextField, InputAdornment,
  Chip, Grid, alpha
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import * as XLSX from 'xlsx';

const ReservationReportView: React.FC = () => {
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
      (row.tag_no        && String(row.tag_no).toLowerCase().includes(term)) ||
      (row.res_ref_pfx   && String(row.res_ref_pfx).toLowerCase().includes(term)) ||
      (row.res_ref_no    && String(row.res_ref_no).toLowerCase().includes(term)) ||
      (row.res_brh       && String(row.res_brh).toLowerCase().includes(term)) ||
      (row.res_whs       && String(row.res_whs).toLowerCase().includes(term))
    );
  }, [reportData, searchTerm]);

  // ── KPI stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const uniqueTags = new Set<string>(reportData.map((r) => String(r.tag_no)));
    const totalPcs   = reportData.reduce((s, r) => s + (Number(r.res_res_pcs) || 0), 0);
    const totalWgt   = reportData.reduce((s, r) => s + (Number(r.res_res_wgt) || 0), 0);
    return { uniqueTags: uniqueTags.size, totalRows: reportData.length, totalPcs, totalWgt };
  }, [reportData]);

  const filteredTotals = useMemo(() => {
    const pcs = filteredData.reduce((s, r) => s + (Number(r.res_res_pcs) || 0), 0);
    const wgt = filteredData.reduce((s, r) => s + (Number(r.res_res_wgt) || 0), 0);
    return { pcs, wgt };
  }, [filteredData]);

  // ── Excel Export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (filteredData.length === 0) return;

    const rows = filteredData.map((r) => ({
      'Tag No':          r.tag_no        ?? '',
      'Ctrl No':         r.prd_itm_ctl_no ?? '',
      'Ref Prefix':      r.res_ref_pfx   ?? '',
      'Ref No':          r.res_ref_no    ?? '',
      'Ref Item':        r.res_ref_itm   ?? '',
      'Branch':          r.res_brh       ?? '',
      'Warehouse':       r.res_whs       ?? '',
      'Reserved Pcs':    Number(r.res_res_pcs) || 0,
      'Reserved Wgt':    Number(r.res_res_wgt) || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservation Report');
    XLSX.writeFile(wb, `Reservation_Report_${locationName.replace(/\s+/g, '_')}.xlsx`);
  };

  // ── Column header style ───────────────────────────────────────────────────────
  const thSx = {
    fontWeight: 700,
    bgcolor: '#0C2C48',
    color: '#ffffff',
    py: 1.75, px: 2,
    fontSize: '0.8rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
    borderBottom: 'none',
    top: 0, zIndex: 10,
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
                  Reservation Report
                </Typography>
                <Chip
                  icon={<LocationOnIcon fontSize="small" sx={{ color: '#7c3aed !important' }} />}
                  label={locationName}
                  sx={{ bgcolor: '#f5f3ff', color: '#5b21b6', fontWeight: 700, fontSize: '0.85rem', py: 0.5, px: 0.5, borderRadius: '8px', border: '1px solid #ddd6fe' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Inventory reservation details stored during reconciliation for {locationName}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── KPI cards ──────────────────────────────────────────────────────── */}
        <Grid container spacing={2}>
          {/* Unique Tags */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg,#ffffff,#f8fafc)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Unique Tags
                  </Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#7c3aed', 0.1), color: '#7c3aed', display: 'flex' }}>
                    <BookmarkIcon fontSize="small" />
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">{stats.uniqueTags}</Typography>
                <Typography variant="caption" color="text.secondary">Tag numbers with reservations</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Reservation Lines */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg,#ffffff,#f8fafc)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Total Lines
                  </Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#2563eb', 0.1), color: '#2563eb', display: 'flex' }}>
                    <AssignmentIcon fontSize="small" />
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">{stats.totalRows}</Typography>
                <Typography variant="caption" color="text.secondary">Total reservation entries</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Reserved Pcs */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg,#ffffff,#f8fafc)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Reserved Pcs
                  </Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#059669', 0.1), color: '#059669', display: 'flex' }}>
                    <InventoryIcon fontSize="small" />
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">{stats.totalPcs.toLocaleString()}</Typography>
                <Typography variant="caption" color="text.secondary">Total pieces reserved</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Reserved Wgt */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg,#ffffff,#f8fafc)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Reserved Weight
                  </Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#d97706', 0.1), color: '#d97706', display: 'flex' }}>
                    <LocalShippingIcon fontSize="small" />
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a">
                  {stats.totalWgt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">Total weight reserved</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* ── Main Table Card ─────────────────────────────────────────────────── */}
      <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>

        {/* Toolbar */}
        <Box sx={{ flexShrink: 0, p: 1.5, px: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <TextField
            placeholder="Search by Tag, Ref No, Branch, Warehouse..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              minWidth: 300,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2, bgcolor: '#f8fafc',
                '& fieldset': { borderColor: '#cbd5e1' },
                '&:hover fieldset': { borderColor: '#94a3b8' },
                '&.Mui-focused fieldset': { borderColor: '#0C2C48' }
              }
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} fontSize="small" /></InputAdornment>,
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null
            }}
          />

          <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto', alignItems: 'center' }}>
            {searchTerm && (
              <Typography variant="caption" color="text.secondary">
                {filteredData.length} of {reportData.length} rows
              </Typography>
            )}
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
              disabled={filteredData.length === 0}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 6px 16px rgba(16,185,129,0.35)' },
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5
              }}
            >
              Export Excel
            </Button>
          </Box>
        </Box>

        {/* Table */}
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Table stickyHeader sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {['Tag No', 'Ctrl No', 'Ref Prefix', 'Ref No', 'Ref Item', 'Branch', 'Warehouse', 'Reserved Pcs', 'Reserved Wgt'].map((label) => (
                  <TableCell key={label} align={['Reserved Pcs', 'Reserved Wgt'].includes(label) ? 'right' : 'left'} sx={thSx}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => (
                  <TableRow
                    key={idx}
                    sx={{ bgcolor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', '&:hover': { bgcolor: '#f1f5f9' }, transition: 'background-color 0.15s ease' }}
                  >
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      <Chip
                        label={row.tag_no ?? '-'}
                        size="small"
                        sx={{ bgcolor: '#f5f3ff', color: '#5b21b6', fontWeight: 600, fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #ddd6fe' }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography variant="body2" color="#475569">{row.prd_itm_ctl_no ?? '-'}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      <Chip
                        label={row.res_ref_pfx ?? '-'}
                        size="small"
                        sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography variant="body2" fontWeight={600} color="#1e293b">{row.res_ref_no ?? '-'}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography variant="body2" color="#475569">{row.res_ref_itm ?? '-'}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography variant="body2" color="#334155">{row.res_brh ?? '-'}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography variant="body2" color="#334155">{row.res_whs ?? '-'}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography variant="body2" fontWeight={600} color="#0f172a">
                        {Number(row.res_res_pcs || 0).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography variant="body2" fontWeight={600} color="#0f172a">
                        {Number(row.res_res_wgt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                    <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>
                      {searchTerm ? `No results for "${searchTerm}"` : 'No reservation data found for this location'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm
                        ? 'Try a different search term.'
                        : 'Open the reconciliation page for this location first — reservations are saved automatically during reconciliation.'}
                    </Typography>
                    {searchTerm && (
                      <Button variant="text" size="small" onClick={() => setSearchTerm('')} sx={{ textTransform: 'none', mt: 1 }}>
                        Clear Search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            {/* Sticky footer totals */}
            {filteredData.length > 0 && (
              <TableFooter sx={{ position: 'sticky', bottom: 0, zIndex: 5 }}>
                <TableRow sx={{ borderTop: '2px solid #cbd5e1', bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 800, color: '#0C2C48', py: 1.75, px: 2 }}>
                    TOTALS ({filteredData.length} rows)
                  </TableCell>
                  {/* empty cols */}
                  {['Ctrl No', 'Ref Prefix', 'Ref No', 'Ref Item', 'Branch', 'Warehouse'].map((k) => (
                    <TableCell key={k} sx={{ py: 1.75, px: 2 }} />
                  ))}
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a', py: 1.75, px: 2 }}>
                    {filteredTotals.pcs.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a', py: 1.75, px: 2 }}>
                    {filteredTotals.wgt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default ReservationReportView;
