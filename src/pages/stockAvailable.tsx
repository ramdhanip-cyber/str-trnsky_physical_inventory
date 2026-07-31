import { useState, useEffect, useMemo } from "react";
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
  Skeleton,
  Avatar,
  Card,
  CardContent,
} from "@mui/material";
import {
  Search,
  ViewColumn,
  Refresh,
  Settings,
  Inventory,
  FilterList,
  Warehouse,
  Scale,
  AttachMoney,
  Tag,
} from "@mui/icons-material";
import { servicesAPI } from '../config/api';

const BRAND = '#0C2C48';
const BRAND_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';
const ITEMS_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';
const QTY_GRADIENT = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
const WEIGHT_GRADIENT = 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)';
const VALUE_GRADIENT = 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)';

const SKEU_BG = '#e8eef4';
const SKEU_LIGHT = '#ffffff';
const SKEU_DARK = '#c5d0db';
const skeuRaised = (size = 7) =>
  `${size}px ${size}px ${size * 2}px ${SKEU_DARK}, -${size}px -${size}px ${size * 2}px ${SKEU_LIGHT}`;
const skeuInset = (size = 4) =>
  `inset ${size}px ${size}px ${size * 2}px ${SKEU_DARK}, inset -${size}px -${size}px ${size * 2}px ${SKEU_LIGHT}`;

