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
  Chip,
  CircularProgress,
  Button,
  Grid,
  Collapse,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemIcon,
  ListItemText,
  Avatar,
  TableContainer,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  ChevronLeft, 
  ListAlt, 
  ExpandLess, 
  ExpandMore,
  Info, 
  Search,
  Refresh,
  FilterList,
  LocationOn,
  MoreVert,
  Download,
  Merge,
  Numbers,
  Inventory,
  CompareArrows,
  Edit,
  Save,
  Cancel,
  ViewColumn
} from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useParams, useNavigate } from 'react-router-dom';
import { servicesAPI } from '../config/api';
import ConsolidatedView from '../components/ConsolidatedView';
import * as XLSX from 'xlsx';
import { Transaction, ConsolidatedItem } from '../types/common';
import { ReconciliationData } from '../types/reconciliation';

interface Section {
  section_id: number;
  section_desc: string;
  warehouse: string;
  branch: string;
  location_desc: string;
  status: string;
  team_name?: string; // Team assigned to count this section
  checker_assigned?: string;
}

/** Format date as MM-DD-YYYY for display on Counter Review page */
const formatDateMMDDYYYY = (dateString: string): string => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'N/A';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}-${day}-${year}`;
};

type CounterReviewColumnId =
  | 'tag' | 'section' | 'form' | 'grade' | 'size' | 'finish' | 'ext_finish' | 'width' | 'length' | 'mill' | 'heat'
  | 'location' | 'type' | 'remarks' | 'ad_cmts' | 'page_number' | 'serial_number' | 'qty' | 'counted_by' | 'team' | 'date' | 'details' | 'actions';

// Reconciliation: optional fields (user can include/exclude).
// Order for backend key consistency: tag_no first, location after length.
const RECONCILE_OPTIONAL_FIELDS: { id: string; label: string }[] = [
  { id: 'sys_tag_no', label: 'Tag / System Tag No' },
  { id: 'location', label: 'Location' },
  { id: 'mill', label: 'Mill' },
  { id: 'heat', label: 'Heat' },
  { id: 'type', label: 'Type' },
  { id: 'quality', label: 'Quality' },
];
// Always-included comparison fields (display only). Backend order: form, grade, size, finish, ext_finish, width, length.
const RECONCILE_ALWAYS_FIELDS_LABELS = ['Form', 'Grade', 'Size', 'Finish', 'Ext. Finish', 'Width', 'Length'];

const COUNTER_REVIEW_COLUMNS: { id: CounterReviewColumnId; label: string; alwaysVisible?: boolean }[] = [
  { id: 'tag', label: 'Tag' },
  { id: 'section', label: 'Section' },
  { id: 'form', label: 'Form' },
  { id: 'grade', label: 'Grade' },
  { id: 'size', label: 'Size' },
  { id: 'finish', label: 'Finish' },
  { id: 'ext_finish', label: 'Ext Finish' },
  { id: 'width', label: 'Width' },
  { id: 'length', label: 'Length' },
  { id: 'mill', label: 'Mill' },
  { id: 'heat', label: 'Heat' },
  { id: 'location', label: 'Location' },
  { id: 'type', label: 'Type' },
  { id: 'remarks', label: 'Quality' },
  { id: 'ad_cmts', label: 'Comments' },
  { id: 'page_number', label: 'Page Number' },
  { id: 'serial_number', label: 'Count Line Number' },
  { id: 'qty', label: 'Qty' },
  { id: 'counted_by', label: 'Counted By' },
  { id: 'team', label: 'Team' },
  { id: 'date', label: 'Date' },
  { id: 'details', label: 'Details', alwaysVisible: true },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
];

const PageCard = styled(Paper)(({ theme }) => ({
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
}));

const HeaderCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3, 3),
  borderRadius: 16,
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.dark, 0.92)} 100%)`,
  color: theme.palette.primary.contrastText,
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.25)}`,
  border: 'none',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    width: '40%',
    height: '100%',
    background: `linear-gradient(to left, ${alpha(theme.palette.common.white, 0.12)}, transparent)`,
    pointerEvents: 'none',
  },
}));

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2, 2.5),
  borderRadius: 12,
  background: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
  boxShadow: 'none',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
    borderColor: alpha(theme.palette.primary.main, 0.2),
  },
}));

const SearchFilterCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5, 3),
  borderRadius: 16,
  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
  background: alpha(theme.palette.primary.main, 0.02),
  boxShadow: 'none',
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
  '& .MuiTableHead-root .MuiTableCell-root': {
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.palette.text.secondary,
    background: alpha(theme.palette.primary.main, 0.06),
    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`,
    padding: theme.spacing(1.5, 1.25),
  },
  '& .MuiTableBody-root .MuiTableRow-root': {
    transition: 'background-color 0.15s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
    },
  },
  '& .MuiTableBody-root .MuiTableCell-root': {
    padding: theme.spacing(1.25, 1.25),
    fontSize: '0.8125rem',
  },
}));

interface TransactionRowProps {
  transaction: Transaction;
  sections: Section[];
  isEditing: boolean;
  isSaving: boolean;
  onEdit: (transaction: Transaction) => void;
  onSave: (transactionId: number, updatedData: Record<string, unknown>) => void;
  onCancel: () => void;
  isMarked?: boolean;
  visibleColumnList: { id: CounterReviewColumnId; label: string }[];
}

