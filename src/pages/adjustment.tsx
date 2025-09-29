import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Button, CircularProgress, Breadcrumbs, Link, useTheme, alpha, Radio, RadioGroup, FormControlLabel, FormControl,
  Chip, Avatar, Tooltip, IconButton, Card, CardContent, Divider
} from '@mui/material';
import {
  ChevronLeft,
  Home,
  LocationOn,
  Refresh,
  Download,
  Tune,
  Inventory,
  Category,
  Straighten,
  Scale,
  Factory,
  LocalShipping,
  CheckCircle,
  Cancel,
  Warning
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { servicesAPI } from '../config/api';
import * as XLSX from 'xlsx';

interface AdjustmentItem {
  form: string;
  grade: string;
  size: string;
  finish: string;
  ext_finish: string;
  width: number;
  length: number;
  location: string;
  section?: string;
  section_desc?: string;
  branch: string;
  warehouse: string;
  inv_type: string;
  inv_quality: string;
  tag_id?: string;
  tag_ids?: string[];
  // Add other fields as necessary for the query
}

interface AdjustmentResult {
  prd_itm_ctl_no: string;
  prd_brh: string;
  prd_frm: string;
  prd_grd: string;
  prd_size: string;
  prd_fnsh: string;
  prd_ef_svar: string;
  prd_wdth: number;
  prd_lgth: number;
  prd_mill: string;
  prd_heat: string;
  prd_whs: string;
  prd_loc: string;
  prd_invt_typ: string;
  prd_invt_qlty: string;
  prd_invt_sts: string;
  prd_ohd_pcs: number;
  prd_ohd_wgt: number;
  prd_ohd_qty: number;
}

const AdjustmentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const [selectedItems, setSelectedItems] = useState<AdjustmentItem[]>([]);
  const [adjustmentResults, setAdjustmentResults] = useState<AdjustmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [warehouse, setWarehouse] = useState<string | null>(null);
  const [selectedItemForFetch, setSelectedItemForFetch] = useState<AdjustmentItem | null>(null);

  useEffect(() => {
    if (location.state?.selectedItems) {
      console.log('Selected items received:', location.state.selectedItems);
      console.log('First item structure:', location.state.selectedItems[0]);
      setSelectedItems(location.state.selectedItems);
      setLocationId(location.state.location_id);
      setBranch(location.state.branch);
      setWarehouse(location.state.warehouse);
    } else {
      enqueueSnackbar('No items selected for adjustment.', { variant: 'warning' });
      navigate(-1); // Go back if no items are selected
    }
  }, [location.state, enqueueSnackbar, navigate]);

  const fetchAdjustmentData = async () => {
    if (!selectedItemForFetch) {
      enqueueSnackbar('Please select an item to fetch adjustment data.', { variant: 'warning' });
      return;
    }

    console.log('Fetching adjustment data for:', selectedItemForFetch);
    console.log('Branch:', branch, 'Warehouse:', warehouse);

    setLoading(true);
    try {
      // Pass only the selected item to backend for query building
      const requestData = {
        selectedItems: [selectedItemForFetch],
        branch,
        warehouse
      };
      
      console.log('Request data being sent:', requestData);
      
      const response = await servicesAPI.getAdjustmentData(requestData);
      
      if (response.data && response.data.success && response.data.data) {
        setAdjustmentResults(response.data.data);
        enqueueSnackbar(`Found ${response.data.data.length} adjustment records for ${selectedItemForFetch.form} - ${selectedItemForFetch.size} - ${selectedItemForFetch.grade}.`, { variant: 'success' });
      } else {
        enqueueSnackbar('No adjustment data found for the selected item.', { variant: 'info' });
        setAdjustmentResults([]);
      }
    } catch (error: any) {
      console.error('Error fetching adjustment data:', error);
      console.error('Error response:', error.response?.data);
      enqueueSnackbar(`Error fetching adjustment data: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (adjustmentResults.length === 0) {
      enqueueSnackbar('No data to export.', { variant: 'warning' });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(adjustmentResults);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Adjustment Data');
    XLSX.writeFile(wb, 'Adjustment_Data.xlsx');
    enqueueSnackbar('Adjustment data exported successfully!', { variant: 'success' });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/dashboard')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <Home sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate(`/reconciliation/${locationId}`)}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <LocationOn sx={{ mr: 0.5 }} fontSize="inherit" />
          Reconciliation
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          Adjustment
        </Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>
        Item Adjustment
      </Typography>

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Selected Items for Adjustment ({selectedItems.length})</Typography>
        {selectedItems.length > 0 ? (
          <Box sx={{ mb: 2 }}>
            <FormControl component="fieldset">
              <RadioGroup
                value={selectedItemForFetch ? `${selectedItemForFetch.form}-${selectedItemForFetch.size}-${selectedItemForFetch.grade}-${selectedItemForFetch.section || selectedItemForFetch.section_desc || selectedItemForFetch.location}` : ''}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  const selectedItem = selectedItems.find(item => 
                    `${item.form}-${item.size}-${item.grade}-${item.section || item.section_desc || item.location}` === selectedValue
                  );
                  setSelectedItemForFetch(selectedItem || null);
                }}
              >
                {selectedItems.map((item, index) => {
                  console.log(`Item ${index}:`, {
                    form: item.form,
                    size: item.size,
                    grade: item.grade,
                    section: item.section,
                    section_desc: item.section_desc,
                    tag_id: item.tag_id,
                    tag_ids: item.tag_ids,
                    location: item.location
                  });
                  
                  return (
                    <FormControlLabel
                      key={index}
                      value={`${item.form}-${item.size}-${item.grade}-${item.section || item.section_desc || item.location}`}
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2">
                            <strong>{item.form}</strong> - <strong>{item.size}</strong> - <strong>{item.grade}</strong>
                          </Typography>
                          {(item.section || item.section_desc) && (
                            <Typography variant="body2" color="text.secondary">
                              (Section: {item.section || item.section_desc})
                            </Typography>
                          )}
                          {(item.tag_id || (item.tag_ids && item.tag_ids.length > 0)) && (
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.1), px: 1, py: 0.5, borderRadius: 1 }}>
                              Tag ID: #{item.tag_id || (item.tag_ids && item.tag_ids.join(', '))}
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ mb: 1 }}
                    />
                  );
                })}
              </RadioGroup>
            </FormControl>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">No items selected.</Typography>
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={fetchAdjustmentData}
            disabled={loading || !selectedItemForFetch}
            startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
          >
            {loading ? 'Fetching...' : 'Fetch Adjustment Data'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleExport}
            disabled={adjustmentResults.length === 0}
            startIcon={<Download />}
          >
            Export to Excel
          </Button>
        </Box>
      </Paper>

      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 48, height: 48 }}>
            <Tune />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
              Adjustment Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {adjustmentResults.length} items found
            </Typography>
          </Box>
        </Box>

        {selectedItemForFetch && (
          <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)` }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Selected Item Details
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Form: ${selectedItemForFetch.form}`} 
                  color="primary" 
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  label={`Size: ${selectedItemForFetch.size}`} 
                  color="secondary" 
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  label={`Grade: ${selectedItemForFetch.grade}`} 
                  color="default" 
                  variant="outlined"
                  size="small"
                />
                {(selectedItemForFetch.section || selectedItemForFetch.section_desc) && (
                  <Chip 
                    label={`Section: ${selectedItemForFetch.section || selectedItemForFetch.section_desc}`} 
                    color="info" 
                    variant="outlined"
                    size="small"
                  />
                )}
                {(selectedItemForFetch.tag_id || (selectedItemForFetch.tag_ids && selectedItemForFetch.tag_ids.length > 0)) && (
                  <Chip 
                    label={`Tag ID: #${selectedItemForFetch.tag_id || (selectedItemForFetch.tag_ids && selectedItemForFetch.tag_ids.join(', '))}`} 
                    color="warning" 
                    variant="filled"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        )}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : adjustmentResults.length > 0 ? (
          <Box>
            {/* Summary Cards */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Card sx={{ minWidth: 200, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)` }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 40, height: 40 }}>
                      <Inventory />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {adjustmentResults.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Items
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ minWidth: 200, background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)` }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: theme.palette.success.main, width: 40, height: 40 }}>
                      <Scale />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {adjustmentResults.reduce((sum, item) => sum + parseFloat(item.prd_ohd_pcs || 0), 0).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Pieces
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ minWidth: 200, background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)` }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: theme.palette.info.main, width: 40, height: 40 }}>
                      <Straighten />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {adjustmentResults.reduce((sum, item) => sum + parseFloat(item.prd_ohd_wgt || 0), 0).toLocaleString()} kg
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Weight
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Modern Table */}
            <TableContainer 
              component={Paper} 
              elevation={2}
              sx={{ 
                borderRadius: 2,
                overflow: 'hidden',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                    '& .MuiTableCell-head': {
                      fontWeight: 600,
                      color: theme.palette.primary.main,
                      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }
                  }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Inventory fontSize="small" />
                        Item Control No.
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Factory fontSize="small" />
                        Branch
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Category fontSize="small" />
                        Form
                      </Box>
                    </TableCell>
                    <TableCell>Grade</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Finish</TableCell>
                    <TableCell>Width</TableCell>
                    <TableCell>Length</TableCell>
                    <TableCell>Mill</TableCell>
                    <TableCell>Heat</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalShipping fontSize="small" />
                        Warehouse
                      </Box>
                    </TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Quality</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Pieces</TableCell>
                    <TableCell align="right">Weight</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adjustmentResults.map((result, index) => {
                    const isActive = result.prd_invt_sts === 'S';
                    const hasStock = parseFloat(result.prd_ohd_pcs || 0) > 0;
                    
                    return (
                      <TableRow 
                        key={index}
                        hover
                        sx={{ 
                          '&:nth-of-type(even)': {
                            backgroundColor: alpha(theme.palette.action.hover, 0.02)
                          },
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.04)
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                              {result.prd_itm_ctl_no}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={result.prd_brh} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {result.prd_frm?.trim()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {result.prd_grd?.trim()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {result.prd_size?.trim()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {result.prd_fnsh?.trim() || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {result.prd_wdth}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {result.prd_lgth}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {result.prd_mill?.trim() || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {result.prd_heat?.trim() || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={result.prd_whs} 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {result.prd_loc?.trim() || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={result.prd_invt_typ} 
                            size="small" 
                            color="default"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {result.prd_invt_qlty || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            icon={isActive ? <CheckCircle /> : <Cancel />}
                            label={isActive ? 'Active' : 'Inactive'} 
                            size="small" 
                            color={isActive ? 'success' : 'error'}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: hasStock ? theme.palette.success.main : theme.palette.text.secondary
                            }}
                          >
                            {parseFloat(result.prd_ohd_pcs || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {parseFloat(result.prd_ohd_wgt || 0).toLocaleString()} kg
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {parseFloat(result.prd_ohd_qty || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">No adjustment data found.</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default AdjustmentPage;
