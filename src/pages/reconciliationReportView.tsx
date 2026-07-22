import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Typography, Card, CardHeader, IconButton, Box, Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';

const ReconciliationReportView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const reportData = location.state?.reportData || [];
  const locationName = location.state?.locationName || 'Unknown';

  const handleExportExcel = () => {
    if (reportData.length === 0) return;

    const formattedData: any[] = [];
    let lastForm = "";

    reportData.forEach((row: any) => {
      // If the Form changes, insert a "Header Row" for that Form
      if (row.form !== lastForm) {
        formattedData.push({
          "Form": row.form, // Group title on its own line
          "Size": "",
          "System Qty": "",
          "Counted Qty": "",
          "OHD Tons": "",
          "Count Tons": "",
          "Var Tons": ""
        });
        lastForm = row.form;
      }

      // Add the actual data row immediately after, with the Form column blank
      formattedData.push({
        "Form": "", 
        "Size": row.size,
        "System Qty": Number(row.total_system_qty),
        "Counted Qty": Number(row.total_counted_qty),
        "OHD Tons": Number(row.ohdtons),
        "Count Tons": Number(row.counttons),
        "Var Tons": Number(row.vartons)
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reconciliation Report");

    XLSX.writeFile(workbook, `Reconciliation_Report_${locationName}.xlsx`);
  };

  return (
    <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold">
          Report Results for: {locationName}
        </Typography>
      </Box>

      <Card sx={{ boxShadow: 3 }}>
        <CardHeader 
          title={<Typography variant="h6">Reconciliation Report</Typography>} 
          action={
            <Button 
              variant="contained" 
              color="success" 
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              disabled={reportData.length === 0}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            >
              Export to Excel
            </Button>
          }
          sx={{ bgcolor: '#0C2C48', color: 'white' }}
        />
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="report table">
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Form</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>System Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Counted Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>OHD Tons</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Count Tons</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Var Tons</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map((row: any, index: number) => (
                  <TableRow key={index} hover>
                    <TableCell>{row.form}</TableCell>
                    <TableCell>{row.size}</TableCell>
                    <TableCell align="right">{row.total_system_qty}</TableCell>
                    <TableCell align="right">{row.total_counted_qty}</TableCell>
                    <TableCell align="right">{row.ohdtons}</TableCell>
                    <TableCell align="right">{row.counttons}</TableCell>
                    <TableCell align="right" sx={{ 
                      color: Number(row.vartons) < 0 ? 'error.main' : 
                             Number(row.vartons) > 0 ? 'success.main' : 'text.primary',
                      fontWeight: 'bold'
                    }}>
                      {row.vartons}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    No data found for this location.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </main>
  );
};

export default ReconciliationReportView;