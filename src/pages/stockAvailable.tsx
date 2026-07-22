import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Grid,
  useTheme,
  alpha,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Alert,
  Skeleton
} from "@mui/material";
import {
  Search,
  ViewColumn,
  Refresh,
  Settings,
  Inventory,
  FilterList
} from "@mui/icons-material";
import { servicesAPI } from '../config/api';

interface StockItem {
  prd_cmpy_id: string;
  prd_brh: string;
  prd_frm: string;
  prd_grd: string;
  prd_size: string;
  prd_fnsh: string;
  prd_ef_svar: string;
  prd_wdth: number;
  prd_lgth: number;
  prd_whs: string;
  prd_loc: string;
  prd_tag_no: string;
  prd_mill: string;
  prd_heat: string;
  prd_invt_typ: string;
  prd_invt_qlty: string;
  prd_invt_sts: string;
  prd_ohd_qty: number;
  prd_ohd_mat_cst: number;
  prd_ohd_mat_val: number;
}

interface Column {
  id: keyof StockItem;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: string | number) => string;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
}

interface SortConfig {
  key: keyof StockItem;
  direction: 'asc' | 'desc';
}

interface UserPreferences {
  visibleColumns: string[];
  defaultFilters: {
    company: string;
    branch: string;
    warehouse: string;
  };
  sortOrder: SortConfig[];
}