const insetFieldSx = {
  height: 40,
  borderRadius: 3,
  background: SKEU_BG,
  boxShadow: skeuInset(4),
  '& fieldset': { border: 'none' },
  '&.Mui-focused': {
    boxShadow: `${skeuInset(4)}, 0 0 0 2px ${alpha(BRAND, 0.18)}`,
  },
};

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



  const summary = useMemo(() => {
    const totalQty = filteredItems.reduce((s, i) => s + (Number(i.prd_ohd_qty) || 0), 0);
    const totalWeight = filteredItems.reduce((s, i) => s + (Number(i.prd_ohd_mat_cst) || 0), 0);
    const totalValue = filteredItems.reduce((s, i) => s + (Number(i.prd_ohd_mat_val) || 0), 0);
    const warehouses = new Set(filteredItems.map((i) => i.prd_whs).filter(Boolean)).size;
    return { totalQty, totalWeight, totalValue, warehouses, rows: filteredItems.length };
  }, [filteredItems]);

  const activeFilterCount = Object.values(filters).filter((value) => value !== '').length;

  if (loading) {
    return (
      <Box sx={{ p: 3, bgcolor: SKEU_BG, minHeight: 'calc(100vh - 112px)' }}>
        <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 3, borderRadius: '20px' }} />
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Skeleton variant="rectangular" width="100%" height={96} sx={{ borderRadius: '18px' }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" width="100%" height={140} sx={{ mb: 3, borderRadius: '18px' }} />
        <Skeleton variant="rectangular" width="100%" height={420} sx={{ borderRadius: '18px' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: SKEU_BG, minHeight: 'calc(100vh - 112px)' }}>
      {/* Hero */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '20px',
          mb: 3,
          px: { xs: 2.5, sm: 4 },
          py: { xs: 3, sm: 3.5 },
          background: BRAND_GRADIENT,
          color: '#fff',
          boxShadow: '0 14px 40px 0 rgba(12,44,72,0.30)',
        }}
      >
        <Box sx={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', bottom: -80, right: 130, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2.5,
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 56, height: 56 }}>
              <Inventory sx={{ fontSize: 30, color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.15 }}>
                Stock Available
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
                Browse on-hand inventory with multi-column filters, sorting, and saved preferences
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 40,
              px: '4px',
              gap: '4px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.12)',
              boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.15)',
            }}
          >
            <Tooltip title="Column Settings">
              <IconButton
                size="small"
                onClick={() => setOpenColumnDialog(true)}
                sx={{ color: '#fff', width: 32, height: 32, borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}
              >
                <ViewColumn fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="User Preferences">
              <IconButton
                size="small"
                onClick={() => setOpenPreferencesDialog(true)}
                sx={{ color: '#fff', width: 32, height: 32, borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}
              >
                <Settings fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={fetchStockData}
                sx={{ color: '#fff', width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.18)', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' } }}
              >
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {(
          [
            { label: 'Matching Rows', value: summary.rows.toLocaleString(), grad: ITEMS_GRADIENT, icon: <Tag /> },
            { label: 'Total Pieces', value: summary.totalQty.toLocaleString(), grad: QTY_GRADIENT, icon: <Inventory /> },
            { label: 'Total Weight', value: summary.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 }), grad: WEIGHT_GRADIENT, icon: <Scale /> },
            { label: 'Total Value', value: `$${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, grad: VALUE_GRADIENT, icon: <AttachMoney /> },
          ] as const
        ).map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card
              elevation={0}
              sx={{
                borderRadius: '18px',
                border: 'none',
                background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
                boxShadow: skeuRaised(8),
                height: '100%',
                transition: 'box-shadow 0.18s ease, transform 0.18s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: skeuRaised(10) },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2.25, '&:last-child': { pb: 2.25 } }}>
                <Box>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ color: BRAND, lineHeight: 1.15, textShadow: '1px 1px 0 rgba(255,255,255,0.8)' }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: alpha(BRAND, 0.55), fontWeight: 700 }}>
                    {stat.label}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    background: stat.grad,
                    color: '#fff',
                    boxShadow: `3px 3px 8px ${SKEU_DARK}, inset 0 1px 0 ${alpha('#fff', 0.28)}`,
                  }}
                >
                  {stat.icon}
                </Avatar>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {summary.warehouses > 0 && (
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 2,
            borderRadius: '16px',
            border: 'none',
            background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
            boxShadow: skeuRaised(6),
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Avatar sx={{ background: BRAND_GRADIENT, width: 40, height: 40 }}>
            <Warehouse fontSize="small" />
          </Avatar>
          <Box flex={1} minWidth={200}>
            <Typography variant="caption" sx={{ color: alpha(BRAND, 0.55), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Coverage
            </Typography>
            <Typography fontWeight={800} sx={{ color: BRAND }}>
              {summary.warehouses} warehouse{summary.warehouses === 1 ? '' : 's'} in current view
              <Typography component="span" variant="body2" sx={{ color: alpha(BRAND, 0.6), fontWeight: 600 }}>
                {' '}— {stockItems.length.toLocaleString()} total loaded lines
              </Typography>
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: '18px',
          border: 'none',
          background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
          boxShadow: skeuRaised(8),
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND }}>
            Filters
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={`${activeFilterCount} active`}
              size="small"
              sx={{
                fontWeight: 700,
                ...(activeFilterCount > 0
                  ? {
                      color: '#fff',
                      background: BRAND_GRADIENT,
                      boxShadow: `2px 2px 5px ${SKEU_DARK}`,
                    }
                  : {
                      color: BRAND,
                      background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})`,
                      boxShadow: skeuRaised(3),
                      border: 'none',
                    }),
              }}
            />
            <Button
              size="small"
              onClick={() => setOpenFilterDialog(true)}
              startIcon={<FilterList />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                color: BRAND,
                borderRadius: 2.5,
                height: 36,
                px: 1.5,
                background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})`,
                boxShadow: skeuRaised(3),
                '&:hover': { background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})` },
              }}
            >
              Advanced
            </Button>
            <Button
              size="small"
              onClick={clearAllFilters}
              disabled={activeFilterCount === 0}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                color: BRAND,
                borderRadius: 2.5,
                height: 36,
                px: 1.5,
                background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})`,
                boxShadow: skeuRaised(3),
                '&:hover': { background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})` },
                '&.Mui-disabled': { boxShadow: 'none', opacity: 0.5 },
              }}
            >
              Clear All
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Search stock items..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: alpha(BRAND, 0.5) }} />
                  </InputAdornment>
                ),
                sx: insetFieldSx,
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: alpha(BRAND, 0.55), '&.Mui-focused': { color: BRAND } }}>Company</InputLabel>
              <Select
                value={filters.company}
                onChange={(e) => setFilters((prev) => ({ ...prev, company: e.target.value }))}
                label="Company"
                sx={insetFieldSx}
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
              <InputLabel sx={{ color: alpha(BRAND, 0.55), '&.Mui-focused': { color: BRAND } }}>Branch</InputLabel>
              <Select
                value={filters.branch}
                onChange={(e) => setFilters((prev) => ({ ...prev, branch: e.target.value }))}
                label="Branch"
                sx={insetFieldSx}
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
              <InputLabel sx={{ color: alpha(BRAND, 0.55), '&.Mui-focused': { color: BRAND } }}>Warehouse</InputLabel>
              <Select
                value={filters.warehouse}
                onChange={(e) => setFilters((prev) => ({ ...prev, warehouse: e.target.value }))}
                label="Warehouse"
                sx={insetFieldSx}
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
            <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" sx={{ color: alpha(BRAND, 0.55), fontWeight: 700 }}>
                {filteredItems.length.toLocaleString()} items
              </Typography>
              <Button
                size="small"
                onClick={resetToDefaults}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  color: '#fff',
                  borderRadius: 2.5,
                  height: 36,
                  px: 1.75,
                  background: BRAND_GRADIENT,
                  boxShadow: `2px 2px 5px ${SKEU_DARK}`,
                  '&:hover': { background: BRAND_GRADIENT, filter: 'brightness(1.05)' },
                }}
              >
                Reset
              </Button>
            </Box>
          </Grid>
        </Grid>

        {activeFilterCount > 0 && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(filters).map(([key, value]) => {
              if (value && key !== 'search') {
                const column = columns.find((col) => col.id === key);
                return (
                  <Chip
                    key={key}
                    label={`${column?.label || key}: ${value}`}
                    onDelete={() => setFilters((prev) => ({ ...prev, [key]: '' }))}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      color: BRAND,
                      background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})`,
                      boxShadow: skeuRaised(3),
                      border: 'none',
                      '& .MuiChip-deleteIcon': { color: alpha(BRAND, 0.55) },
                    }}
                  />
                );
              }
              if (value && key === 'search') {
                return (
                  <Chip
                    key={key}
                    label={`Search: "${value}"`}
                    onDelete={() => setFilters((prev) => ({ ...prev, search: '' }))}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      color: BRAND,
                      background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})`,
                      boxShadow: skeuRaised(3),
                      border: 'none',
                      '& .MuiChip-deleteIcon': { color: alpha(BRAND, 0.55) },
                    }}
                  />
                );
              }
              return null;
            })}
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Stock Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '18px',
          overflow: 'hidden',
          border: 'none',
          background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
          boxShadow: skeuRaised(8),
        }}
      >
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.filter((col) => col.visible).map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    style={{ minWidth: column.minWidth }}
                    sx={{
                      background: alpha(BRAND, 0.06),
                      fontWeight: 700,
                      color: BRAND,
                      borderBottom: `2px solid ${alpha(BRAND, 0.12)}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {column.sortable ? (
                        <TableSortLabel
                          active={Boolean(getSortDirection(column.id))}
                          direction={getSortDirection(column.id) || 'asc'}
                          onClick={() => handleSort(column.id)}
                          sx={{
                            minWidth: 'auto',
                            color: `${BRAND} !important`,
                            '&.Mui-active': { color: `${BRAND} !important` },
                            '& .MuiTableSortLabel-icon': { color: `${BRAND} !important` },
                          }}
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
                            background: BRAND_GRADIENT,
                            color: 'white',
                            fontWeight: 700,
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
                        backgroundColor: alpha(BRAND, 0.02),
                      },
                      '&:hover': {
                        backgroundColor: `${alpha(BRAND, 0.05)} !important`,
                      },
                    }}
                  >
                    {columns.filter((col) => col.visible).map((column) => (
                      <TableCell key={column.id} align={column.align || 'left'} sx={{ color: alpha(BRAND, 0.9) }}>
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
          sx={{
            borderTop: `1px solid ${alpha(BRAND, 0.08)}`,
            color: BRAND,
            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontWeight: 600 },
          }}
        />
      </Paper>

      {/* Column Visibility Dialog */}
      <Dialog
        open={openColumnDialog}
        onClose={() => setOpenColumnDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ background: BRAND_GRADIENT, color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewColumn />
            Column Visibility
          </Box>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: SKEU_BG }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {columns.map((column) => (
              <Grid item xs={12} sm={6} md={4} key={column.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={column.visible}
                      onChange={() => toggleColumnVisibility(column.id)}
                      sx={{ color: alpha(BRAND, 0.4), '&.Mui-checked': { color: BRAND } }}
                    />
                  }
                  label={<Typography sx={{ color: BRAND, fontWeight: 600, fontSize: '0.875rem' }}>{column.label}</Typography>}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ bgcolor: SKEU_BG, px: 3, pb: 2 }}>
          <Button
            onClick={() => setOpenColumnDialog(false)}
            variant="contained"
            sx={{ background: BRAND_GRADIENT, textTransform: 'none', fontWeight: 700, boxShadow: skeuRaised(4), '&:hover': { background: BRAND_GRADIENT, opacity: 0.92 } }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advanced Filters Dialog */}
      <Dialog
        open={openFilterDialog}
        onClose={() => setOpenFilterDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ background: BRAND_GRADIENT, color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList />
            Advanced Filters
          </Box>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: SKEU_BG }}>
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
        <DialogActions sx={{ bgcolor: SKEU_BG, px: 3, pb: 2, gap: 1 }}>
          <Button onClick={clearAllFilters} sx={{ textTransform: 'none', fontWeight: 700, color: BRAND }}>
            Clear All
          </Button>
          <Button
            onClick={() => setOpenFilterDialog(false)}
            variant="contained"
            sx={{ background: BRAND_GRADIENT, textTransform: 'none', fontWeight: 700, boxShadow: skeuRaised(4), '&:hover': { background: BRAND_GRADIENT, opacity: 0.92 } }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Preferences Dialog */}
      <Dialog
        open={openPreferencesDialog}
        onClose={() => setOpenPreferencesDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ background: BRAND_GRADIENT, color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings />
            User Preferences
          </Box>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: SKEU_BG }}>
          <Typography variant="h6" sx={{ mt: 2, mb: 1, color: BRAND, fontWeight: 800 }}>
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
          
          <Typography variant="h6" sx={{ mt: 3, mb: 1, color: BRAND, fontWeight: 800 }}>
            Default Sort Order
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {userPreferences.sortOrder.map((sort, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={index + 1}
                  size="small"
                  sx={{ background: BRAND_GRADIENT, color: '#fff', fontWeight: 700 }}
                />
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
        <DialogActions sx={{ bgcolor: SKEU_BG, px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpenPreferencesDialog(false)} sx={{ textTransform: 'none', fontWeight: 700, color: BRAND }}>
            Cancel
          </Button>
          <Button
            onClick={savePreferences}
            variant="contained"
            sx={{ background: BRAND_GRADIENT, textTransform: 'none', fontWeight: 700, boxShadow: skeuRaised(4), '&:hover': { background: BRAND_GRADIENT, opacity: 0.92 } }}
          >
            Save Preferences
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockAvailable;