const TransactionRow = ({
  transaction,
  sections,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  isMarked,
  visibleColumnList,
}: TransactionRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [editFormData, setEditFormData] = useState({
    tag_id: transaction.tag_id,
    sys_tag_no: transaction.sys_tag_no,
    form: transaction.form,
    grade: transaction.grade,
    size: transaction.size,
    finish: transaction.finish,
    ext_finish: transaction.ext_finish,
    width: transaction.width,
    length: transaction.length,
    mill: transaction.mill,
    heat: transaction.heat,
    location: transaction.location || '',
    type: transaction.type || '',
    remarks: transaction.remarks || '',
    ad_cmts: transaction.ad_cmts || '',
    page_number: transaction.page_number || '',
    serial_number: transaction.serial_number || '',
    qty: transaction.qty
  });

  // Reset form data when editing starts
  useEffect(() => {
    if (isEditing) {
      setEditFormData({
        tag_id: transaction.tag_id,
        sys_tag_no: transaction.sys_tag_no,
        form: transaction.form,
        grade: transaction.grade,
        size: transaction.size,
        finish: transaction.finish,
        ext_finish: transaction.ext_finish,
        width: transaction.width,
        length: transaction.length,
        mill: transaction.mill,
        heat: transaction.heat,
        location: transaction.location || '',
        type: transaction.type || '',
        remarks: transaction.remarks || '',
        ad_cmts: transaction.ad_cmts || '',
        page_number: transaction.page_number || '',
        serial_number: transaction.serial_number || '',
        qty: transaction.qty
      });
    }
  }, [isEditing, transaction]);
  const theme = useTheme();

  const totalQuantity = transaction.count_type === 'bundle' 
    ? transaction.bundles?.reduce((total, bundle) => total + (bundle.num_of_bundle * bundle.bundle_count), 0)
    : transaction.qty;

  const handleFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Find the section for this transaction
  const section = sections.find(s => s.section_id === transaction.section_id);
  
  // Debug logging
  if (!section) {
    console.log('Section not found for transaction:', {
      transactionSectionId: transaction.section_id,
      availableSections: sections.map(s => ({ id: s.section_id, name: s.section_desc })),
      transaction: transaction
    });
  }

  const renderCell = (colId: CounterReviewColumnId) => {
    const cell = (content: React.ReactNode, sx?: object) => <TableCell key={colId} sx={sx}>{content}</TableCell>;
    switch (colId) {
      case 'tag':
        return cell(
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isEditing ? (
              <TextField size="small" value={editFormData.sys_tag_no ?? ''} onChange={(e) => handleFormChange('sys_tag_no', e.target.value)} placeholder="System Tag No" sx={{ minWidth: 120 }} />
            ) : (transaction.sys_tag_no != null && String(transaction.sys_tag_no).trim() !== '') ? (
              <Chip label={transaction.sys_tag_no} color="primary" variant="filled" size="small" sx={{ fontWeight: 600 }} />
            ) : (
              <Typography component="span" variant="body2" color="text.secondary">–</Typography>
            )}
            {isMarked && <Chip label="Marked" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />}
          </Box>
        );
      case 'section':
        return cell(<Chip label={section?.section_desc || 'Unknown'} size="small" variant="outlined" color="info" sx={{ fontWeight: 500 }} />);
      case 'form':
        return cell(isEditing ? <TextField size="small" value={editFormData.form || ''} onChange={(e) => handleFormChange('form', e.target.value)} sx={{ minWidth: 80 }} /> : <Chip label={transaction.form} size="small" variant="outlined" sx={{ fontWeight: 500 }} />);
      case 'grade':
        return cell(isEditing ? <TextField size="small" value={editFormData.grade || ''} onChange={(e) => handleFormChange('grade', e.target.value)} sx={{ minWidth: 80 }} /> : transaction.grade);
      case 'size':
        return cell(isEditing ? <TextField size="small" value={editFormData.size || ''} onChange={(e) => handleFormChange('size', e.target.value)} sx={{ minWidth: 80 }} /> : transaction.size);
      case 'finish':
        return cell(isEditing ? <TextField size="small" value={editFormData.finish || ''} onChange={(e) => handleFormChange('finish', e.target.value)} sx={{ minWidth: 80 }} /> : transaction.finish);
      case 'ext_finish':
        return cell(isEditing ? <TextField size="small" value={editFormData.ext_finish || ''} onChange={(e) => handleFormChange('ext_finish', e.target.value)} sx={{ minWidth: 80 }} /> : (transaction.ext_finish || '-'));
      case 'width':
        return cell(isEditing ? <TextField size="small" value={editFormData.width || ''} onChange={(e) => handleFormChange('width', e.target.value)} sx={{ minWidth: 80 }} /> : (transaction.width || '-'));
      case 'length':
        return cell(isEditing ? <TextField size="small" value={editFormData.length || ''} onChange={(e) => handleFormChange('length', e.target.value)} sx={{ minWidth: 80 }} /> : (transaction.length || '-'));
      case 'mill':
        return cell(isEditing ? <TextField size="small" value={editFormData.mill || ''} onChange={(e) => handleFormChange('mill', e.target.value)} sx={{ minWidth: 80 }} /> : (transaction.mill || '-'));
      case 'heat':
        return cell(isEditing ? <TextField size="small" value={editFormData.heat || ''} onChange={(e) => handleFormChange('heat', e.target.value)} sx={{ minWidth: 80 }} /> : (transaction.heat || '-'));
      case 'location':
        return cell(isEditing ? <TextField size="small" value={editFormData.location || ''} onChange={(e) => handleFormChange('location', e.target.value)} sx={{ minWidth: 100 }} /> : (transaction.location || '-'));
      case 'type':
        return cell(isEditing ? <TextField size="small" value={editFormData.type || ''} onChange={(e) => handleFormChange('type', e.target.value)} sx={{ minWidth: 80 }} /> : (transaction.type || '-'));
      case 'remarks':
        return cell(
          isEditing ? <TextField size="small" value={editFormData.remarks || ''} onChange={(e) => handleFormChange('remarks', e.target.value)} sx={{ minWidth: 120 }} /> : (transaction.remarks ? <Tooltip title={transaction.remarks}><Typography variant="body2" noWrap>{transaction.remarks}</Typography></Tooltip> : '-'),
          { maxWidth: 200 }
        );
      case 'ad_cmts':
        return cell(
          isEditing ? <TextField size="small" value={editFormData.ad_cmts || ''} onChange={(e) => handleFormChange('ad_cmts', e.target.value)} sx={{ minWidth: 120 }} /> : (transaction.ad_cmts ? <Tooltip title={transaction.ad_cmts}><Typography variant="body2" noWrap>{transaction.ad_cmts}</Typography></Tooltip> : '-'),
          { maxWidth: 200 }
        );
      case 'page_number':
        return cell(isEditing ? <TextField size="small" value={editFormData.page_number || ''} onChange={(e) => handleFormChange('page_number', e.target.value)} sx={{ minWidth: 100 }} /> : (transaction.page_number || '-'));
      case 'serial_number':
        return cell(isEditing ? <TextField size="small" value={editFormData.serial_number || ''} onChange={(e) => handleFormChange('serial_number', e.target.value)} sx={{ minWidth: 100 }} /> : (transaction.serial_number || '-'));
      case 'qty':
        return cell(isEditing ? <TextField size="small" type="number" value={editFormData.qty || ''} onChange={(e) => handleFormChange('qty', e.target.value)} sx={{ minWidth: 80 }} /> : <Chip label={totalQuantity} color={transaction.count_type === 'bundle' ? 'primary' : 'default'} variant="outlined" size="small" sx={{ fontWeight: 600, minWidth: 40 }} />);
      case 'counted_by':
        return cell(
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem', bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.dark }}>{transaction.counted_by?.charAt(0) || '?'}</Avatar>
            {transaction.counted_by || 'Unknown'}
          </Box>
        );
      case 'team':
        return cell(<Chip label={transaction.team_name} size="small" sx={{ fontWeight: 500 }} />);
      case 'date':
        return cell(<Tooltip title={transaction.created_at ? formatDateMMDDYYYY(transaction.created_at) : 'No date available'}><Typography variant="body2" noWrap>{transaction.created_at ? formatDateMMDDYYYY(transaction.created_at) : 'N/A'}</Typography></Tooltip>);
      case 'details':
        return cell(transaction.count_type === 'bundle' && (
          <Button size="small" variant="outlined" onClick={() => setExpanded(!expanded)} startIcon={<Info />} endIcon={expanded ? <ExpandLess /> : <ExpandMore />} sx={{ borderRadius: 2, minWidth: 100, fontWeight: 600, textTransform: 'none', backgroundColor: expanded ? alpha(theme.palette.primary.main, 0.08) : 'transparent' }}>{expanded ? 'Hide' : 'Details'}</Button>
        ));
      case 'actions':
        return cell(
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isEditing ? (
              <> <Tooltip title={isSaving ? 'Saving...' : 'Save changes'}><IconButton size="small" color="primary" disabled={isSaving} onClick={() => transaction.transaction_id && onSave(transaction.transaction_id, editFormData)}>{isSaving ? <CircularProgress size={16} /> : <Save fontSize="small" />}</IconButton></Tooltip>
                <Tooltip title="Cancel"><IconButton size="small" color="error" onClick={onCancel}><Cancel fontSize="small" /></IconButton></Tooltip> </>
            ) : (
              <Tooltip title="Edit transaction"><IconButton size="small" color="primary" onClick={() => onEdit(transaction)}><Edit fontSize="small" /></IconButton></Tooltip>
            )}
          </Box>
        );
      default:
        return cell('-');
    }
  };

  return (
    <>
      <TableRow hover sx={{ 
        '&:last-child td, &:last-child th': { border: 0 },
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.light, 0.05)
        },
        // Add border and background for marked items
        ...(isMarked && {
          borderLeft: '4px solid #1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.05)',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)'
          }
        })
      }}>
        {visibleColumnList.map(col => renderCell(col.id))}
      </TableRow>
      {transaction.count_type === 'bundle' && (
        <TableRow>
          <TableCell colSpan={visibleColumnList.length} sx={{ p: 0, borderBottom: 0, backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2.5, mx: 2, mb: 1.5, borderRadius: 2, borderLeft: `4px solid ${theme.palette.primary.main}`, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>
                <Typography variant="subtitle2" gutterBottom fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterList fontSize="small" /> Bundle breakdown
                </Typography>
                <Table size="small" sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: 1.5,
                  boxShadow: `0 1px 8px ${alpha(theme.palette.common.black, 0.06)}`,
                  '& th': { fontWeight: 600, fontSize: '0.75rem', backgroundColor: alpha(theme.palette.primary.main, 0.08) },
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bundles</TableCell>
                      <TableCell>Count</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transaction.bundles?.map((bundle, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{bundle.num_of_bundle}</TableCell>
                        <TableCell>{bundle.bundle_count}</TableCell>
                        <TableCell>
                          <strong>{bundle.num_of_bundle * bundle.bundle_count}</strong>
                        </TableCell>
                        <TableCell>{formatDateMMDDYYYY(bundle.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const CountReviewPage = () => {
  const { location_id } = useParams<{ location_id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [sections, setSections] = useState<Section[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState({
    sections: true,
    transactions: false,
    reconcile: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuPosition, setExportMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedItem[]>([]);
  const [openConsolidateDialog, setOpenConsolidateDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<number | null>(null);
  const [savingTransaction, setSavingTransaction] = useState<number | null>(null);

  const [exporting, setExporting] = useState(false);
  const [checkerDialogOpen, setCheckerDialogOpen] = useState(false);
  const [selectedSection] = useState<Section | null>(null);
  const [users] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [existingCheckerDialogOpen, setExistingCheckerDialogOpen] = useState(false);
  const [existingCheckerInfo, setExistingCheckerInfo] = useState<{userName: string, teamName: string} | null>(null);
  const [markedItems, setMarkedItems] = useState<Set<number>>(new Set());
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState<null | HTMLElement>(null);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const toggleableColumnIds = COUNTER_REVIEW_COLUMNS.filter(c => !c.alwaysVisible).map(c => c.id);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    toggleableColumnIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})
  );
  const isColumnVisible = (id: CounterReviewColumnId) => {
    const col = COUNTER_REVIEW_COLUMNS.find(c => c.id === id);
    return col?.alwaysVisible || !!visibleColumns[id];
  };
  const visibleColumnList = COUNTER_REVIEW_COLUMNS.filter(c => isColumnVisible(c.id));
  const setColumnVisible = (id: string, visible: boolean) => setVisibleColumns(prev => ({ ...prev, [id]: visible }));
  const showAllColumns = () => setVisibleColumns(toggleableColumnIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}));
  const hideAllColumns = () => setVisibleColumns(toggleableColumnIds.reduce((acc, id) => ({ ...acc, [id]: false }), {}));

  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [reconcileIncludeTag, setReconcileIncludeTag] = useState(true);
  const [reconcileIncludeLocation, setReconcileIncludeLocation] = useState(true);
  const [reconcileIncludeMill, setReconcileIncludeMill] = useState(true);
  const [reconcileIncludeHeat, setReconcileIncludeHeat] = useState(true);
  const [reconcileIncludeType, setReconcileIncludeType] = useState(true);
  const [reconcileIncludeQuality, setReconcileIncludeQuality] = useState(true);

  const getReconcileCompareFields = (): string[] => {
    const parts: string[] = [];
    if (reconcileIncludeTag) parts.push('sys_tag_no');
    parts.push('form', 'grade', 'size', 'finish', 'ext_finish', 'width', 'length');
    if (reconcileIncludeLocation) parts.push('location');
    if (reconcileIncludeMill) parts.push('mill');
    if (reconcileIncludeHeat) parts.push('heat');
    if (reconcileIncludeType) parts.push('type');
    if (reconcileIncludeQuality) parts.push('quality');
    return parts;
  };

  // Fetch marked items for checking
  const fetchMarkedItems = async () => {
    if (!location_id) return;
    
    try {
      const response = await servicesAPI.getMarkedItemsForChecking(location_id);
      if (response.data.success) {
        const markedSet = new Set<number>();
        response.data.items.forEach((item: any) => {
          if (item.transaction_id) {
            markedSet.add(item.transaction_id);
          }
        });
        setMarkedItems(markedSet);
      }
    } catch (error) {
      console.error('Error fetching marked items:', error);
    }
  };

  useEffect(() => {
    if (location_id) {
      fetchSections();
      fetchMarkedItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location_id]);

  // Auto-load transactions when sections are loaded
  useEffect(() => {
    if (sections.length > 0) {
      loadAllTransactions();
    }
  }, [sections]);

  // Filter transactions based on search and section filter
  useEffect(() => {
    let filtered = allTransactions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.form.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.finish.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.counted_by?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply section filter
    if (sectionFilter !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.section_id === parseInt(sectionFilter)
      );
    }

    // Order by tag_id (numeric)
    filtered = [...filtered].sort((a, b) => (Number(a.tag_id) || 0) - (Number(b.tag_id) || 0));

    setFilteredTransactions(filtered);
  }, [searchTerm, sectionFilter, allTransactions]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const menuWidth = 260;
    setExportMenuAnchor(target);
    setExportMenuPosition({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - menuWidth),
    });
  };

  const handleMenuClose = () => {
    setExportMenuAnchor(null);
    setExportMenuPosition(null);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    console.log('Starting edit for transaction:', transaction.transaction_id);
    setEditingTransaction(transaction.transaction_id || null);
  };

  const handleSaveEdit = async (transactionId: number, updatedData: any) => {
    console.log('Saving edit for transaction:', transactionId, 'with data:', updatedData);
    setSavingTransaction(transactionId);
    
    try {
      // Find the original transaction to get all required fields
      const originalTransaction = allTransactions.find(t => t.transaction_id === transactionId);
      if (!originalTransaction) {
        console.error('Original transaction not found');
        setSnackbar({ open: true, message: 'Transaction not found. Please refresh and try again.', severity: 'error' });
        return;
      }

      console.log('Sending update data:', updatedData);
      console.log('Transaction ID type:', typeof transactionId, 'value:', transactionId);

      // Call the API to update the transaction using the counter review endpoint
      const response = await servicesAPI.updateCounterReviewTransaction(transactionId.toString(), updatedData);
      
      if (response.data.success) {
        // Update the local state with the new data
        setAllTransactions(prev => 
          prev.map(t => 
            t.transaction_id === transactionId 
              ? { ...t, ...updatedData }
              : t
          )
        );
        
        setEditingTransaction(null);
        console.log('Transaction updated successfully');
        setSnackbar({ open: true, message: 'Transaction updated successfully!', severity: 'success' });
      } else {
        throw new Error(response.data.error || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      setSnackbar({ open: true, message: `Failed to save changes: ${errorMessage}`, severity: 'error' });
    } finally {
      setSavingTransaction(null);
    }
  };

  const handleCancelEdit = () => {
    console.log('Canceling edit');
    setEditingTransaction(null);
  };

  const loadAllTransactions = async () => {
    setLoading(prev => ({ ...prev, transactions: true }));
    
    try {
      const allTransactionsData: Transaction[] = [];
      
      console.log('Loading transactions for sections:', sections.map(s => ({ id: s.section_id, name: s.section_desc })));
      
      for (const section of sections) {
        const response = await servicesAPI.getReviewTransactionsForCounter(
          location_id?.toString() || '',
          section.section_id.toString()
        );
        
        // Add section_id to each transaction for proper matching
        const transactionsWithSection = response.data.map((transaction: any) => ({
          ...transaction,
          section_id: section.section_id
        }));
        
        allTransactionsData.push(...transactionsWithSection);
      }
      
      console.log('Loaded transactions:', allTransactionsData);
      setAllTransactions(allTransactionsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  const handleReconcile = async (compareFields: string[]) => {
    if (compareFields.length === 0) {
      setSnackbar({ open: true, message: 'Select at least one field for comparison.', severity: 'warning' });
      return;
    }
    try {
      setLoading(prev => ({ ...prev, reconcile: true }));
      setReconcileDialogOpen(false);

      if (sections.length === 0) {
        setSnackbar({ open: true, message: 'No sections found for this location', severity: 'warning' });
        return;
      }

      const firstSection = sections[0];
      const warehouse = firstSection.warehouse;
      const branch = firstSection.branch || 'Unknown';

      const payload = {
        location_id: location_id,
        warehouse: warehouse,
        branch: branch,
        role: 'Counter',
        compare_fields: compareFields,
      };

      console.log('Reconciliation request:', payload);

      const response = await servicesAPI.reconcileInventory(payload);
      const reconciliationResults = response.data;

      // Attempt to auto-save the reconciliation data right away
      try {
        const saveData = {
          location_id: location_id,
          warehouse: warehouse,
          branch: branch,
          summary_data: reconciliationResults.summary,
          items_data: reconciliationResults.items,
          checker_data: reconciliationResults.checker_data || [],
          orphaned_checker_data: reconciliationResults.orphaned_checker_data || [],
          notes: 'Auto-saved during reconciliation from counter review page'
        };
        
        await servicesAPI.saveReconciliationWithComparison(saveData);
        console.log('Reconciliation data successfully auto-saved');
      } catch (saveError) {
        console.error('Auto-save failed:', saveError);
      }

      const transformedData: ReconciliationData = {
        summary: reconciliationResults.summary,
        items: reconciliationResults.items,
      };

      navigate(`/reconciliation/counter/${location_id}`, {
        state: { reconciliationData: transformedData },
      });
    } catch (error: unknown) {
      console.error('Reconciliation error:', error);
      const axiosError = error as { response?: { data?: { error?: string; details?: string } } };
      const errorMsg =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.details ||
        'Failed to reconcile inventory. Please try again.';
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: 'error',
      });
    } finally {
      setLoading(prev => ({ ...prev, reconcile: false }));
    }
  };

  const handleDownloadCount = async () => {
    handleMenuClose();
    setExporting(true);
    
    try {
      const data = filteredTransactions.map(transaction => {
        const section = sections.find(s => s.section_id === transaction.section_id);
  
        return {
          'Tag No': (transaction.sys_tag_no != null && String(transaction.sys_tag_no).trim() !== '') ? transaction.sys_tag_no : '–',
          'Form': transaction.form,
          'Grade': transaction.grade,
          'Size': transaction.size,
          'Finish': transaction.finish,
          'Ext Finish': transaction.ext_finish || '',
          'Width': transaction.width || '',
          'Length': transaction.length || '',
          'Total Qty': transaction.count_type === 'bundle' 
            ? transaction.bundles?.reduce((total, bundle) => total + (bundle.num_of_bundle * bundle.bundle_count), 0)
            : transaction.qty,
          'Location Description': section?.location_desc || '',
          'Section Description': section?.section_desc || '',
          'Remarks': transaction.remarks || '',
          'Count Type': transaction.count_type,
          'Counted By': transaction.counted_by,
          'Team': transaction.team_name,
          'Counted At': transaction.created_at ? formatDateMMDDYYYY(transaction.created_at) : 'N/A'
        };
      });
  
      const ws = XLSX.utils.json_to_sheet(data, {
        header: [
          'Tag ID',
          'Form',
          'Grade',
          'Size',
          'Finish',
          'Ext Finish',
          'Width',
          'Length',
          'Total Qty',
          'Location Description',
          'Section Description'
        ]
      });
  
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory Count");
  
      const fileName = `Inventory_Count_Location_${location_id}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting data:', error);
      setSnackbar({ open: true, message: 'Failed to export data. Please try again.', severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleConsolidate = () => {
    handleMenuClose();
    consolidateItems();
  };

  const consolidateItems = () => {
    const consolidated: Record<string, ConsolidatedItem> = {};

    filteredTransactions.forEach(transaction => {
      const key = `${transaction.form}-${transaction.grade}-${transaction.size}-${transaction.finish}-${transaction.ext_finish}-${transaction.width}-${transaction.length}`;
      
      if (!consolidated[key]) {
        consolidated[key] = {
          form: transaction.form,
          grade: transaction.grade,
          size: transaction.size,
          finish: transaction.finish,
          ext_finish: transaction.ext_finish,
          width: transaction.width,
          length: transaction.length,
          total_qty: transaction.count_type === 'bundle' 
            ? (transaction.bundles?.reduce((total, bundle) => total + (bundle.num_of_bundle * bundle.bundle_count), 0) || 0 ): (transaction.qty || 0),
          count_type: transaction.count_type,
          items: [transaction]
        };
      } else {
        consolidated[key].total_qty += transaction.count_type === 'bundle'
          ? (transaction.bundles?.reduce((total, bundle) => total + (bundle.num_of_bundle * bundle.bundle_count), 0) || 0)
          : (transaction.qty || 0);
        consolidated[key].items.push(transaction);
      }
    });

    setConsolidatedData(Object.values(consolidated));
    setOpenConsolidateDialog(true);
  };

  const handleCloseConsolidateDialog = () => {
    setOpenConsolidateDialog(false);
  };

  const fetchSections = async () => {
    try {
      setLoading(prev => ({ ...prev, sections: true }));
      const response = await servicesAPI.getSections(location_id?.toString() || '');
      setSections(response.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoading(prev => ({ ...prev, sections: false }));
    }
  };

  const handleRefresh = () => {
    fetchSections();
    setAllTransactions([]);
    setFilteredTransactions([]);
    setSearchTerm('');
    setSectionFilter('all');
  };

  const checkExistingChecker = async (userId: string, locationId: string, sectionId: number) => {
    try {
      const response = await servicesAPI.checkExistingChecker({
        user_id: userId,
        location_id: locationId,
        section_id: sectionId
      });
      return response.data;
    } catch (error) {
      console.error('Error checking existing checker:', error);
      return null;
    }
  };

  const assignChecker = async () => {
    if (!selectedSection || !selectedUser) return;
    try {
      await servicesAPI.assignChecker({
        location_id,
        section_id: selectedSection.section_id,
        user_id: selectedUser
      });
      setCheckerDialogOpen(false);
      setSelectedUser('');
      fetchSections(); // Refresh the list
    } catch {
      setSnackbar({ open: true, message: 'Failed to assign checker', severity: 'error' });
    }
  };

  const totalItems = filteredTransactions.length;
  const totalPieces = filteredTransactions.reduce((sum, t) => {
    return sum + (t.count_type === 'bundle'
      ? (t.bundles?.reduce((s, b) => s + (b.num_of_bundle * b.bundle_count), 0) || 0)
      : (t.qty || 0));
  }, 0);
  const markedCount = filteredTransactions.filter(t => t.transaction_id && markedItems.has(t.transaction_id)).length;

  const SearchAndFilterSection = () => (
    <SearchFilterCard sx={{ mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search form, grade, size, finish, remarks, counted by..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              sx: { borderRadius: 2, backgroundColor: 'background.paper' }
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Section</InputLabel>
            <Select
              value={sectionFilter}
              label="Section"
              onChange={(e) => setSectionFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Sections</MenuItem>
              {sections.map(section => (
                <MenuItem key={section.section_id} value={section.section_id.toString()}>
                  {section.section_desc}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setReconcileDialogOpen(true)}
              disabled={loading.reconcile || sections.length === 0 || sections.some(s => s.status === 'In Progress')}
              startIcon={loading.reconcile ? <CircularProgress size={20} color="inherit" /> : <CompareArrows />}
              sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', px: 2 }}
            >
              {loading.reconcile ? 'Reconciling...' : 'Reconcile'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ViewColumn />}
              onClick={(e) => {
                const target = e.currentTarget;
                const rect = target.getBoundingClientRect();
                setColumnsMenuAnchor(target);
                setColumnsMenuPosition({ top: rect.bottom + 8, left: rect.left });
              }}
              sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
            >
              Columns ({visibleColumnList.length})
            </Button>
            <Button
              variant="outlined"
              onClick={handleMenuClick}
              endIcon={<MoreVert />}
              sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
            >
              Export
            </Button>
            <Menu
              open={!!columnsMenuAnchor}
              onClose={() => { setColumnsMenuAnchor(null); setColumnsMenuPosition(null); }}
              anchorReference="anchorPosition"
              anchorPosition={columnsMenuPosition ? { top: columnsMenuPosition.top, left: columnsMenuPosition.left } : undefined}
              anchorEl={columnsMenuAnchor}
              disableScrollLock
              slotProps={{
                root: { disablePortal: false }
              }}
              PaperProps={{ sx: { minWidth: 220, borderRadius: 2, maxHeight: 400, boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}` } }}
            >
              <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Show / hide columns</Typography>
              </Box>
              <Box sx={{ py: 1, overflowY: 'auto' }}>
                {toggleableColumnIds.map(id => {
                  const col = COUNTER_REVIEW_COLUMNS.find(c => c.id === id);
                  if (!col) return null;
                  return (
                    <FormControlLabel
                      key={id}
                      control={<Checkbox checked={!!visibleColumns[id]} onChange={(_, checked) => setColumnVisible(id, checked)} size="small" />}
                      label={col.label}
                      sx={{ display: 'block', mx: 2, my: 0.25 }}
                    />
                  );
                })}
              </Box>
              <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`, display: 'flex', gap: 1 }}>
                <Button size="small" onClick={showAllColumns} sx={{ textTransform: 'none' }}>Show all</Button>
                <Button size="small" onClick={hideAllColumns} sx={{ textTransform: 'none' }}>Hide all</Button>
              </Box>
            </Menu>
            <Menu
              open={!!exportMenuAnchor}
              onClose={handleMenuClose}
              anchorReference="anchorPosition"
              anchorPosition={exportMenuPosition ?? undefined}
              anchorEl={exportMenuAnchor}
              disableScrollLock
              PaperProps={{
                sx: { minWidth: 260, borderRadius: 2, boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.12)}` },
              }}
            >
              <MenuItem onClick={handleDownloadCount} disabled={exporting}>
                <ListItemIcon>{exporting ? <CircularProgress size={20} /> : <Download fontSize="small" />}</ListItemIcon>
                <ListItemText primary={exporting ? 'Exporting...' : 'Download Count'} secondary="Excel" />
              </MenuItem>
              <MenuItem onClick={handleConsolidate} disabled={exporting}>
                <ListItemIcon><Merge fontSize="small" /></ListItemIcon>
                <ListItemText primary="Consolidate & Download" secondary="Grouped by product" />
              </MenuItem>
            </Menu>
          </Box>
        </Grid>
      </Grid>
    </SearchFilterCard>
  );

  return (
    <Box sx={{ p: 3, maxWidth: '100%', overflowX: 'hidden', minHeight: '100vh', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
      {/* Header */}
      <HeaderCard sx={{ mb: 3 }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              startIcon={<ChevronLeft />}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                borderColor: alpha(theme.palette.common.white, 0.5),
                color: 'inherit',
                '&:hover': { borderColor: 'white', bgcolor: alpha(theme.palette.common.white, 0.1) },
              }}
            >
              Back
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
              <Avatar sx={{ bgcolor: alpha(theme.palette.common.white, 0.2), width: 48, height: 48 }}>
                <ListAlt />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Counter Review
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Review and edit counted transactions
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Refresh data">
              <IconButton onClick={handleRefresh} sx={{ color: 'inherit', bgcolor: alpha(theme.palette.common.white, 0.15), '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.25) }, borderRadius: 2 }}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            <Chip icon={<LocationOn fontSize="small" />} label={`Location ${location_id}`} size="small" sx={{ bgcolor: alpha(theme.palette.common.white, 0.2), color: 'inherit', fontWeight: 600 }} />
            {loading.sections && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} sx={{ color: 'inherit' }} /><Typography variant="body2">Loading sections...</Typography></Box>}
            {loading.transactions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} sx={{ color: 'inherit' }} /><Typography variant="body2">Loading transactions...</Typography></Box>}
          </Box>
        </Box>
      </HeaderCard>

      {/* Stats row */}
      {!loading.sections && sections.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}><Inventory fontSize="small" /></Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="primary">{sections.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Sections</Typography>
                </Box>
              </Box>
            </StatCard>
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main }}><Numbers fontSize="small" /></Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="secondary">{totalItems}</Typography>
                  <Typography variant="body2" color="text.secondary">Transactions</Typography>
                </Box>
              </Box>
            </StatCard>
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}><ListAlt fontSize="small" /></Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.success.main }}>{totalPieces}</Typography>
                  <Typography variant="body2" color="text.secondary">Total pieces</Typography>
                </Box>
              </Box>
            </StatCard>
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}><CompareArrows fontSize="small" /></Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.info.main }}>{markedCount}</Typography>
                  <Typography variant="body2" color="text.secondary">Marked for check</Typography>
                </Box>
              </Box>
            </StatCard>
          </Grid>
        </Grid>
      )}

      {/* Search and Filter Section */}
      <SearchAndFilterSection />

      {/* Loading State */}
      {loading.sections ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          p: 4,
          minHeight: 300,
          alignItems: 'center',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="body1" color="text.secondary">
            Loading inventory sections...
          </Typography>
        </Box>
      ) : sections.length === 0 ? (
        <PageCard sx={{ p: 6, textAlign: 'center' }}>
          <Inventory sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom fontWeight={600}>
            No sections available
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
            This location has no sections assigned for counting. Refresh to load the latest data.
          </Typography>
          <Button variant="outlined" onClick={handleRefresh} startIcon={<Refresh />} sx={{ mt: 3, borderRadius: 2, fontWeight: 600 }}>
            Refresh
          </Button>
        </PageCard>
      ) : (
        <PageCard>
          {loading.transactions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6, minHeight: 280, alignItems: 'center', flexDirection: 'column', gap: 2 }}>
              <CircularProgress size={48} thickness={4} />
              <Typography variant="body1" color="text.secondary">Loading transactions...</Typography>
            </Box>
          ) : filteredTransactions.length > 0 ? (
            <StyledTableContainer sx={{ maxHeight: 'calc(100vh - 420px)' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {visibleColumnList.map(col => (
                      <TableCell key={col.id}>{col.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.map((transaction, index) => {
                    const isCurrentlyEditing = editingTransaction === transaction.transaction_id;
                    const isCurrentlySaving = savingTransaction === transaction.transaction_id;
                    const isMarked = transaction.transaction_id ? markedItems.has(transaction.transaction_id) : false;
                    
                    return (
                      <TransactionRow
                        key={transaction.transaction_id || `transaction-${index}`}
                        transaction={transaction}
                        sections={sections}
                        isEditing={isCurrentlyEditing}
                        isSaving={isCurrentlySaving}
                        onEdit={handleEditTransaction}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                        isMarked={isMarked}
                        visibleColumnList={visibleColumnList}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </StyledTableContainer>
          ) : (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Search sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {searchTerm || sectionFilter !== 'all' ? 'No transactions match your filters' : 'No transactions found'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {searchTerm || sectionFilter !== 'all' ? 'Try a different search or section.' : 'This location has no counted transactions yet.'}
              </Typography>
              <Button variant="outlined" size="small" onClick={handleRefresh} startIcon={<Refresh />} sx={{ borderRadius: 2 }}>
                Refresh
              </Button>
            </Box>
          )}
        </PageCard>
      )}

      <ConsolidatedView
        open={openConsolidateDialog}
        onClose={handleCloseConsolidateDialog}
        data={consolidatedData}
        locationId={location_id || ''}
        sections={sections}
        transactions={allTransactions.reduce((acc, t) => {
          const sectionId = t.section_id || 0;
          if (!acc[sectionId]) acc[sectionId] = [];
          acc[sectionId].push(t);
          return acc;
        }, {} as Record<number, Transaction[]>)}
      />

      <Dialog open={checkerDialogOpen} onClose={() => setCheckerDialogOpen(false)}>
        <DialogTitle>Assign Checker</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Select User"
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            fullWidth
            margin="normal"
          >
            {users.map(user => (
              <MenuItem key={user.user_id} value={user.user_id}>
                {user.full_name || user.user_name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckerDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              if (!selectedSection || !selectedUser) return;
              
              // Check if user is already assigned as checker
              const existingChecker = await checkExistingChecker(selectedUser, location_id || '', selectedSection.section_id);
              
              if (existingChecker && existingChecker.isAssigned) {
                // Show confirmation dialog for existing checker
                setExistingCheckerInfo({
                  userName: existingChecker.userName,
                  teamName: existingChecker.teamName
                });
                setExistingCheckerDialogOpen(true);
              } else {
                // Proceed with assignment
                await assignChecker();
              }
            }}
            disabled={!selectedUser}
            variant="contained"
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Existing Checker */}
      <Dialog open={existingCheckerDialogOpen} onClose={() => setExistingCheckerDialogOpen(false)}>
        <DialogTitle>User Already Has Checker Role</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            The user <strong>{existingCheckerInfo?.userName}</strong> already has the checker role in team <strong>{existingCheckerInfo?.teamName}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The user will retain their existing roles and the checker functionality will be enabled for this section.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExistingCheckerDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              setExistingCheckerDialogOpen(false);
              await assignChecker();
            }}
            variant="contained"
            color="warning"
          >
            Yes, Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reconcile options: optional Tag and Location */}
      <Dialog
        open={reconcileDialogOpen}
        onClose={() => setReconcileDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 24px 80px ${alpha(theme.palette.common.black, 0.15)}`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            overflow: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.dark, 0.92)} 100%)`,
            color: theme.palette.primary.contrastText,
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Avatar sx={{ bgcolor: alpha(theme.palette.common.white, 0.2), width: 48, height: 48 }}>
            <CompareArrows />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Reconcile inventory
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Match system inventory with counted transactions
            </Typography>
          </Box>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose whether to include <strong>Tag</strong>, <strong>Location</strong>, <strong>Mill</strong>, <strong>Heat</strong>, <strong>Type</strong> and <strong>Quality</strong> when matching rows. Other fields are always used.
          </Typography>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
              Optional comparison fields
            </Typography>
            {RECONCILE_OPTIONAL_FIELDS.map(f => (
              <Box
                key={f.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 1.25,
                  px: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  mb: 1,
                  '&:last-of-type': { mb: 0 },
                  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                }}
              >
                <Typography variant="body1" fontWeight={500}>
                  {f.label}
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        f.id === 'sys_tag_no'
                          ? reconcileIncludeTag
                          : f.id === 'location'
                          ? reconcileIncludeLocation
                          : f.id === 'mill'
                          ? reconcileIncludeMill
                          : f.id === 'heat'
                          ? reconcileIncludeHeat
                          : f.id === 'type'
                          ? reconcileIncludeType
                          : reconcileIncludeQuality
                      }
                      onChange={() => {
                        if (f.id === 'sys_tag_no') return setReconcileIncludeTag(v => !v);
                        if (f.id === 'location') return setReconcileIncludeLocation(v => !v);
                        if (f.id === 'mill') return setReconcileIncludeMill(v => !v);
                        if (f.id === 'heat') return setReconcileIncludeHeat(v => !v);
                        if (f.id === 'type') return setReconcileIncludeType(v => !v);
                        return setReconcileIncludeQuality(v => !v);
                      }}
                      size="small"
                      sx={{ mr: 0 }}
                    />
                  }
                  label={
                    (f.id === 'sys_tag_no' && (reconcileIncludeTag ? 'Included' : 'Excluded')) ||
                    (f.id === 'location' && (reconcileIncludeLocation ? 'Included' : 'Excluded')) ||
                    (f.id === 'mill' && (reconcileIncludeMill ? 'Included' : 'Excluded')) ||
                    (f.id === 'heat' && (reconcileIncludeHeat ? 'Included' : 'Excluded')) ||
                    (f.id === 'type' && (reconcileIncludeType ? 'Included' : 'Excluded')) ||
                    (reconcileIncludeQuality ? 'Included' : 'Excluded')
                  }
                  labelPlacement="start"
                  sx={{ ml: 0 }}
                />
              </Box>
            ))}
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.grey[500], 0.04),
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
              Always included in comparison
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {RECONCILE_ALWAYS_FIELDS_LABELS.map(l => (
                <Chip key={l} label={l} size="small" sx={{ borderRadius: 1.5, fontWeight: 500 }} variant="outlined" />
              ))}
            </Box>
          </Paper>

          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.info.main, 0.08),
              borderLeft: `4px solid ${theme.palette.info.main}`,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <strong>This run will match on:</strong>{' '}
              {[
                ...(reconcileIncludeTag ? ['Tag / System Tag No'] : []),
                'Form',
                'Grade',
                'Size',
                'Finish',
                'Ext. Finish',
                'Width',
                'Length',
                ...(reconcileIncludeLocation ? ['Location'] : []),
                ...(reconcileIncludeMill ? ['Mill'] : []),
                ...(reconcileIncludeHeat ? ['Heat'] : []),
                ...(reconcileIncludeType ? ['Type'] : []),
                ...(reconcileIncludeQuality ? ['Quality'] : []),
              ].join(', ')}
              .
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`, gap: 1 }}>
          <Button onClick={() => setReconcileDialogOpen(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleReconcile(getReconcileCompareFields())}
            startIcon={<CompareArrows />}
            sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', px: 3 }}
          >
            Run reconciliation
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CountReviewPage;