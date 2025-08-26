import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Avatar,
  Grid,
  Card,
  CardContent,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ChevronLeft,
  CompareArrows,
  Refresh,
  Download,
  Search,
  ListAlt,
  KeyboardArrowDown,
  KeyboardArrowUp
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { servicesAPI } from '../config/api';
import { ReconciliationData } from '../types/reconciliation';
import { AxiosError } from 'axios';

interface Transaction {
  tag_id: number;
  form: string;
  grade: string;
  size: string;
  finish: string;
  ext_finish?: string;
  width?: string;
  length?: string;
  qty: number;
  checker_count?: number;
  count_type: string;
  counted_by: string;
  team_name: string;
  created_at: string;
  section_id: number;
  section_desc: string;
  location_desc: string;
  warehouse: string;
  branch: string;
  remarks?: string;
  ad_cmts?: string;
  role?: 'Checker' | 'Counter';
  type?: string;
  quality?: string;
  bundles?: Array<{
    num_of_bundle: number;
    bundle_count: number;
    created_at: string;
  }>;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'modified' | 'removed';
  }>;
}

interface Section {
  section_id: number;
  section_desc: string;
  warehouse: string;
  branch: string;
  location_desc: string;
  status: string;
  team_name?: string;
  checker_assigned?: string;
}

interface FilterState {
  searchTerm: string;
  sectionFilter: string;
  teamFilter: string;
  statusFilter: string;
  formFilter: string;
  gradeFilter: string;
  countTypeFilter: string;
  hasChangesFilter: string;
}

