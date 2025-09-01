import { 
  Dialog, 
  DialogTitle, 
  DialogContent,
  DialogActions,
  Paper, 
  TextField, 
  InputAdornment, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody,
  Box, 
  Typography, 
  Button, 
  useTheme, 
  alpha,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  TableContainer,
  Tooltip,
  CircularProgress,
  useMediaQuery
} from '@mui/material';
import { 
  Search, 
  FilterList,
  CompareArrows,
  AssignmentInd,
  Download,
  CheckCircleOutline,
  Warning,
  Error,
  Info,
  Refresh,
  Remove as RemoveIcon,
  Edit
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useState, useEffect, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import type { ReconciliationData } from '../types/reconciliation';
import { servicesAPI } from '../config/api';

interface ReconciliationDialogProps {
  open: boolean;
  onClose: () => void;
  data: ReconciliationData;
  locationId: string;
  onDataRefresh?: () => void;
}

const ReconciliationDialog: React.FC<ReconciliationDialogProps> = ({ 
  open, 
  onClose, 
  data,
  locationId,
  onDataRefresh
}) => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  console.log('ReconciliationDialog received data:', data);
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    counted_qty: 0,
    remarks: ''
  });

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedItems(new Set());
      setSelectAll(false);
      setSearchTerm('');
      setStatusFilter([]);
    }
  }, [open]);

  // Ensure data and its properties exist
  const safeData: ReconciliationData = {
    summary: data?.summary || {
      total_system_items: 0,
      total_counted_items: 0,
      items_matched: 0,
      overcounts: 0,
      undercounts: 0,
      not_counted: 0
    },
    items: data?.items || []
  };

  // Memoized filtered data
  const filteredData = useMemo(() => {
    return safeData.items.filter(item => {
      const matchesSearch = searchTerm === '' || 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesFilter = statusFilter.length === 0 || 
        statusFilter.includes(item.status);

      return matchesSearch && matchesFilter;
    });
  }, [safeData, searchTerm, statusFilter]);

  // Status color helper
  const getStatusColor = (status: string): { color: string; bgColor: string } => {
    switch (status) {
      case 'Match':
        return {
          color: theme.palette.success.main,
          bgColor: alpha(theme.palette.success.main, 0.1)
        };
      case 'Overcount':
        return {
          color: theme.palette.info.main,
          bgColor: alpha(theme.palette.info.main, 0.1)
        };
      case 'Undercount':
        return {
          color: theme.palette.error.main,
          bgColor: alpha(theme.palette.error.main, 0.1)
        };
      case 'Rechecking in Progress':
        return {
          color: theme.palette.error.main,
          bgColor: alpha(theme.palette.error.main, 0.2)
        };
      case 'Rechecked':
        return {
          color: theme.palette.success.main,
          bgColor: alpha(theme.palette.success.main, 0.15)
        };
      default:
        return {
          color: theme.palette.warning.main,
          bgColor: alpha(theme.palette.warning.main, 0.1)
        };
    }
  };

  // Handlers
  const handleExport = async () => {
    try {
      setIsExporting(true);

      const workbook = XLSX.utils.book_new();
      
      // Summary Sheet
      const summaryData = [
        ['Reconciliation Summary'],
        ['Total System Items', safeData.summary.total_system_items],
        ['Total Counted Items', safeData.summary.total_counted_items],
        ['Items Matched', safeData.summary.items_matched],
        ['Overcounts', safeData.summary.overcounts],
        ['Undercounts', safeData.summary.undercounts],
        ['Not Counted', safeData.summary.not_counted]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Details Sheet
      if (safeData.items.length > 0) {
        // Group items by all fields except section_desc
        const groupKey = (item: typeof safeData.items[0]) => [item.form, item.grade, item.size, item.width, item.length, item.finish, item.ext_finish, item.mill, item.heat, item.branch].join('|');
        const groups: Record<string, typeof safeData.items> = {};
        safeData.items.forEach((item) => {
          const key = groupKey(item);
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
        });
        const exportRows: Array<Record<string, string | number>> = [];
        Object.values(groups).forEach((groupItems: typeof safeData.items) => {
          // Output all item-section rows
          groupItems.forEach((item) => {
            exportRows.push({
              'Group': item.form ?? '',
              'Size': item.size ?? '',
              'Grade': item.grade ?? '',
              'Width': item.width ?? '',
              'Length': item.length ?? '',
              'Whs': item.branch ?? '',
              'Phy Pcs': item.counted_qty ?? 0,
              'Value': item.section_desc ?? '',
              'OH PCS': item.system_qty ?? 0,
              'OH VAL': item.prd_ohd_mat_val ?? 0,
              'VAR PCS': (item.counted_qty ?? 0) - (item.system_qty ?? 0),
            });
          });
          // Totals row
          const sum = (field: keyof typeof groupItems[0]) => groupItems.reduce((acc, item) => acc + Number(item[field] ?? 0), 0);
          exportRows.push({
            'Group': '',
            'Size': '',
            'Grade': '',
            'Width': '',
            'Length': '',
            'Whs': '',
            'Phy Pcs': sum('counted_qty'),
            'Value': 'Totals:',
            'OH PCS': sum('system_qty'),
            'OH VAL': sum('prd_ohd_mat_val'),
            'VAR PCS': sum('counted_qty') - sum('system_qty'),
          });
          // Blank row
          exportRows.push({});
        });
        const ws = XLSX.utils.json_to_sheet(exportRows);
        XLSX.utils.book_append_sheet(workbook, ws, 'Details');
      }

      XLSX.writeFile(workbook, `Inventory_Reconciliation_${locationId}_${new Date().toISOString().slice(0,10)}.xlsx`);
      enqueueSnackbar('Report exported successfully', { variant: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      enqueueSnackbar('Failed to export report', { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleEnableRecheck = async () => {
    try {
      if (selectedItems.size === 0) {
        enqueueSnackbar('Please select at least one item to enable recheck', { variant: 'warning' });
        return;
      }

      const confirmRecheck = window.confirm(
        `Are you sure you want to enable rechecking for ${selectedItems.size} selected item(s)? ` +
        'This will mark the items for rechecking and highlight them in red.'
      );
      
      if (!confirmRecheck) return;

      // Get the selected items' data
      const selectedItemsData = filteredData
        .filter((_, index) => selectedItems.has(index))
        .map(item => ({
          form: item.form,
          grade: item.grade,
          size: item.size,
          finish: item.finish,
          ext_finish: item.ext_finish,
          width: item.width,
          length: item.length,
          mill: item.mill,
          heat: item.heat,
          system_qty: item.system_qty,
          counted_qty: item.counted_qty,
          variance: item.variance,
          status: item.status,
          original_transaction_ids: item.transaction_count ? [item.transaction_count] : []
        }));

      // Send to endpoint for recheck enabling
      const response = await servicesAPI.markItemsForRecheck({
        location_id: locationId,
        items: selectedItemsData,
        recheck_reason: 'Marked for rechecking due to variance'
      });
      
      enqueueSnackbar(response.data.message, { variant: 'success' });
      setSelectedItems(new Set());
      setSelectAll(false);
      
      // Add a small delay to ensure backend has processed the update
      setTimeout(() => {
        // Trigger a refresh of the parent component to update the data
        if (onDataRefresh) {
          onDataRefresh();
        } else if (onClose) {
          onClose();
        }
      }, 500);
      
    } catch (error) {
      console.error('Error enabling recheck:', error);
      enqueueSnackbar('Failed to enable recheck. Please try again.', { variant: 'error' });
    }
  };

  const handleRemoveRecheck = async () => {
    try {
      if (selectedItems.size === 0) {
        enqueueSnackbar('Please select at least one item to remove from recheck', { variant: 'warning' });
        return;
      }

      const confirmRemove = window.confirm(
        `Are you sure you want to remove ${selectedItems.size} selected item(s) from recheck status? ` +
        'This will remove the red highlighting and return them to their original status.'
      );
      
      if (!confirmRemove) return;

      // Get the selected items' data
      const selectedItemsData = filteredData
        .filter((_, index) => selectedItems.has(index))
        .map(item => ({
          form: item.form,
          grade: item.grade,
          size: item.size,
          finish: item.finish,
          ext_finish: item.ext_finish,
          width: item.width,
          length: item.length,
          mill: item.mill,
          heat: item.heat,
          system_qty: item.system_qty,
          counted_qty: item.counted_qty,
          variance: item.variance,
          status: item.status
        }));

      // Send to endpoint for removing recheck status
      const response = await servicesAPI.deleteRecheckItems(locationId, { items: selectedItemsData });
      
      enqueueSnackbar(response.data.message, { variant: 'success' });
      setSelectedItems(new Set());
      setSelectAll(false);
      
      // Add a small delay to ensure backend has processed the update
      setTimeout(() => {
        // Trigger a refresh of the parent component to update the data
        if (onDataRefresh) {
          onDataRefresh();
        } else if (onClose) {
          onClose();
        }
      }, 500);
      
    } catch (error) {
      console.error('Error removing recheck:', error);
      enqueueSnackbar('Failed to remove recheck status. Please try again.', { variant: 'error' });
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSelectAll(checked);
    
    if (checked) {
      // Get all indices from filtered data
      const selectableIndices = Array.from(Array(filteredData.length).keys());
      setSelectedItems(new Set(selectableIndices));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (selectedItems.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
    
    // Update selectAll state
    setSelectAll(newSelected.size === filteredData.length);
  };

  const handleFilterChange = (status: string) => {
    const currentIndex = statusFilter.indexOf(status);
    const newStatusFilter = [...statusFilter];

    if (currentIndex === -1) {
      newStatusFilter.push(status);
    } else {
      newStatusFilter.splice(currentIndex, 1);
    }

    setStatusFilter(newStatusFilter);
  };

  const handleEditItem = (item: any, index: number) => {
    setEditingItem({ ...item, index });
    setEditFormData({
      counted_qty: item.counted_qty ?? 0,
      remarks: item.remarks ?? ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (!editingItem) return;

      const newCountedQty = editFormData.counted_qty;
      const newVariance = newCountedQty - editingItem.system_qty;
      
      const updateData = {
        form: editingItem.form,
        grade: editingItem.grade,
        size: editingItem.size,
        finish: editingItem.finish,
        ext_finish: editingItem.ext_finish,
        width: editingItem.width,
        length: editingItem.length,
        mill: editingItem.mill,
        heat: editingItem.heat,
        counted_qty: newCountedQty,
        variance: newVariance,
        remarks: editFormData.remarks
      };
      
      console.log('Sending update data:', updateData);
      
      // Update the recheck item in the database
      await servicesAPI.updateRecheckItems(locationId, updateData);

      enqueueSnackbar('Item updated successfully', { variant: 'success' });
      setEditDialogOpen(false);
      setEditingItem(null);
      
      // Add a small delay to ensure backend has processed the update
      setTimeout(() => {
        // Trigger a refresh of the parent component to update the data
        if (onDataRefresh) {
          onDataRefresh();
        }
      }, 500);
    } catch (error) {
      console.error('Error updating item:', error);
      enqueueSnackbar('Failed to update item', { variant: 'error' });
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingItem(null);
    setEditFormData({ counted_qty: 0, remarks: '' });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '80vh'
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        backgroundColor: alpha(theme.palette.primary.light, 0.1),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        p: 3
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CompareArrows sx={{ mr: 2, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Inventory Reconciliation Report
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Export to Excel">
              <Button 
                variant="outlined" 
                onClick={handleExport}
                startIcon={isExporting ? <CircularProgress size={20} /> : <Download />}
                disabled={isExporting}
                sx={{ mr: 2 }}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </Tooltip>
            <Button 
              variant="contained" 
              onClick={onClose}
              color="primary"
            >
              Close
            </Button>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3, mt: 2 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              backgroundColor: alpha(theme.palette.primary.light, 0.1),
              height: '100%'
            }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Total System Items
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
                  {safeData.summary.total_system_items}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              backgroundColor: alpha(theme.palette.primary.light, 0.1),
              height: '100%'
            }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Counted
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
                  {safeData.summary.total_counted_items}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              backgroundColor: alpha(theme.palette.success.light, 0.1),
              height: '100%'
            }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">Matches</Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 600, color: theme.palette.success.main }}>
                  {safeData.summary.items_matched}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              backgroundColor: alpha(theme.palette.info.light, 0.1),
              height: '100%'
            }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">Overcounts</Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 600, color: theme.palette.info.main }}>
                  {safeData.summary.overcounts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              backgroundColor: alpha(theme.palette.error.light, 0.1),
              height: '100%'
            }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">Undercounts</Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 600, color: theme.palette.error.main }}>
                  {safeData.summary.undercounts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              backgroundColor: alpha(theme.palette.warning.light, 0.1),
              height: '100%'
            }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">Not Counted</Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 600, color: theme.palette.warning.main }}>
                  {safeData.summary.not_counted}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter Bar */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            fullWidth={isSmallScreen}
            size="small"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <Refresh />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ flexGrow: 1 }}
          />
          <Tooltip title="Filter by status">
            <IconButton onClick={(e) => setFilterAnchorEl(e.currentTarget)}>
              <FilterList />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Status Filter Menu */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={() => setFilterAnchorEl(null)}
        >
          {['Match', 'Overcount', 'Undercount', 'Not Counted', 'Rechecking in Progress', 'Rechecked'].map((status) => (
            <MenuItem key={status} onClick={() => handleFilterChange(status)}>
              <Checkbox
                checked={statusFilter.includes(status)}
                onChange={() => handleFilterChange(status)}
              />
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {status === 'Match' && <CheckCircleOutline fontSize="small" color="success" sx={{ mr: 1 }} />}
                {status === 'Overcount' && <Info fontSize="small" color="info" sx={{ mr: 1 }} />}
                {status === 'Undercount' && <Error fontSize="small" color="error" sx={{ mr: 1 }} />}
                {status === 'Not Counted' && <Warning fontSize="small" color="warning" sx={{ mr: 1 }} />}
                {status === 'Rechecking in Progress' && <Error fontSize="small" color="error" sx={{ mr: 1 }} />}
                {status === 'Rechecked' && <CheckCircleOutline fontSize="small" color="success" sx={{ mr: 1 }} />}
                {status}
              </Box>
            </MenuItem>
          ))}
        </Menu>

        {/* Data Table */}
              <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: 2, 
          mb: 3,
          maxHeight: '60vh',
          overflow: 'auto'
        }}
      >
        <Table size="small" sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow sx={{ 
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                '& th': { 
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: theme.palette.text.primary
                }
              }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAll}
                    indeterminate={
                      selectedItems.size > 0 && 
                      selectedItems.size < filteredData
                        .map(item => item.section_id)
                        .filter((id): id is number => id !== undefined)
                        .length
                    }
                  />
                </TableCell>
                <TableCell>Form</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Finish</TableCell>
                <TableCell>Ext. Finish</TableCell>
                <TableCell>Width</TableCell>
                <TableCell>Length</TableCell>
                <TableCell>Mill</TableCell>
                <TableCell>Heat</TableCell>
                <TableCell>Sections</TableCell>
                <TableCell align="right">System Qty</TableCell>
                <TableCell align="right">Counted Qty</TableCell>
                <TableCell align="right">Variance</TableCell>
                <TableCell align="right">Unit Cost</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No items found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item, index) => (
                  <TableRow 
                    key={index} 
                    hover
                    sx={{ 
                      backgroundColor: item.is_recheck_item
                        ? alpha(theme.palette.error.main, 0.3) // Red background for recheck items
                        : item.status === 'Match' 
                        ? alpha(theme.palette.success.main, 0.05)
                        : item.status === 'Overcount'
                        ? alpha(theme.palette.info.main, 0.05)
                        : item.status === 'Undercount'
                        ? alpha(theme.palette.error.main, 0.05)
                        : item.status === 'Rechecking in Progress'
                        ? alpha(theme.palette.error.main, 0.3) // Red highlight for recheck items
                        : item.status === 'Rechecked'
                        ? alpha(theme.palette.success.main, 0.15)
                        : alpha(theme.palette.warning.main, 0.05),
                      '&:hover': {
                        backgroundColor: item.is_recheck_item
                          ? alpha(theme.palette.error.main, 0.4) // Darker red on hover for recheck items
                          : item.status === 'Match' 
                          ? alpha(theme.palette.success.main, 0.1)
                          : item.status === 'Overcount'
                          ? alpha(theme.palette.info.main, 0.1)
                          : item.status === 'Undercount'
                          ? alpha(theme.palette.error.main, 0.1)
                          : item.status === 'Rechecking in Progress'
                          ? alpha(theme.palette.error.main, 0.4) // Darker red on hover
                          : item.status === 'Rechecked'
                          ? alpha(theme.palette.success.main, 0.2)
                          : alpha(theme.palette.warning.main, 0.1)
                      }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedItems.has(index)}
                        onChange={() => handleSelectItem(index)}
                      />
                    </TableCell>
                    <TableCell>{item.form}</TableCell>
                    <TableCell>{item.grade}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>{item.finish}</TableCell>
                    <TableCell>{item.ext_finish || '-'}</TableCell>
                    <TableCell>{item.width || '-'}</TableCell>
                    <TableCell>{item.length || '-'}</TableCell>
                                      <TableCell>{item.mill}</TableCell>
                  <TableCell>{item.heat}</TableCell>
                  <TableCell>
                    {item.section_details && item.section_details.length > 0 ? (
                      <Tooltip title={
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>Sections:</Typography>
                          {item.section_details.map((section, idx) => (
                            <Typography key={idx} variant="body2">
                              {section.section_desc}: {section.qty} pcs
                            </Typography>
                          ))}
                        </Box>
                      }>
                        <Chip
                          label={`${item.section_details.length} section${item.section_details.length > 1 ? 's' : ''}`}
                          size="small"
                          variant="outlined"
                          color="info"
                          sx={{ fontWeight: 500 }}
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {item.section_desc || '-'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{item.system_qty}</TableCell>
                    <TableCell align="right">{item.counted_qty}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={item.variance} 
                        size="small"
                        color={
                          item.variance === 0 ? 'success' :
                          item.variance > 0 ? 'info' : 'error'
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      {item.prd_ohd_mat_cst?.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      })}
                    </TableCell>
                    <TableCell align="right">
                      {item.prd_ohd_mat_val?.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      })}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.status} 
                        size="small"
                        sx={{ 
                          backgroundColor: getStatusColor(item.status).bgColor,
                          color: getStatusColor(item.status).color,
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {item.is_recheck_item && item.status === 'Rechecking in Progress' && (
                        <Tooltip title="Edit recheck item">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditItem(item, index)}
                            sx={{ 
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.2)
                              }
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ 
        padding: 2, 
        gap: 1,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        display: 'flex',
        alignItems: 'center'
      }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<AssignmentInd />}
          onClick={handleEnableRecheck}
          disabled={selectedItems.size === 0}
        >
          Enable Recheck ({selectedItems.size} selected)
        </Button>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<RemoveIcon />}
          onClick={handleRemoveRecheck}
          disabled={selectedItems.size === 0}
        >
          Remove Recheck ({selectedItems.size} selected)
        </Button>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Export to Excel">
          <Button 
            variant="outlined" 
            onClick={handleExport}
            startIcon={isExporting ? <CircularProgress size={20} /> : <Download />}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </Tooltip>
        <Button 
          variant="contained" 
          onClick={onClose}
          color="primary"
        >
          Close
        </Button>
      </DialogActions>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCancelEdit}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: alpha(theme.palette.primary.light, 0.1),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Edit sx={{ mr: 2, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Edit Recheck Item
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          {editingItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Item Details */}
              <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.info.light, 0.1) }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Item Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Form:</strong> {editingItem.form}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Grade:</strong> {editingItem.grade}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Size:</strong> {editingItem.size}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Finish:</strong> {editingItem.finish}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>System Qty:</strong> {editingItem.system_qty}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Current Variance:</strong> {editingItem.variance}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Edit Form */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Counted Quantity"
                  type="number"
                  value={editFormData.counted_qty}
                  onChange={(e) => setEditFormData(prev => ({
                    ...prev,
                    counted_qty: parseInt(e.target.value) || 0
                  }))}
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Remarks"
                  multiline
                  rows={3}
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData(prev => ({
                    ...prev,
                    remarks: e.target.value
                  }))}
                  placeholder="Add any remarks about this recheck..."
                />

                {/* Preview */}
                <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.warning.light, 0.1) }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Preview
                  </Typography>
                  <Typography variant="body2">
                    <strong>New Variance:</strong> {editFormData.counted_qty - (editingItem.system_qty || 0)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>New Status:</strong> {
                      editFormData.counted_qty === editingItem.system_qty ? 'Match' :
                      editFormData.counted_qty > editingItem.system_qty ? 'Overcount' : 'Undercount'
                    }
                  </Typography>
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          padding: 2, 
          gap: 1,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}>
          <Button 
            variant="outlined" 
            onClick={handleCancelEdit}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveEdit}
            color="primary"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default ReconciliationDialog;