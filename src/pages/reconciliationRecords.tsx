import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  alpha,
  Grid,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add,
  Visibility,
  Edit,
  Delete,
  Download,
  Refresh,
  CalendarToday,
  Person,
  MoreVert,
  ArrowBack
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';
import ReconciliationDialog from '../components/ReconciliationDialog';
import type { ReconciliationData } from '../types/reconciliation';
import { servicesAPI } from '../config/api';

interface ReconciliationRecord {
  id: number;
  record_name: string;
  record_date: string;
  created_by: number;
  created_by_name: string;
  status: string;
  summary_data: {
    total_system_items: number;
    total_counted_items: number;
    items_matched: number;
    overcounts: number;
    undercounts: number;
    not_counted: number;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}

const ReconciliationRecords: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    record_name: '',
    notes: ''
  });
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRecordForMenu, setSelectedRecordForMenu] = useState<ReconciliationRecord | null>(null);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [openReconciliationDialog, setOpenReconciliationDialog] = useState(false);
  const [currentViewedRecord, setCurrentViewedRecord] = useState<ReconciliationRecord | null>(null);

  useEffect(() => {
    if (locationId) {
      fetchRecords();
    }
  }, [locationId]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getReconciliationRecords(locationId || '');
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
      enqueueSnackbar('Failed to fetch reconciliation records', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecord = async (record: ReconciliationRecord) => {
    try {
      const response = await servicesAPI.getReconciliationRecord(record.id.toString());
      const recordData = response.data;
      
      // Fetch recheck items for this location
      let recheckItems: Array<{
        form: string;
        grade: string;
        size: string;
        finish: string;
        ext_finish: string;
        width: string | number;
        length: string | number;
        mill: string;
        heat: string;
        status: string;
        recheck_reason?: string;
        marked_by?: number;
        marked_at?: string;
        counted_qty?: number;
        variance?: number;
      }> = [];
      
      try {
        const recheckResponse = await servicesAPI.getRecheckItems(locationId || '');
        recheckItems = recheckResponse.data || [];
      } catch (error) {
        console.log('No recheck items found or error fetching recheck items:', error);
      }
      
      // Create a map of recheck items for quick lookup
      const recheckMap = new Map();
      recheckItems.forEach(recheckItem => {
        const key = `${recheckItem.form}-${recheckItem.grade}-${recheckItem.size}-${recheckItem.finish}-${recheckItem.ext_finish}-${recheckItem.width}-${recheckItem.length}-${recheckItem.mill}-${recheckItem.heat}`;
        recheckMap.set(key, recheckItem);
      });
      
      // Merge recheck data with reconciliation items
      const mergedItems = recordData.items_data.map((item: any) => {
        const key = `${item.form}-${item.grade}-${item.size}-${item.finish}-${item.ext_finish}-${item.width}-${item.length}-${item.mill}-${item.heat}`;
        const recheckItem = recheckMap.get(key);
        
        if (recheckItem) {
          // Only mark as recheck item if status is still "Rechecking in Progress"
          const isRecheckItem = recheckItem.status === 'Rechecking in Progress';
          
          return {
            ...item,
            // Update counted_qty and variance from recheck item data
            counted_qty: recheckItem.counted_qty ?? item.counted_qty,
            variance: recheckItem.variance ?? item.variance,
            status: recheckItem.status,
            is_recheck_item: isRecheckItem,
            recheck_reason: recheckItem.recheck_reason,
            marked_by: recheckItem.marked_by,
            marked_at: recheckItem.marked_at
          };
        }
        
        return {
          ...item,
          is_recheck_item: false
        };
      });
      
      // Transform the data to match ReconciliationData format
      const transformedData: ReconciliationData = {
        summary: recordData.summary_data,
        items: mergedItems
      };
      
      setReconciliationData(transformedData);
      setCurrentViewedRecord(record);
      setOpenReconciliationDialog(true);
    } catch (error) {
      console.error('Error fetching record details:', error);
      enqueueSnackbar('Failed to fetch record details', { variant: 'error' });
    }
  };

  const handleEditRecord = (record: ReconciliationRecord) => {
    setSelectedRecord(record);
    setEditForm({
      record_name: record.record_name,
      notes: record.notes || ''
    });
    setOpenEditDialog(true);
    setMenuAnchorEl(null);
  };

  const handleUpdateRecord = async () => {
    if (!selectedRecord) return;

    try {
      await servicesAPI.updateReconciliationRecord(selectedRecord.id.toString(), editForm);
      enqueueSnackbar('Record updated successfully', { variant: 'success' });
      setOpenEditDialog(false);
      fetchRecords();
    } catch (error) {
      console.error('Error updating record:', error);
      enqueueSnackbar('Failed to update record', { variant: 'error' });
    }
  };

  const handleDeleteRecord = async (record: ReconciliationRecord) => {
    if (!window.confirm(`Are you sure you want to delete the record "${record.record_name}"?`)) {
      return;
    }

    try {
      await servicesAPI.deleteReconciliationRecord(record.id.toString());
      enqueueSnackbar('Record deleted successfully', { variant: 'success' });
      fetchRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      enqueueSnackbar('Failed to delete record', { variant: 'error' });
    }
    setMenuAnchorEl(null);
  };

  const handleExportRecord = async (record: ReconciliationRecord) => {
    try {
      const response = await servicesAPI.getReconciliationRecord(record.id.toString());
      const recordData = response.data;
      
      const workbook = XLSX.utils.book_new();
      
      // Summary Sheet
      const summaryData = [
        ['Reconciliation Summary'],
        ['Record Name', record.record_name],
        ['Record Date', new Date(record.record_date).toLocaleDateString()],
        ['Created By', record.created_by_name],
        [''],
        ['Total System Items', recordData.summary_data.total_system_items],
        ['Total Counted Items', recordData.summary_data.total_counted_items],
        ['Items Matched', recordData.summary_data.items_matched],
        ['Overcounts', recordData.summary_data.overcounts],
        ['Undercounts', recordData.summary_data.undercounts],
        ['Not Counted', recordData.summary_data.not_counted]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Details Sheet
      if (recordData.items_data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(recordData.items_data);
        XLSX.utils.book_append_sheet(workbook, ws, 'Details');
      }

      XLSX.writeFile(workbook, `Reconciliation_${record.record_name}_${new Date().toISOString().slice(0,10)}.xlsx`);
      enqueueSnackbar('Record exported successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error exporting record:', error);
      enqueueSnackbar('Failed to export record', { variant: 'error' });
    }
    setMenuAnchorEl(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, record: ReconciliationRecord) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedRecordForMenu(record);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedRecordForMenu(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Reconciliation Records
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchRecords}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate(`/checker-review/${locationId}`)}
          >
            Create New Record
          </Button>
        </Box>
      </Box>

      {/* Records Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
              <TableCell sx={{ fontWeight: 600 }}>Record Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Summary</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No reconciliation records found
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate(`/checker-review/${locationId}`)}
                    sx={{ mt: 2 }}
                  >
                    Create First Record
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {record.record_name}
                    </Typography>
                    {record.notes && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {record.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      {formatDate(record.record_date)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Person sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      {record.created_by_name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Grid container spacing={1}>
                      <Grid item>
                        <Chip 
                          label={`${record.summary_data.total_system_items} System`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item>
                        <Chip 
                          label={`${record.summary_data.items_matched} Matched`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item>
                        <Chip 
                          label={`${record.summary_data.overcounts + record.summary_data.undercounts} Variances`}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={record.status}
                      size="small"
                      color={record.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewRecord(record)}
                          color="primary"
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More Actions">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, record)}
                        >
                          <MoreVert />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Record</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Record Name"
            value={editForm.record_name}
            onChange={(e) => setEditForm({ ...editForm, record_name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Notes"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateRecord} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedRecordForMenu && handleEditRecord(selectedRecordForMenu)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedRecordForMenu && handleExportRecord(selectedRecordForMenu)}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => selectedRecordForMenu && handleDeleteRecord(selectedRecordForMenu)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Reconciliation Dialog */}
      {reconciliationData && (
        <ReconciliationDialog
          open={openReconciliationDialog}
          onClose={() => setOpenReconciliationDialog(false)}
          data={reconciliationData}
          locationId={locationId || ''}
          onDataRefresh={() => {
            // Refresh the data when dialog requests it
            if (currentViewedRecord) {
              handleViewRecord(currentViewedRecord);
            }
          }}
        />
      )}
    </Box>
  );
};

export default ReconciliationRecords; 