const CheckerReviewPageImproved: React.FC = () => {
  const navigate = useNavigate();
  const { location_id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  // State management
  const [sections, setSections] = useState<Section[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState({
    sections: false,
    transactions: false
  });
  const [selectedTransaction] = useState<Transaction | null>(null);
  const [changeDetailsOpen, setChangeDetailsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    sectionFilter: 'all',
    teamFilter: 'all',
    statusFilter: 'all',
    formFilter: 'all',
    gradeFilter: 'all',
    countTypeFilter: 'all',
    hasChangesFilter: 'all'
  });

  // State for expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Fetch sections
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

  // Fetch all transactions for all sections
  const fetchAllTransactions = async () => {
    try {
      setLoading(prev => ({ ...prev, transactions: true }));
      const allTransactions: Transaction[] = [];
      
      console.log('Fetching transactions for sections:', sections);
      
      for (const section of sections) {
        try {
          console.log(`Fetching transactions for section ${section.section_id}`);
          
          // Fetch both checker and counter transactions
          const [checkerResponse, counterResponse] = await Promise.all([
            servicesAPI.getReviewTransactionsForChecker(location_id?.toString() || '', section.section_id.toString()),
            servicesAPI.getReviewTransactionsForCounter(location_id?.toString() || '', section.section_id.toString())
          ]);
          
          console.log(`Section ${section.section_id} - Checker response:`, checkerResponse.data);
          console.log(`Section ${section.section_id} - Counter response:`, counterResponse.data);
          
          // Process checker transactions
          const checkerTransactions = checkerResponse.data.map((t: any) => ({
            ...t,
            section_id: section.section_id,
            section_desc: section.section_desc,
            location_desc: section.location_desc,
            warehouse: section.warehouse,
            branch: section.branch
          }));
          
          // Process counter transactions
          const counterTransactions = counterResponse.data.map((t: any) => ({
            ...t,
            section_id: section.section_id,
            section_desc: section.section_desc,
            location_desc: section.location_desc,
            warehouse: section.warehouse,
            branch: section.branch
          }));
          
          console.log(`Section ${section.section_id} - Processed checker transactions:`, checkerTransactions.length);
          console.log(`Section ${section.section_id} - Processed counter transactions:`, counterTransactions.length);
          
          allTransactions.push(...checkerTransactions, ...counterTransactions);
        } catch (error) {
          console.error(`Error fetching transactions for section ${section.section_id}:`, error);
        }
      }
      
      console.log('Total transactions fetched:', allTransactions.length);
      console.log('Transaction roles:', allTransactions.map(t => ({ tag_id: t.tag_id, role: t.role })));
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchSections();
  }, [location_id]);

  useEffect(() => {
    if (sections.length > 0) {
      fetchAllTransactions();
    }
  }, [sections]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = !filters.searchTerm || 
        transaction.tag_id.toString().includes(filters.searchTerm) ||
        transaction.form.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        transaction.grade.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        transaction.team_name.toLowerCase().includes(filters.searchTerm.toLowerCase());

      const matchesSection = filters.sectionFilter === 'all' || 
        transaction.section_desc === filters.sectionFilter;

      const matchesTeam = filters.teamFilter === 'all' || 
        transaction.team_name === filters.teamFilter;

      const matchesForm = filters.formFilter === 'all' || 
        transaction.form === filters.formFilter;

      const matchesGrade = filters.gradeFilter === 'all' || 
        transaction.grade === filters.gradeFilter;

      const matchesCountType = filters.countTypeFilter === 'all' || 
        transaction.count_type === filters.countTypeFilter;

      const matchesHasChanges = filters.hasChangesFilter === 'all' || 
        (filters.hasChangesFilter === 'yes' && transaction.changes && transaction.changes.length > 0) ||
        (filters.hasChangesFilter === 'no' && (!transaction.changes || transaction.changes.length === 0));

      return matchesSearch && matchesSection && matchesTeam && matchesForm && 
             matchesGrade && matchesCountType && matchesHasChanges;
    });
  }, [transactions, filters]);

  // Summary calculations
  const summary = useMemo(() => {
    const total = filteredTransactions.length;
    const withChanges = filteredTransactions.filter(t => t.changes && t.changes.length > 0).length;
    const bundleCount = filteredTransactions.filter(t => t.count_type === 'bundle').length;
    const pieceCount = filteredTransactions.filter(t => t.count_type === 'pcs').length;
    
    return { total, withChanges, bundleCount, pieceCount };
  }, [filteredTransactions]);



  // Group transactions by tag_id
  const getGroupedTransactions = () => {
    const grouped = new Map<number, { checker: Transaction | null; counter: Transaction | null }>();
    
    filteredTransactions.forEach(transaction => {
      const tagId = transaction.tag_id;
      if (!grouped.has(tagId)) {
        grouped.set(tagId, { checker: null, counter: null });
      }
      
      const group = grouped.get(tagId)!;
      if (transaction.role === 'Checker') {
        group.checker = transaction;
      } else if (transaction.role === 'Counter') {
        group.counter = transaction;
      }
    });
    
    return Array.from(grouped.entries()).map(([tagId, group]) => ({
      tagId,
      checker: group.checker,
      counter: group.counter
    }));
  };

  // Handle row expansion
  const handleRowToggle = (tagId: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(tagId)) {
      newExpandedRows.delete(tagId);
    } else {
      newExpandedRows.add(tagId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Check if a field has differences between checker and counter
  const hasFieldDifference = (field: keyof Transaction, checker: Transaction, counter: Transaction | null) => {
    if (!counter) return false;
    return checker[field] !== counter[field];
  };

  // Get cell background color based on differences
  const getCellBackgroundColor = (field: keyof Transaction, checker: Transaction, counter: Transaction | null) => {
    if (hasFieldDifference(field, checker, counter)) {
      return alpha(theme.palette.warning.main, 0.1);
    }
    return 'transparent';
  };

  const handleRefresh = () => {
    fetchSections();
    setTransactions([]);
  };

  const handleReconcile = async () => {
    try {
      setLoading(prev => ({ ...prev, transactions: true }));
      
      // Get warehouse and branch from the first section
      if (sections.length === 0) {
        enqueueSnackbar('No sections found for this location', { variant: 'error' });
        return;
      }
      
      const firstSection = sections[0];
      const warehouse = firstSection.warehouse;
      const branch = firstSection.branch;
      
      console.log('Reconciliation request:', { location_id, warehouse, branch });
      
      // Send payload to backend for reconciliation
      const payload = {
        location_id: location_id,
        warehouse: warehouse,
        branch: branch
      };
  
      // Send to backend for reconciliation
      const response = await servicesAPI.reconcileInventory(payload);
  
      const reconciliationResults = response.data;
      console.log('Reconciliation results:', reconciliationResults);

      // Transform the data to match expected format
      const transformedData: ReconciliationData = {
        summary: reconciliationResults.summary,
        items: reconciliationResults.items
      };
      
      enqueueSnackbar('Reconciliation completed successfully', { variant: 'success' });
      navigate(`/reconciliation/${location_id}`, { 
        state: { reconciliationData: transformedData }
      });
      
    } catch (error) {
      console.error('Reconciliation error:', error);
      enqueueSnackbar(
        error instanceof AxiosError && error.response?.data?.error 
          ? error.response.data.error 
          : 'Failed to reconcile inventory',
        { variant: 'error' }
      );
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  // Filter component
  const FilterSection = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ListAlt /> Filters & Search
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search transactions..."
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Section</InputLabel>
            <Select
              value={filters.sectionFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, sectionFilter: e.target.value }))}
              label="Section"
            >
              <MenuItem value="all">All Sections</MenuItem>
              {Array.from(new Set(transactions.map(t => t.section_desc))).map(section => (
                <MenuItem key={section} value={section}>{section}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Team</InputLabel>
            <Select
              value={filters.teamFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, teamFilter: e.target.value }))}
              label="Team"
            >
              <MenuItem value="all">All Teams</MenuItem>
              {Array.from(new Set(transactions.map(t => t.team_name))).map(team => (
                <MenuItem key={team} value={team}>{team}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Form</InputLabel>
            <Select
              value={filters.formFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, formFilter: e.target.value }))}
              label="Form"
            >
              <MenuItem value="all">All Forms</MenuItem>
              {Array.from(new Set(transactions.map(t => t.form))).map(form => (
                <MenuItem key={form} value={form}>{form}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Grade</InputLabel>
            <Select
              value={filters.gradeFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, gradeFilter: e.target.value }))}
              label="Grade"
            >
              <MenuItem value="all">All Grades</MenuItem>
              {Array.from(new Set(transactions.map(t => t.grade))).map(grade => (
                <MenuItem key={grade} value={grade}>{grade}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={1}>
          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.countTypeFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, countTypeFilter: e.target.value }))}
              label="Type"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pcs">Pieces</MenuItem>
              <MenuItem value="bundle">Bundles</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );

  // Summary cards component
  const SummaryCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.light, 0.1)})`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
        }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
              {summary.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Transactions
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)}, ${alpha(theme.palette.warning.light, 0.1)})`,
          border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
        }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
              {summary.withChanges}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              With Changes
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.success.light, 0.1)})`,
          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
        }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
              {summary.bundleCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bundle Counts
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.info.light, 0.1)})`,
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
        }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
              {summary.pieceCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Piece Counts
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ p: 3, maxWidth: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(-1)}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Checker Review - Location {location_id}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleReconcile}
              disabled={
                loading.transactions || 
                sections.length === 0 || 
                !sections.every(s => s.status === 'Completed')
              }
              startIcon={loading.transactions ? <CircularProgress size={20} /> : <CompareArrows />}
              sx={{ 
                borderRadius: 2,
                fontWeight: 600
              }}
            >
              {loading.transactions ? 'Reconciling...' : 'Reconcile'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => {
                // Export functionality
                enqueueSnackbar('Export functionality coming soon', { variant: 'info' });
              }}
            >
              Export
            </Button>
          </Box>
          
          {/* Debug Info */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.875rem' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Debug Info:</strong><br />
              Sections loaded: {sections.length}<br />
              Section statuses: {sections.map(s => `${s.section_desc}: ${s.status}`).join(', ')}<br />
              All sections completed: {sections.every(s => s.status === 'Completed') ? 'Yes' : 'No'}<br />
              Reconcile button disabled: {loading.transactions || sections.length === 0 || !sections.every(s => s.status === 'Completed') ? 'Yes' : 'No'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Summary Cards */}
      <SummaryCards />

      {/* Filters */}
      <FilterSection />

      {/* Combined Expandable Table */}
      <Paper sx={{ 
        p: 3, 
        borderRadius: 2,
        border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.primary.light, 0.05)})`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ 
            mr: 2,
            bgcolor: theme.palette.primary.main,
            color: 'white'
          }}>
            <CompareArrows />
          </Avatar>
          <Typography variant="h5" sx={{ 
            fontWeight: 700,
            color: theme.palette.primary.dark
          }}>
            Checker vs Counter Comparison
          </Typography>
          <Chip 
            label={`${getGroupedTransactions().length} Tags`} 
            color="primary" 
            variant="filled"
            sx={{ ml: 'auto', fontWeight: 600 }}
          />
        </Box>
        
        {loading.transactions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="50px"></TableCell>
                  <TableCell>Tag</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Form</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Finish</TableCell>
                  <TableCell>Ext Finish</TableCell>
                  <TableCell>Width</TableCell>
                  <TableCell>Length</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Count Type</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Quality Standard</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Counted By</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getGroupedTransactions().map(({ tagId, checker, counter }) => {
                  if (!checker) return null; // Only show rows with checker data
                  
                  const isExpanded = expandedRows.has(tagId);
                  const hasCounter = !!counter;
                  
                  return (
                    <React.Fragment key={tagId}>
                      {/* Main Checker Row */}
                      <TableRow hover>
                        <TableCell>
                          {hasCounter && (
                            <IconButton
                              size="small"
                              onClick={() => handleRowToggle(tagId)}
                              sx={{ p: 0 }}
                            >
                              {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                            </IconButton>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`#${tagId}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={checker.section_desc} 
                            size="small" 
                            variant="outlined"
                            color="info"
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('form', checker, counter) }}>
                          <Chip 
                            label={checker.form} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('grade', checker, counter) }}>
                          {checker.grade || '-'}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('size', checker, counter) }}>
                          {checker.size || '-'}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('finish', checker, counter) }}>
                          {checker.finish || '-'}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('ext_finish', checker, counter) }}>
                          {checker.ext_finish || '-'}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('width', checker, counter) }}>
                          {checker.width || '-'}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('length', checker, counter) }}>
                          {checker.length || '-'}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('qty', checker, counter) }}>
                          <Chip 
                            label={checker.qty || 0}
                            color={checker.count_type === 'bundle' ? 'primary' : 'default'}
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('count_type', checker, counter) }}>
                          <Chip 
                            label={checker.count_type}
                            size="small"
                            color={checker.count_type === 'bundle' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('type', checker, counter) }}>
                          {checker.type || '-'}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('remarks', checker, counter) }}>
                          {checker.remarks || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={checker.team_name || '-'} 
                            size="small" 
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ 
                              width: 24, 
                              height: 24, 
                              mr: 1,
                              fontSize: '0.75rem',
                              bgcolor: alpha(theme.palette.success.main, 0.1),
                              color: theme.palette.success.dark
                            }}>
                              {checker.counted_by ? checker.counted_by.charAt(0) : '?'}
                            </Avatar>
                            {checker.counted_by || '-'}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {checker.created_at ? new Date(checker.created_at).toLocaleDateString() : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Counter Row */}
                      {isExpanded && counter && (
                        <TableRow sx={{ bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                          <TableCell></TableCell>
                          <TableCell>
                            <Chip 
                              label={`#${tagId}`}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.section_desc} 
                              size="small" 
                              variant="outlined"
                              color="info"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.form} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontWeight: 500, bgcolor: alpha(theme.palette.info.main, 0.1) }}
                            />
                          </TableCell>
                          <TableCell>{counter.grade || '-'}</TableCell>
                          <TableCell>{counter.size || '-'}</TableCell>
                          <TableCell>{counter.finish || '-'}</TableCell>
                          <TableCell>{counter.ext_finish || '-'}</TableCell>
                          <TableCell>{counter.width || '-'}</TableCell>
                          <TableCell>{counter.length || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.qty || 0}
                              color={counter.count_type === 'bundle' ? 'primary' : 'default'}
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.count_type}
                              size="small"
                              color={counter.count_type === 'bundle' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell>{counter.type || '-'}</TableCell>
                          <TableCell>{counter.remarks || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.team_name || '-'} 
                              size="small" 
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ 
                                width: 24, 
                                height: 24, 
                                mr: 1,
                                fontSize: '0.75rem',
                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                color: theme.palette.info.dark
                              }}>
                                {counter.counted_by ? counter.counted_by.charAt(0) : '?'}
                              </Avatar>
                              {counter.counted_by || '-'}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap>
                              {counter.created_at ? new Date(counter.created_at).toLocaleDateString() : '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Change Details Dialog */}
      <Dialog 
        open={changeDetailsOpen} 
        onClose={() => setChangeDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareArrows color="warning" />
            <Typography variant="h6">
              Change Details - Tag {selectedTransaction?.tag_id}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTransaction?.changes && selectedTransaction.changes.length > 0 ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                This transaction has {selectedTransaction.changes.length} field(s) that were modified during counting.
              </Alert>
              {selectedTransaction.changes.map((change, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      {change.field}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Previous Value:
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          textDecoration: 'line-through',
                          color: 'error.main'
                        }}>
                          {change.oldValue || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          New Value:
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          color: 'success.main',
                          fontWeight: 600
                        }}>
                          {change.newValue || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Chip 
                      label={change.type}
                      size="small"
                      color={change.type === 'added' ? 'success' : change.type === 'modified' ? 'warning' : 'error'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary">
              No changes detected for this transaction.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CheckerReviewPageImproved; 