const StockAvailable: React.FC = () => {
  const theme = useTheme();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([
    { key: 'prd_whs', direction: 'asc' },
    { key: 'prd_frm', direction: 'asc' },
    { key: 'prd_grd', direction: 'asc' }
  ]);
  
  // Filters
  const [filters, setFilters] = useState({
    company: '',
    branch: '',
    warehouse: '',
    search: '',
    // Column-specific filters
    prd_frm: '',
    prd_grd: '',
    prd_size: '',
    prd_fnsh: '',
    prd_ef_svar: '',
    prd_wdth: '',
    prd_lgth: '',
    prd_loc: '',
    prd_tag_no: '',
    prd_mill: '',
    prd_heat: '',
    prd_invt_typ: '',
    prd_invt_qlty: '',
    prd_invt_sts: '',
    prd_ohd_qty: '',
    prd_ohd_mat_cst: '',
    prd_ohd_mat_val: ''
  });

  // Filter dialog state
  const [openFilterDialog, setOpenFilterDialog] = useState(false);

  // Column visibility
  const [columns, setColumns] = useState<Column[]>([
    { id: 'prd_whs', label: 'Warehouse', minWidth: 120, sortable: true, filterable: true, visible: true },
    { id: 'prd_loc', label: 'Location', minWidth: 100, sortable: true, filterable: true, visible: true },
    { id: 'prd_tag_no', label: 'Tag ID', minWidth: 100, sortable: true, filterable: true, visible: true },
    { id: 'prd_frm', label: 'Form', minWidth: 80, sortable: true, filterable: true, visible: true },
    { id: 'prd_grd', label: 'Grade', minWidth: 80, sortable: true, filterable: true, visible: true },
    { id: 'prd_size', label: 'Size', minWidth: 80, sortable: true, filterable: true, visible: true },
    { id: 'prd_fnsh', label: 'Finish', minWidth: 100, sortable: true, filterable: true, visible: true },
    { id: 'prd_ef_svar', label: 'Extended Finish', minWidth: 120, sortable: true, filterable: true, visible: true },
    { id: 'prd_wdth', label: 'Width', minWidth: 80, sortable: true, filterable: true, visible: true, format: (value) => `${value}` },
    { id: 'prd_lgth', label: 'Length', minWidth: 80, sortable: true, filterable: true, visible: true, format: (value) => `${value}` },
    { id: 'prd_mill', label: 'Mill', minWidth: 100, sortable: true, filterable: true, visible: true },
    { id: 'prd_heat', label: 'Heat', minWidth: 80, sortable: true, filterable: true, visible: true },
    { id: 'prd_invt_typ', label: 'Type', minWidth: 80, sortable: true, filterable: true, visible: true },
    { id: 'prd_invt_qlty', label: 'Quality Standards', minWidth: 120, sortable: true, filterable: true, visible: true },
    { id: 'prd_invt_sts', label: 'Inventory Status', minWidth: 120, sortable: true, filterable: true, visible: true },
    { id: 'prd_ohd_qty', label: 'Current Piece Count', minWidth: 120, sortable: true, filterable: true, visible: true },
    { id: 'prd_ohd_mat_cst', label: 'Current Weight', minWidth: 120, sortable: true, filterable: true, visible: true, format: (value) => `${value}` },
    { id: 'prd_ohd_mat_val', label: 'Total Value', minWidth: 100, sortable: true, filterable: true, visible: true, format: (value) => `$${typeof value === 'number' ? value.toFixed(2) : value}` }
  ]);
  
  // Unique values for filters
  const [uniqueValues, setUniqueValues] = useState({
    companies: [] as string[],
    branches: [] as string[],
    warehouses: [] as string[]
  });
  
  // Dialogs
  const [openColumnDialog, setOpenColumnDialog] = useState(false);
  const [openPreferencesDialog, setOpenPreferencesDialog] = useState(false);
  
  // User preferences
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('stockAvailablePreferences');
    return saved ? JSON.parse(saved) : {
      visibleColumns: columns.map(col => col.id),
      defaultFilters: { company: '', branch: '', warehouse: '' },
      sortOrder: sortConfig
    };
  });

  // Fetch stock data
  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await servicesAPI.getStockAvailable();
      if (response.data.success) {
        setStockItems(response.data.data);
        setFilteredItems(response.data.data);
        
        // Extract unique values for filters
        const companies = [...new Set(response.data.data.map((item: StockItem) => item.prd_cmpy_id))] as string[];
        const branches = [...new Set(response.data.data.map((item: StockItem) => item.prd_brh))] as string[];
        const warehouses = [...new Set(response.data.data.map((item: StockItem) => item.prd_whs))] as string[];
        
        setUniqueValues({ companies, branches, warehouses });
      } else {
        setError('Failed to load stock data');
      }
      
    } catch (error) {
      console.error('Error fetching stock data:', error);
      setError('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...stockItems];
    
    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(filters.search.toLowerCase())
        )
      );
    }
    
    // Apply all column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'search') {
        filtered = filtered.filter(item => {
          const itemValue = item[key as keyof StockItem];
          if (typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          } else if (typeof itemValue === 'number') {
            return itemValue.toString().includes(value);
          }
          return String(itemValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      for (const sort of sortConfig) {
        const aVal = a[sort.key];
        const bVal = b[sort.key];
        
        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredItems(filtered);
    setPage(0); // Reset to first page when filters change
  }, [stockItems, filters, sortConfig]);

  // Handle sort
  const handleSort = (columnId: keyof StockItem) => {
    setSortConfig(prev => {
      const existingIndex = prev.findIndex(sort => sort.key === columnId);
      
      if (existingIndex >= 0) {
        // Update existing sort
        const newConfig = [...prev];
        newConfig[existingIndex] = {
          key: columnId,
          direction: newConfig[existingIndex].direction === 'asc' ? 'desc' : 'asc'
        };
        return newConfig;
      } else {
        // Add new sort
        return [...prev, { key: columnId, direction: 'asc' }];
      }
    });
  };

  // Handle column visibility
  const toggleColumnVisibility = (columnId: keyof StockItem) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  // Save user preferences
  const savePreferences = () => {
    const preferences: UserPreferences = {
      visibleColumns: columns.filter(col => col.visible).map(col => col.id),
      defaultFilters: filters,
      sortOrder: sortConfig
    };
    
    setUserPreferences(preferences);
    localStorage.setItem('stockAvailablePreferences', JSON.stringify(preferences));
    setOpenPreferencesDialog(false);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
    setFilters({
      company: '',
      branch: '',
      warehouse: '',
      search: '',
      prd_frm: '',
      prd_grd: '',
      prd_size: '',
      prd_fnsh: '',
      prd_ef_svar: '',
      prd_wdth: '',
      prd_lgth: '',
      prd_loc: '',
      prd_tag_no: '',
      prd_mill: '',
      prd_heat: '',
      prd_invt_typ: '',
      prd_invt_qlty: '',
      prd_invt_sts: '',
      prd_ohd_qty: '',
      prd_ohd_mat_cst: '',
      prd_ohd_mat_val: ''
    });
    setSortConfig([{ key: 'prd_whs', direction: 'asc' }]);
  };

  // Get sort direction for a column
  const getSortDirection = (columnId: keyof StockItem) => {
    const sort = sortConfig.find(s => s.key === columnId);
    return sort ? sort.direction : false;
  };

  // Get sort priority for a column
  const getSortPriority = (columnId: keyof StockItem) => {
    const index = sortConfig.findIndex(s => s.key === columnId);
    return index >= 0 ? index + 1 : null;
  };

  // Get unique values for each filterable column
  const getUniqueValuesForColumn = (columnId: keyof StockItem) => {
    if (!stockItems.length) return [];
    const values = stockItems.map(item => item[columnId]).filter(Boolean);
    return [...new Set(values)].sort();
  };



  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      company: '',
      branch: '',
      warehouse: '',
      search: '',
      prd_frm: '',
      prd_grd: '',
      prd_size: '',
      prd_fnsh: '',
      prd_ef_svar: '',
      prd_wdth: '',
      prd_lgth: '',
      prd_loc: '',
      prd_tag_no: '',
      prd_mill: '',
      prd_heat: '',
      prd_invt_typ: '',
      prd_invt_qlty: '',
      prd_invt_sts: '',
      prd_ohd_qty: '',
      prd_ohd_mat_cst: '',
      prd_ohd_mat_val: ''
    });
  };



  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 3, borderRadius: 2 }} />
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Skeleton variant="rectangular" width="100%" height={180} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: { xs: 'center', sm: 'flex-start' }
            }}>
              <Inventory sx={{ 
                mr: 2, 
                fontSize: 40,
                color: theme.palette.primary.main 
              }} />
              Stock Available
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
              View and manage your inventory stock levels
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Column Settings">
              <IconButton
                onClick={() => setOpenColumnDialog(true)}
                sx={{
                  backgroundColor: alpha(theme.palette.action.hover, 0.1),
                  borderRadius: 2
                }}
              >
                <ViewColumn />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="User Preferences">
              <IconButton
                onClick={() => setOpenPreferencesDialog(true)}
                sx={{
                  backgroundColor: alpha(theme.palette.action.hover, 0.1),
                  borderRadius: 2
                }}
              >
                <Settings />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh">
              <IconButton
                onClick={fetchStockData}
                sx={{
                  backgroundColor: alpha(theme.palette.action.hover, 0.1),
                  borderRadius: 2
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Filters
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip 
              label={`${Object.values(filters).filter(value => value !== '').length} active`}
              color="primary"
              size="small"
              variant={Object.values(filters).filter(value => value !== '').length > 0 ? "filled" : "outlined"}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => setOpenFilterDialog(true)}
              startIcon={<FilterList />}
              sx={{ borderRadius: 2 }}
            >
              Advanced Filters
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={clearAllFilters}
              disabled={Object.values(filters).filter(value => value !== '').length === 0}
              sx={{ borderRadius: 2 }}
            >
              Clear All
            </Button>
          </Box>
        </Box>

        {/* Quick Filters Row */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Search stock items..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Company</InputLabel>
              <Select
                value={filters.company}
                onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
                label="Company"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Companies</MenuItem>
                {uniqueValues.companies.map((company) => (
                  <MenuItem key={company} value={company}>
                    {company}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Branch</InputLabel>
              <Select
                value={filters.branch}
                onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
                label="Branch"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Branches</MenuItem>
                {uniqueValues.branches.map((branch) => (
                  <MenuItem key={branch} value={branch}>
                    {branch}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Warehouse</InputLabel>
              <Select
                value={filters.warehouse}
                onChange={(e) => setFilters(prev => ({ ...prev, warehouse: e.target.value }))}
                label="Warehouse"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Warehouses</MenuItem>
                {uniqueValues.warehouses.map((warehouse) => (
                  <MenuItem key={warehouse} value={warehouse}>
                    {warehouse}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                {filteredItems.length} items
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={resetToDefaults}
                sx={{ borderRadius: 2 }}
              >
                Reset
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Active Filters Display */}
        {Object.values(filters).filter(value => value !== '').length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(filters).map(([key, value]) => {
              if (value && key !== 'search') {
                const column = columns.find(col => col.id === key);
                return (
                  <Chip
                    key={key}
                    label={`${column?.label || key}: ${value}`}
                    onDelete={() => setFilters(prev => ({ ...prev, [key]: '' }))}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                );
              }
              return null;
            })}
          </Box>
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stock Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.filter(col => col.visible).map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    style={{ minWidth: column.minWidth }}
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      fontWeight: 600,
                      borderBottom: `2px solid ${theme.palette.divider}`
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {column.sortable ? (
                        <TableSortLabel
                          active={Boolean(getSortDirection(column.id))}
                          direction={getSortDirection(column.id) || 'asc'}
                          onClick={() => handleSort(column.id)}
                          sx={{ minWidth: 'auto' }}
                        >
                          {column.label}
                        </TableSortLabel>
                      ) : (
                        column.label
                      )}
                      
                      {getSortPriority(column.id) && (
                        <Chip
                          label={getSortPriority(column.id)}
                          size="small"
                          sx={{
                            minWidth: 20,
                            height: 20,
                            fontSize: '0.75rem',
                            backgroundColor: theme.palette.primary.main,
                            color: 'white'
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((item, index) => (
                  <TableRow
                    key={index}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.02)
                      }
                    }}
                  >
                    {columns.filter(col => col.visible).map((column) => (
                      <TableCell key={column.id} align={column.align || 'left'}>
                        {column.format ? column.format(item[column.id]) : String(item[column.id] || '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredItems.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Column Visibility Dialog */}
      <Dialog
        open={openColumnDialog}
        onClose={() => setOpenColumnDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewColumn />
            Column Visibility
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {columns.map((column) => (
              <Grid item xs={12} sm={6} md={4} key={column.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={column.visible}
                      onChange={() => toggleColumnVisibility(column.id)}
                    />
                  }
                  label={column.label}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenColumnDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Advanced Filters Dialog */}
      <Dialog
        open={openFilterDialog}
        onClose={() => setOpenFilterDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList />
            Advanced Filters
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Form Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Form</InputLabel>
                <Select
                  value={filters.prd_frm}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_frm: e.target.value }))}
                  label="Form"
                >
                  <MenuItem value="">All Forms</MenuItem>
                  {getUniqueValuesForColumn('prd_frm').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Grade Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Grade</InputLabel>
                <Select
                  value={filters.prd_grd}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_grd: e.target.value }))}
                  label="Grade"
                >
                  <MenuItem value="">All Grades</MenuItem>
                  {getUniqueValuesForColumn('prd_grd').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Size Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Size</InputLabel>
                <Select
                  value={filters.prd_size}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_size: e.target.value }))}
                  label="Size"
                >
                  <MenuItem value="">All Sizes</MenuItem>
                  {getUniqueValuesForColumn('prd_size').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Finish Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Finish</InputLabel>
                <Select
                  value={filters.prd_fnsh}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_fnsh: e.target.value }))}
                  label="Finish"
                >
                  <MenuItem value="">All Finishes</MenuItem>
                  {getUniqueValuesForColumn('prd_fnsh').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Extended Finish Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Extended Finish</InputLabel>
                <Select
                  value={filters.prd_ef_svar}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_ef_svar: e.target.value }))}
                  label="Extended Finish"
                >
                  <MenuItem value="">All Extended Finishes</MenuItem>
                  {getUniqueValuesForColumn('prd_ef_svar').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Location Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Location</InputLabel>
                <Select
                  value={filters.prd_loc}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_loc: e.target.value }))}
                  label="Location"
                >
                  <MenuItem value="">All Locations</MenuItem>
                  {getUniqueValuesForColumn('prd_loc').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Tag ID Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Tag ID</InputLabel>
                <Select
                  value={filters.prd_tag_no}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_tag_no: e.target.value }))}
                  label="Tag ID"
                >
                  <MenuItem value="">All Tag IDs</MenuItem>
                  {getUniqueValuesForColumn('prd_tag_no').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Mill Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Mill</InputLabel>
                <Select
                  value={filters.prd_mill}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_mill: e.target.value }))}
                  label="Mill"
                >
                  <MenuItem value="">All Mills</MenuItem>
                  {getUniqueValuesForColumn('prd_mill').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Heat Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Heat</InputLabel>
                <Select
                  value={filters.prd_heat}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_heat: e.target.value }))}
                  label="Heat"
                >
                  <MenuItem value="">All Heats</MenuItem>
                  {getUniqueValuesForColumn('prd_heat').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Type Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.prd_invt_typ}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_invt_typ: e.target.value }))}
                  label="Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  {getUniqueValuesForColumn('prd_invt_typ').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Quality Standards Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Quality Standards</InputLabel>
                <Select
                  value={filters.prd_invt_qlty}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_invt_qlty: e.target.value }))}
                  label="Quality Standards"
                >
                  <MenuItem value="">All Quality Standards</MenuItem>
                  {getUniqueValuesForColumn('prd_invt_qlty').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Inventory Status Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Inventory Status</InputLabel>
                <Select
                  value={filters.prd_invt_sts}
                  onChange={(e) => setFilters(prev => ({ ...prev, prd_invt_sts: e.target.value }))}
                  label="Inventory Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {getUniqueValuesForColumn('prd_invt_sts').map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Width Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Width"
                value={filters.prd_wdth}
                onChange={(e) => setFilters(prev => ({ ...prev, prd_wdth: e.target.value }))}
                placeholder="Filter by width..."
                size="small"
              />
            </Grid>

            {/* Length Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Length"
                value={filters.prd_lgth}
                onChange={(e) => setFilters(prev => ({ ...prev, prd_lgth: e.target.value }))}
                placeholder="Filter by length..."
                size="small"
              />
            </Grid>

            {/* On Hand Quantity Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="On Hand Quantity"
                value={filters.prd_ohd_qty}
                onChange={(e) => setFilters(prev => ({ ...prev, prd_ohd_qty: e.target.value }))}
                placeholder="Filter by quantity..."
                size="small"
              />
            </Grid>

            {/* Current Weight Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Current Weight"
                value={filters.prd_ohd_mat_cst}
                onChange={(e) => setFilters(prev => ({ ...prev, prd_ohd_mat_cst: e.target.value }))}
                placeholder="Filter by weight..."
                size="small"
              />
            </Grid>

            {/* Total Value Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Total Value"
                value={filters.prd_ohd_mat_val}
                onChange={(e) => setFilters(prev => ({ ...prev, prd_ohd_mat_val: e.target.value }))}
                placeholder="Filter by value..."
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={clearAllFilters}>Clear All</Button>
          <Button onClick={() => setOpenFilterDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* User Preferences Dialog */}
      <Dialog
        open={openPreferencesDialog}
        onClose={() => setOpenPreferencesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings />
            User Preferences
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Default Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Default Company</InputLabel>
                <Select
                  value={userPreferences.defaultFilters.company}
                  onChange={(e) => setUserPreferences(prev => ({
                    ...prev,
                    defaultFilters: { ...prev.defaultFilters, company: e.target.value }
                  }))}
                  label="Default Company"
                >
                  <MenuItem value="">None</MenuItem>
                  {uniqueValues.companies.map((company) => (
                    <MenuItem key={company} value={company}>
                      {company}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Default Branch</InputLabel>
                <Select
                  value={userPreferences.defaultFilters.branch}
                  onChange={(e) => setUserPreferences(prev => ({
                    ...prev,
                    defaultFilters: { ...prev.defaultFilters, branch: e.target.value }
                  }))}
                  label="Default Branch"
                >
                  <MenuItem value="">None</MenuItem>
                  {uniqueValues.branches.map((branch) => (
                    <MenuItem key={branch} value={branch}>
                      {branch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Default Warehouse</InputLabel>
                <Select
                  value={userPreferences.defaultFilters.warehouse}
                  onChange={(e) => setUserPreferences(prev => ({
                    ...prev,
                    defaultFilters: { ...prev.defaultFilters, warehouse: e.target.value }
                  }))}
                  label="Default Warehouse"
                >
                  <MenuItem value="">None</MenuItem>
                  {uniqueValues.warehouses.map((warehouse) => (
                    <MenuItem key={warehouse} value={warehouse}>
                      {warehouse}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Default Sort Order
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {userPreferences.sortOrder.map((sort, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label={index + 1} size="small" />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={sort.key}
                    onChange={(e) => setUserPreferences(prev => ({
                      ...prev,
                      sortOrder: prev.sortOrder.map((s, i) => 
                        i === index ? { ...s, key: e.target.value as keyof StockItem } : s
                      )
                    }))}
                  >
                    {columns.map((col) => (
                      <MenuItem key={col.id} value={col.id}>
                        {col.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select
                    value={sort.direction}
                    onChange={(e) => setUserPreferences(prev => ({
                      ...prev,
                      sortOrder: prev.sortOrder.map((s, i) => 
                        i === index ? { ...s, direction: e.target.value as 'asc' | 'desc' } : s
                      )
                    }))}
                  >
                    <MenuItem value="asc">Ascending</MenuItem>
                    <MenuItem value="desc">Descending</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPreferencesDialog(false)}>Cancel</Button>
          <Button onClick={savePreferences} variant="contained">Save Preferences</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockAvailable;
