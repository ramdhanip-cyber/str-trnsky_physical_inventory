import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  useTheme,
  alpha,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip
} from '@mui/material';
import {
  Search,
  Download,
  ChevronLeft,
  Home,
  LocationOn
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useSnackbar } from 'notistack';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { ReconciliationData } from '../types/reconciliation';
import { servicesAPI } from '../config/api';

const ReconciliationPage: React.FC = () => {
  const { location_id } = useParams<{ location_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [checkerData, setCheckerData] = useState<any[]>([]);
  const [loadingChecker, setLoadingChecker] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (location_id) {
      console.log('Reconciliation page loaded:', { location_id, hasStateData: !!location.state?.reconciliationData });
      
      // Check if data was passed via navigation state
      const stateData = location.state?.reconciliationData;
      if (stateData) {
        console.log('Using state data');
        setReconciliationData(stateData);
      setLoading(false);
      } else {
        console.log('No state data found');
        setLoading(false);
      }
    }
  }, [location_id, location.state]);

  // Fetch checker data and create comparison
  const fetchCheckerDataAndCompare = async () => {
    if (!location_id || !reconciliationData) return;
    
    try {
      setLoadingChecker(true);
      
      // Fetch sections first
      const sectionsResponse = await servicesAPI.getSections(location_id);
      const sections = sectionsResponse.data;
      
      if (sections.length === 0) {
        enqueueSnackbar('No sections found for this location', { variant: 'error' });
        return;
      }
      
      // Fetch all checker transactions from all sections
      const allCheckerTransactions: any[] = [];
      
      for (const section of sections) {
        try {
          const checkerResponse = await servicesAPI.getReviewTransactionsForChecker(location_id, section.section_id.toString());
          const checkerTransactions = checkerResponse.data.map((t: any) => ({
            ...t,
            section_id: section.section_id,
            section_desc: section.section_desc,
            location_desc: section.location_desc,
            warehouse: section.warehouse,
            branch: section.branch
          }));
          allCheckerTransactions.push(...checkerTransactions);
        } catch (error) {
          console.error(`Error fetching checker transactions for section ${section.section_id}:`, error);
        }
      }
      
      // Consolidate checker data by specified fields
      const consolidated = new Map<string, any>();
      
      allCheckerTransactions.forEach(transaction => {
        // Normalize the key fields to match system data format
        const normalizedForm = String(transaction.form || '').trim();
        const normalizedGrade = String(transaction.grade || '').trim();
        const normalizedSize = String(transaction.size || '').trim();
        const normalizedFinish = String(transaction.finish || '').trim();
        const normalizedExtFinish = String(transaction.ext_finish || '').trim();
        const normalizedWidth = String(Number(transaction.width || 0)).trim();
        const normalizedLength = String(Number(transaction.length || 0)).trim();
        const normalizedType = String(transaction.type || '').trim();
        const normalizedRemarks = String(transaction.remarks || '').trim();
        
        const key = `${normalizedForm}|${normalizedGrade}|${normalizedSize}|${normalizedFinish}|${normalizedExtFinish}|${normalizedWidth}|${normalizedLength}|${normalizedType}|${normalizedRemarks}`;
        
        console.log('Consolidating checker transaction:', {
          original: {
            form: transaction.form,
            grade: transaction.grade,
            size: transaction.size,
            finish: transaction.finish,
            ext_finish: transaction.ext_finish,
            width: transaction.width,
            length: transaction.length,
            type: transaction.type,
            remarks: transaction.remarks,
            qty: transaction.qty
          },
          normalized: {
            form: normalizedForm,
            grade: normalizedGrade,
            size: normalizedSize,
            finish: normalizedFinish,
            ext_finish: normalizedExtFinish,
            width: normalizedWidth,
            length: normalizedLength,
            type: normalizedType,
            remarks: normalizedRemarks
          }
        });
        
        if (consolidated.has(key)) {
          const existing = consolidated.get(key)!;
          existing.qty += transaction.qty || 0;
          existing.transaction_count += 1;
        } else {
          consolidated.set(key, {
            form: normalizedForm,
            grade: normalizedGrade,
            size: normalizedSize,
            finish: normalizedFinish,
            ext_finish: normalizedExtFinish,
            width: normalizedWidth,
            length: normalizedLength,
            type: normalizedType,
            remarks: normalizedRemarks,
            qty: transaction.qty || 0,
            transaction_count: 1
          });
        }
      });
      
      const consolidatedCheckerData = Array.from(consolidated.values());
      
      console.log('Consolidated checker data:', consolidatedCheckerData);
      console.log('System data sample:', reconciliationData.items.slice(0, 3));
      
      // Show sample normalized data for debugging
      if (consolidatedCheckerData.length > 0) {
        console.log('Sample normalized checker item:', {
          form: consolidatedCheckerData[0].form,
          grade: consolidatedCheckerData[0].grade,
          size: consolidatedCheckerData[0].size,
          finish: consolidatedCheckerData[0].finish,
          ext_finish: consolidatedCheckerData[0].ext_finish,
          width: consolidatedCheckerData[0].width,
          length: consolidatedCheckerData[0].length,
          type: consolidatedCheckerData[0].type,
          quality_standard: consolidatedCheckerData[0].quality_standard,
          qty: consolidatedCheckerData[0].qty
        });
      }
      
      setCheckerData(consolidatedCheckerData);
      setShowComparison(true);
      enqueueSnackbar(`Checker data loaded successfully - ${consolidatedCheckerData.length} consolidated items`, { variant: 'success' });
      
    } catch (error) {
      console.error('Error fetching checker data:', error);
      enqueueSnackbar('Failed to fetch checker data', { variant: 'error' });
    } finally {
      setLoadingChecker(false);
    }
  };

  // Function to find matching checker data for a system item
  const findMatchingCheckerData = (systemItem: any) => {
    if (!checkerData.length) return null;
    
          const match = checkerData.find(checkerItem => {
        // Handle field type mismatches by converting to strings for comparison
        // Remove trailing spaces and normalize data
        const systemForm = String(systemItem.form || '').trim();
        const checkerForm = String(checkerItem.form || '').trim();
        
        const systemGrade = String(systemItem.grade || '').trim();
        const checkerGrade = String(checkerItem.grade || '').trim();
        
        const systemSize = String(systemItem.size || '').trim();
        const checkerSize = String(checkerItem.size || '').trim();
        
        const systemFinish = String(systemItem.finish || '').trim();
        const checkerFinish = String(checkerItem.finish || '').trim();
        
        const systemExtFinish = String(systemItem.ext_finish || '').trim();
        const checkerExtFinish = String(checkerItem.ext_finish || '').trim();
        
        // Handle numeric fields - convert to numbers and back to strings to normalize
        const systemWidth = String(Number(systemItem.width || 0)).trim();
        const checkerWidth = String(Number(checkerItem.width || 0)).trim();
        
        const systemLength = String(Number(systemItem.length || 0)).trim();
        const checkerLength = String(Number(checkerItem.length || 0)).trim();
        
        // Map field names correctly
        const systemType = String(systemItem.inv_type || '').trim();
        const checkerType = String(checkerItem.type || '').trim();
        
        const systemQuality = String(systemItem.inv_quality || '').trim();
        const checkerQuality = String(checkerItem.remarks || '').trim();
        
        // Debug: Log the comparison for troubleshooting
        console.log('Comparing:', {
          system: {
            form: systemForm,
            grade: systemGrade,
            size: systemSize,
            finish: systemFinish,
            ext_finish: systemExtFinish,
            width: systemWidth,
            length: systemLength,
            type: systemType,
            quality: systemQuality
          },
          checker: {
            form: checkerForm,
            grade: checkerGrade,
            size: checkerSize,
            finish: checkerFinish,
            ext_finish: checkerExtFinish,
            width: checkerWidth,
            length: checkerLength,
            type: checkerType,
            quality: checkerQuality
          }
        });
        
        const isMatch = (
          systemForm === checkerForm &&
          systemGrade === checkerGrade &&
          systemSize === checkerSize &&
          systemFinish === checkerFinish &&
          systemExtFinish === checkerExtFinish &&
          systemWidth === checkerWidth &&
          systemLength === checkerLength &&
          systemType === checkerType &&
          systemQuality === checkerQuality
        );
      
      // Debug logging for first few items
      if (checkerData.length > 0 && checkerData.indexOf(checkerItem) < 3) {
        console.log('Matching attempt:', {
          system: {
            form: systemForm,
            grade: systemGrade,
            size: systemSize,
            finish: systemFinish,
            ext_finish: systemExtFinish,
            width: systemWidth,
            length: systemLength,
            type: systemType,
            quality: systemQuality
          },
          checker: {
            form: checkerForm,
            grade: checkerGrade,
            size: checkerSize,
            finish: checkerFinish,
            ext_finish: checkerExtFinish,
            width: checkerWidth,
            length: checkerLength,
            type: checkerType,
            quality: checkerQuality
          },
          isMatch
        });
      }
      
      return isMatch;
    });
    
    return match;
  };

  // Filter data based on search term
  const filteredData = reconciliationData?.items.filter(item => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      item.form?.toLowerCase().includes(searchLower) ||
      item.grade?.toLowerCase().includes(searchLower) ||
      item.size?.toLowerCase().includes(searchLower) ||
      item.finish?.toLowerCase().includes(searchLower) ||
      item.ext_finish?.toLowerCase().includes(searchLower) ||
      item.width?.toString().toLowerCase().includes(searchLower) ||
      item.length?.toString().toLowerCase().includes(searchLower) ||
      item.weight?.toString().toLowerCase().includes(searchLower) ||
      item.inv_type?.toLowerCase().includes(searchLower) ||
      item.inv_quality?.toLowerCase().includes(searchLower) ||
      item.branch?.toLowerCase().includes(searchLower) ||
      item.warehouse?.toLowerCase().includes(searchLower) ||
      item.system_qty?.toString().includes(searchLower) ||
      item.prd_ohd_mat_val?.toString().includes(searchLower) ||
      item.prd_ohd_mat_cst?.toString().includes(searchLower)
    );
  }) || [];

  // Export to Excel
  const handleExport = async () => {
    if (!reconciliationData) return;

    setIsExporting(true);
    try {
            const exportData = filteredData.map(item => ({
        'Form': item.form,
        'Grade': item.grade,
        'Size': item.size,
        'Finish': item.finish,
        'Extended Finish': item.ext_finish,
        'Width': item.width,
        'Length': item.length,
        'Weight': item.weight,
        'Inventory Type': item.inv_type,
        'Quality Standards': item.inv_quality,
        'Branch': item.branch,
        'Warehouse': item.warehouse,
        'System Quantity': item.system_qty,
        'Total Amount': item.prd_ohd_mat_val,
        'Unit Cost': item.prd_ohd_mat_cst
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reconciliation Data');
      
      const fileName = `Reconciliation_Data_${location_id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      enqueueSnackbar('Data exported successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      enqueueSnackbar('Failed to export data', { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary">
          Loading reconciliation data...
        </Typography>
      </Box>
    );
  }

  if (!reconciliationData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          No reconciliation data found
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Back to Review
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body1"
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <Home sx={{ mr: 0.5 }} />
            Home
          </Link>
          <Link
            component="button"
            variant="body1"
              onClick={() => navigate(-1)}
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <LocationOn sx={{ mr: 0.5 }} />
            Review
          </Link>
          <Typography color="text.primary">Reconciliation</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              System Data Reconciliation
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
              startIcon={<Download />}
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={fetchCheckerDataAndCompare}
                disabled={loadingChecker}
                startIcon={loadingChecker ? <CircularProgress size={20} /> : <Download />}
              >
                {loadingChecker ? 'Loading Checker Data...' : 'Compare with Checker'}
              </Button>
              <Button
              variant="contained"
              startIcon={<ChevronLeft />}
              onClick={() => navigate(-1)}
            >
              Back to Review
              </Button>
              {showComparison && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    console.log('Current checker data:', checkerData);
                    console.log('Current system data:', reconciliationData?.items);
                    enqueueSnackbar(`Checker: ${checkerData.length} items, System: ${reconciliationData?.items?.length || 0} items`, { variant: 'info' });
                  }}
                  sx={{ ml: 1 }}
                >
                  Debug Data
                </Button>
              )}
          </Box>
        </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
            <CardContent>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  {reconciliationData.summary.total_system_items || 0}
              </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
            <CardContent>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  {reconciliationData.summary.total_system_quantity || 0}
              </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Quantity
              </Typography>
            </CardContent>
          </Card>
        </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
            <CardContent>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  {reconciliationData.summary.branch || '-'}
              </Typography>
                <Typography variant="body2" color="text.secondary">
                  Branch
              </Typography>
            </CardContent>
          </Card>
        </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
            <CardContent>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  {reconciliationData.summary.warehouse || '-'}
              </Typography>
                <Typography variant="body2" color="text.secondary">
                  Warehouse
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        </Grid>
      </Paper>



      {/* Search */}
      <Paper sx={{ p: 2, mb: 2 }}>
              <TextField
                fullWidth
          placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ maxWidth: 400 }}
        />
      </Paper>

      {/* Data Table */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow sx={{ 
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              '& th': { 
                fontWeight: 600,
                whiteSpace: 'nowrap',
                  color: theme.palette.text.primary,
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }
              }}>
              <TableCell>Form</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Finish</TableCell>
              <TableCell>Extended Finish</TableCell>
              <TableCell>Width</TableCell>
              <TableCell>Length</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Inventory Type</TableCell>
              <TableCell>Quality Standards</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Warehouse</TableCell>
              <TableCell align="right">System Quantity</TableCell>
              {showComparison && (
                <>
                  <TableCell align="right">Checker Qty</TableCell>
                  <TableCell align="right">Variance</TableCell>
                  <TableCell>Status</TableCell>
                </>
              )}
              <TableCell align="right">Total Amount</TableCell>
              <TableCell align="right">Unit Cost</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showComparison ? 18 : 15} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No items found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item, index) => {
                const matchingChecker = showComparison ? findMatchingCheckerData(item) : null;
                const variance = matchingChecker ? (matchingChecker.qty - item.system_qty) : 0;
                const status = matchingChecker ? 
                  (matchingChecker.qty === item.system_qty ? 'Match' : 
                   matchingChecker.qty > item.system_qty ? 'Overcount' : 'Undercount') : 
                  null;
                
                return (
                  <TableRow 
                    key={index} 
                    hover
                    sx={{ 
                      backgroundColor: alpha(theme.palette.background.default, 0.5),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.background.default, 0.8)
                      }
                    }}
                  >
                    <TableCell>{item.form}</TableCell>
                    <TableCell>{item.grade}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>{item.finish}</TableCell>
                    <TableCell>{item.ext_finish || '-'}</TableCell>
                    <TableCell>{item.width || '-'}</TableCell>
                    <TableCell>{item.length || '-'}</TableCell>
                    <TableCell>{item.weight || '-'}</TableCell>
                    <TableCell>{item.inv_type || '-'}</TableCell>
                    <TableCell>{item.inv_quality || '-'}</TableCell>
                    <TableCell>{item.branch}</TableCell>
                    <TableCell>{item.warehouse}</TableCell>
                    <TableCell align="right">{item.system_qty}</TableCell>
                    {showComparison && (
                      <>
                        <TableCell align="right">
                          {matchingChecker ? (
                            <Chip 
                              label={matchingChecker.qty}
                              color="primary"
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {matchingChecker ? (
                            <Chip 
                              label={variance}
                              color={
                                status === 'Match' ? 'success' :
                                status === 'Overcount' ? 'warning' :
                                status === 'Undercount' ? 'error' : 'default'
                              }
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {matchingChecker ? (
                            <Chip 
                              label={status}
                              color={
                                status === 'Match' ? 'success' :
                                status === 'Overcount' ? 'warning' :
                                status === 'Undercount' ? 'error' : 'info'
                              }
                              size="small"
                            />
                          ) : '-'}
                        </TableCell>
                      </>
                    )}
                    <TableCell align="right">{item.prd_ohd_mat_val ? Number(item.prd_ohd_mat_val).toFixed(2) : '-'}</TableCell>
                    <TableCell align="right">{item.prd_ohd_mat_cst ? Number(item.prd_ohd_mat_cst).toFixed(2) : '-'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </Box>
      </Paper>
    </Box>
  );
};

export default ReconciliationPage; 