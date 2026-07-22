import { useState, useEffect } from "react";
import {
  Button,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuList,
  ListItemText,
  Box,
  Paper,
  Divider,
  Chip,
  Avatar,
  useTheme,
  alpha,
  ListItemIcon,
  Skeleton,
  Stack,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Alert,
  Autocomplete
} from "@mui/material";
import {
  MoreVert,
  Add,
  Warehouse,
  Business,
  Description,
  Assignment,
  Visibility,
  Search,
  Refresh,
  LocationOn,
  Category,
  GroupWork,
  Delete,
  Clear,
  Warning
} from "@mui/icons-material";
import { servicesAPI } from "../config/api";
import Sections from "./sections";
import ViewSectionsDialog from "./viewSections";
import AssignItem from "./assignItem";

interface Location {
  location_id: number;
  location_desc: string;
  branch: string;
  warehouse: string;
  section_count?: number;
  item_group_count?: number;
  total_amount_data?: Array<{
    prd_frm: string;
    total_count: number;
    total_amount: number;
    total_weight: number;
  }>;
  coverage_data?: {
    weight_coverage: number;
    value_coverage: number;
    total_forms_weight: number;
    total_forms_value: number;
  };
}

interface Warehouse {
  whs_whs: string;
  whs_whs_nm: string;
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';

const STAT_GRADIENTS = {
  filtered: 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)',
  warehouses: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  itemGroups: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
};

const LocationManagement: React.FC = () => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState<boolean>(false);

  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>("");

  // Separate state for create location dialog
  const [dialogWarehouse, setDialogWarehouse] = useState<string>("");

  const [locationDesc, setLocationDesc] = useState<string>("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [openCreateSectionDialog, setOpenCreateSectionDialog] = useState<boolean>(false);
  const [openViewSectionDialog, setOpenViewSectionDialog] = useState<boolean>(false);
  const [openAssignItemDialog, setOpenAssignItemDialog] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const normalizeText = (value: unknown): string => String(value ?? '').toLowerCase().trim();

  // Fetch total form values and overall weight/amount for a specific location's branch and warehouse
  const fetchTotalFormValues = async (branch: string, warehouse: string) => {
    try {
      const [formValuesResponse, overallResponse] = await Promise.all([
        servicesAPI.getTotalFormValues(),
        servicesAPI.getOverallWeightAndAmount(branch, warehouse)
      ]);
      
      console.log('Total form values response:', formValuesResponse.data);
      console.log('Overall weight and amount response for', branch, warehouse, ':', overallResponse.data);
      
      return {
        formValues: formValuesResponse.data.success ? formValuesResponse.data.data : {},
        overall: overallResponse.data.success ? overallResponse.data.data : { overall_weight: 0, overall_amount: 0 }
      };
    } catch (error) {
      console.error("Error fetching total form values:", error);
      return {
        formValues: {},
        overall: { overall_weight: 0, overall_amount: 0 }
      };
    }
  };

  // Fetch warehouses when dialog opens
  useEffect(() => {
    const fetchWarehouses = async () => {
      if (openDialog) {
        try {
          setWarehousesLoading(true);
          console.log('Fetching all warehouses');
          const response = await servicesAPI.getAllWarehouses();
          console.log('Warehouses response:', response);
          
          if (response && response.data) {
            const warehouseData = response.data.Data || response.data || [];
            console.log('Raw warehouse data:', warehouseData);
            
            // Remove duplicates based on whs_whs (warehouse code)
            const uniqueWarehouses = warehouseData.reduce((acc: Warehouse[], current: Warehouse) => {
              const exists = acc.find(item => item.whs_whs === current.whs_whs);
              if (!exists) {
                acc.push(current);
              }
              return acc;
            }, []);
            
            console.log('Unique warehouses:', uniqueWarehouses);
            console.log('Duplicate count:', warehouseData.length - uniqueWarehouses.length);
            setWarehouses(uniqueWarehouses);
          } else {
            console.log('No warehouse data in response');
            setWarehouses([]);
          }
        } catch (error) {
          console.error("Error fetching warehouses:", error);
          setWarehouses([]);
        } finally {
          setWarehousesLoading(false);
        }
      }
    };
    
    if (openDialog) {
      fetchWarehouses();
    }
  }, [openDialog]);


  // Fetch locations from the database
  const fetchLocations = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError(null);
      
      
      const response = await servicesAPI.getLocations();
      console.log('Fetched locations:', response.data);
      
      const locationsWithCounts = await Promise.all(
        response.data.map(async (location: Location) => {
          console.log(`Processing location ${location.location_id}: ${location.location_desc}`);
          
          let sectionsRes, itemsRes;
          try {
            sectionsRes = await servicesAPI.getSectionCount(location.location_id.toString());
          } catch (error) {
            console.log(`Error fetching sections for location ${location.location_id}:`, error);
            sectionsRes = { data: { count: 0 } };
          }
          
          try {
            itemsRes = await servicesAPI.getItemGroups(location.location_id.toString());
          } catch (error) {
            console.log(`Error fetching item groups for location ${location.location_id}:`, error);
            itemsRes = { data: { count: 0 } };
          }
          
          // Fetch total amount data for assigned items
          let totalAmountData: Array<{ total_count: number; total_amount: number; total_weight: number; prd_frm: string }> = [];
          try {
            console.log(`Fetching total amount data for location ${location.location_id}...`);
            const totalAmountRes = await servicesAPI.getAssignedItemsTotalAmount(location.location_id.toString());
            console.log(`Total amount response for location ${location.location_id}:`, totalAmountRes.data);
            
            if (totalAmountRes.data.success && totalAmountRes.data.data) {
              totalAmountData = totalAmountRes.data.data;
              console.log(`Total amount data for location ${location.location_id}:`, totalAmountData);
            }
          } catch (error) {
            console.log(`No total amount data for location ${location.location_id}:`, error);
          }
          
          // Calculate coverage percentages
          let coverageData = {
            weight_coverage: 0,
            value_coverage: 0,
            total_forms_weight: 0,
            total_forms_value: 0
          };
          
          if (totalAmountData.length > 0) {
            const { formValues, overall } = await fetchTotalFormValues(location.branch, location.warehouse);
            console.log('Total form values and overall data for coverage calculation:', { formValues, overall });
            
            // Calculate total weight and value for assigned forms
            const assignedTotalWeight = totalAmountData.reduce((sum, item) => sum + (Number(item.total_weight) || 0), 0);
            const assignedTotalValue = totalAmountData.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
            
            // Use overall weight and amount from the new API
            const overallWeight = overall.overall_weight || 0;
            const overallAmount = overall.overall_amount || 0;
            
            console.log(`Coverage calculation for location ${location.location_id}:`, {
              assignedTotalWeight,
              assignedTotalValue,
              overallWeight,
              overallAmount
            });
            
            // Calculate coverage percentages
            const weightCoverage = overallWeight > 0 ? (assignedTotalWeight / overallWeight) * 100 : 0;
            const valueCoverage = overallAmount > 0 ? (assignedTotalValue / overallAmount) * 100 : 0;
            
            coverageData = {
              weight_coverage: Math.round(weightCoverage * 100) / 100,
              value_coverage: Math.round(valueCoverage * 100) / 100,
              total_forms_weight: overallWeight,
              total_forms_value: overallAmount
            };
            
            console.log(`Coverage data for location ${location.location_id}:`, coverageData);
          } else {
            console.log(`No coverage data for location ${location.location_id}:`, {
              totalAmountDataLength: totalAmountData.length
            });
          }
          
          const locationWithData = {
            ...location,
            section_count: parseInt(sectionsRes.data.count || 0),
            item_group_count: parseInt(itemsRes.data.count),
            total_amount_data: totalAmountData,
            coverage_data: coverageData
          };
          
          console.log(`Final location data for ${location.location_id}:`, {
            location_desc: locationWithData.location_desc,
            section_count: locationWithData.section_count,
            item_group_count: locationWithData.item_group_count,
            total_amount_data_length: locationWithData.total_amount_data.length,
            total_amount_data: locationWithData.total_amount_data,
            coverage_data: locationWithData.coverage_data
          });
          
          return locationWithData;
        })
      );
      
      console.log('All locations with data:', locationsWithCounts);
      setLocations(locationsWithCounts);
      setFilteredLocations(locationsWithCounts);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setError("Failed to load locations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Filter locations based on search term and warehouse
  useEffect(() => {
    let filtered = locations;

    // Advanced search: null-safe, token-based matching with simple relevance ranking
    if (searchTerm.trim() !== '') {
      const search = normalizeText(searchTerm);
      const tokens = search.split(/\s+/).filter(Boolean);

      filtered = filtered
        .map((location) => {
          const desc = normalizeText(location.location_desc);
          const warehouse = normalizeText(location.warehouse);
          const id = String(location.location_id ?? '');
          const haystack = `${desc} ${warehouse} ${id}`;
          const matchesAll = tokens.every((token) => haystack.includes(token));
          if (!matchesAll) return null;

          let score = 0;
          if (desc.startsWith(search)) score += 4;
          if (warehouse.startsWith(search)) score += 3;
          if (id.startsWith(search)) score += 1;

          return { location, score };
        })
        .filter((entry): entry is { location: Location; score: number } => entry !== null)
        .sort((a, b) => b.score - a.score || a.location.location_desc.localeCompare(b.location.location_desc))
        .map((entry) => entry.location);
    }

    // Filter by warehouse
    if (selectedWarehouseFilter !== '') {
      filtered = filtered.filter(location => location.warehouse === selectedWarehouseFilter);
    }

    console.log('Filtering results:', {
      totalLocations: locations.length,
      filteredCount: filtered.length,
      searchTerm,
      selectedWarehouseFilter,
      filters: {
        search: searchTerm.trim() !== '',
        warehouse: selectedWarehouseFilter !== ''
      }
    });
    setFilteredLocations(filtered);
  }, [searchTerm, selectedWarehouseFilter, locations]);

  const createLocation = async () => {
    if (!locationDesc || !dialogWarehouse) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setCreateLoading(true);
      await servicesAPI.createLocation({
        location_desc: locationDesc,
        branch: null,
        warehouse: dialogWarehouse,
      });

      setOpenDialog(false);
      resetDialogState();
      await fetchLocations();
    } catch (error) {
      console.error("Error creating location:", error);
      setError("Failed to create location");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, location: Location) => {
    setAnchorEl(event.currentTarget);
    setSelectedLocation(location);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCreateSections = () => {
    setOpenCreateSectionDialog(true);
    handleMenuClose();
  };

  const handleAssignItem = () => {
    setOpenAssignItemDialog(true);
    handleMenuClose();
  };

  const handleViewSections = () => {
    setOpenViewSectionDialog(true);
    handleMenuClose();
  };

  const handleDeletePhysicalInventory = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    if (!selectedLocation) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Check if there are any transactions linked to this location
      const response = await servicesAPI.checkLocationTransactions(selectedLocation.location_id.toString());
      
      if (response.data.hasTransactions) {
        setDeleteError(`Cannot delete this location. There are ${response.data.transactionCount} transaction(s) linked to this physical inventory.`);
        return;
      }

      // If no transactions, proceed with deletion
      await servicesAPI.deleteLocation(selectedLocation.location_id.toString());
      
      // Close dialog and refresh locations
      setDeleteDialogOpen(false);
      setSelectedLocation(null);
      await fetchLocations();
      
    } catch (error: unknown) {
      console.error('Error deleting physical inventory:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data
        ? String(error.response.data.message)
        : 'Failed to delete physical inventory. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteError(null);
  };

  const handleRefresh = () => {
    fetchLocations();
  };

  const resetDialogState = () => {
    setLocationDesc("");
    setDialogWarehouse("");
    setError(null);
  };

  // Unique warehouse options from loaded locations
  const getSafeWarehouses = () => {
    const uniqueWarehouses = [...new Set(locations.map(location => location.warehouse).filter(Boolean))];
    return uniqueWarehouses.sort();
  };

  const totalItemGroups = locations.reduce((sum, loc) => sum + (loc.item_group_count || 0), 0);
  const hasActiveFilters = Boolean(searchTerm || selectedWarehouseFilter);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={140} sx={{ mb: 3, borderRadius: '20px' }} />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={6} md={3} key={index}>
              <Skeleton variant="rectangular" width="100%" height={88} sx={{ borderRadius: '16px' }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" width="100%" height={72} sx={{ mb: 3, borderRadius: '16px' }} />
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Skeleton variant="rectangular" width="100%" height={280} sx={{ borderRadius: '16px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error && !refreshing) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        {/* <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert> */}
        <Button 
          variant="contained" 
          onClick={fetchLocations}
          startIcon={<Refresh />}
        >
          Retry
        </Button>
      </Box>
    );
  }

  try {
    return (
      <Box sx={{ p: 3, position: 'relative' }}>
        {/* Refreshing Overlay */}
        {refreshing && !loading && (
          <Box sx={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1300,
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: 3,
            px: 3,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Refreshing locations...
            </Typography>
          </Box>
        )}
        
        {/* Hero Header */}
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
            boxShadow: '0 14px 40px 0 rgba(12,44,72,0.30)'
          }}
        >
          <Box sx={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <Box sx={{ position: 'absolute', bottom: -80, right: 130, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <Box sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2.5, sm: 0 }
          }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 56, height: 56 }}>
                <Warehouse sx={{ fontSize: 30, color: '#fff' }} />
              </Avatar>
              <Box>
                <Typography variant="h4" component="h1" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.15 }}>
                  Inventory Counts
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
                  Manage all your inventory locations in one place
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              onClick={() => setOpenDialog(true)}
              startIcon={<Add />}
              sx={{
                backgroundColor: '#fff',
                color: theme.palette.primary.main,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                whiteSpace: 'nowrap',
                boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
              }}
            >
              New Count
            </Button>
          </Box>
        </Box>

        {/* Stats Strip */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Locations', value: locations.length, grad: BRAND_GRADIENT, icon: <Warehouse /> },
            { label: hasActiveFilters ? 'Filtered Results' : 'All Locations', value: filteredLocations.length, grad: STAT_GRADIENTS.filtered, icon: <Search /> },
            { label: 'Warehouses', value: getSafeWarehouses().length, grad: STAT_GRADIENTS.warehouses, icon: <Business /> },
            { label: 'Item Groups', value: totalItemGroups, grad: STAT_GRADIENTS.itemGroups, icon: <Category /> },
          ].map((stat) => (
            <Grid item xs={6} md={3} key={stat.label}>
              <Card sx={{
                borderRadius: '16px',
                border: '1px solid rgba(12,44,72,0.06)',
                boxShadow: '0 6px 24px 0 rgba(12,44,72,0.05)',
                height: '100%',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 32px 0 rgba(12,44,72,0.12)' }
              }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                  <Avatar sx={{ background: stat.grad, width: 44, height: 44, color: '#fff' }}>
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: theme.palette.primary.main, lineHeight: 1 }}>
                      {stat.value.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

      {/* Filters and Search */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid rgba(12,44,72,0.06)', boxShadow: '0 6px 24px 0 rgba(12,44,72,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Search by count, warehouse, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                      edge="end"
                      aria-label="Clear search"
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
                sx: {
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.action.hover, 0.08),
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                  }
                }
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Warehouse</InputLabel>
              <Select
                value={selectedWarehouseFilter}
                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                label="Filter by Warehouse"
                sx={{ borderRadius: 2 }}
                startAdornment={
                  <InputAdornment position="start">
                    <Warehouse fontSize="small" />
                  </InputAdornment>
                }
              >
                <MenuItem value="">All Warehouses</MenuItem>
                {getSafeWarehouses().map((warehouse, index) => (
                  <MenuItem key={`warehouse-${warehouse}-${index}`} value={warehouse}>
                    {warehouse}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {filteredLocations.length} locations
              </Typography>
              <Tooltip title="Clear Filters">
                <IconButton 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedWarehouseFilter('');
                  }}
                  disabled={!searchTerm && !selectedWarehouseFilter}
                  sx={{
                    backgroundColor: alpha(theme.palette.action.hover, 0.1),
                    borderRadius: 2
                  }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  sx={{
                    backgroundColor: alpha(theme.palette.action.hover, 0.1),
                    borderRadius: 2
                  }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
        
        {/* Active Filters Display */}
        {(searchTerm || selectedWarehouseFilter) && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              Active filters:
            </Typography>
            {searchTerm && (
              <Chip
                label={`Search: "${searchTerm}"`}
                size="small"
                onDelete={() => setSearchTerm('')}
                color="primary"
                variant="outlined"
              />
            )}
            {selectedWarehouseFilter && (
              <Chip
                label={`Warehouse: ${selectedWarehouseFilter}`}
                size="small"
                onDelete={() => setSelectedWarehouseFilter('')}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Create Location Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          if (createLoading) return;
          setOpenDialog(false);
          resetDialogState();
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(12,44,72,0.18)',
          }
        }}
      >
        <Box sx={{ position: 'relative', overflow: 'hidden', background: BRAND_GRADIENT, color: '#fff', px: 3, py: 2.5 }}>
          <Box sx={{ position: 'absolute', top: -40, right: -20, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.75 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.16)', width: 46, height: 46 }}>
              <Add sx={{ color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.15 }}>
                Create New Location
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                Add a physical inventory count location and link it to a warehouse
              </Typography>
            </Box>
          </Box>
        </Box>
        <DialogContent sx={{ px: 3, pt: 3, pb: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Location Description"
              value={locationDesc}
              onChange={(e) => setLocationDesc(e.target.value)}
              fullWidth
              required
              placeholder="e.g. SKY - 1"
              helperText="A short name to identify this count location"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Description color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '12px' },
              }}
            />

            <Autocomplete
              fullWidth
              options={warehouses}
              value={warehouses.find(w => w.whs_whs === dialogWarehouse) || null}
              onChange={(_, newValue) => {
                setDialogWarehouse(newValue ? newValue.whs_whs : '');
              }}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return `${option.whs_whs} | ${option.whs_whs_nm}`;
              }}
              isOptionEqualToValue={(option, value) => option.whs_whs === value.whs_whs}
              loading={warehousesLoading}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return options.slice(0, 50);
                const searchTerm = inputValue.toLowerCase();
                const filtered = options.filter(option =>
                  option.whs_whs?.toLowerCase().includes(searchTerm) ||
                  option.whs_whs_nm?.toLowerCase().includes(searchTerm)
                );
                return filtered.sort((a, b) => {
                  const aCodeMatch = a.whs_whs?.toLowerCase().includes(searchTerm);
                  const bCodeMatch = b.whs_whs?.toLowerCase().includes(searchTerm);
                  if (aCodeMatch && !bCodeMatch) return -1;
                  if (!aCodeMatch && bCodeMatch) return 1;
                  return (a.whs_whs || '').localeCompare(b.whs_whs || '');
                });
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.whs_whs}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', py: 0.5 }}>
                    <Chip
                      label={option.whs_whs}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600, minWidth: 72 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {option.whs_whs_nm}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Warehouse"
                  required
                  placeholder="Type to search warehouse..."
                  helperText="Search by warehouse code or name"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <Warehouse color="action" fontSize="small" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                    endAdornment: (
                      <>
                        {warehousesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                  }}
                />
              )}
            />

            {(locationDesc.trim() || dialogWarehouse) && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  bgcolor: 'rgba(12,44,72,0.03)',
                  borderColor: 'rgba(12,44,72,0.10)',
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Preview
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      background: BRAND_GRADIENT,
                      color: '#fff',
                    }}
                  >
                    <LocationOn fontSize="small" />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                      {locationDesc.trim() || '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {dialogWarehouse
                        ? warehouses.find(w => w.whs_whs === dialogWarehouse)?.whs_whs_nm
                          ? `${dialogWarehouse} · ${warehouses.find(w => w.whs_whs === dialogWarehouse)?.whs_whs_nm}`
                          : dialogWarehouse
                        : 'Select a warehouse'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
            borderTop: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.action.hover, 0.04),
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {!locationDesc.trim() || !dialogWarehouse
              ? 'Fill in all required fields to continue'
              : 'Ready to create'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto' }}>
            <Button
              onClick={() => {
                setOpenDialog(false);
                resetDialogState();
              }}
              variant="outlined"
              disabled={createLoading}
              sx={{ borderRadius: '10px', px: 2.5, minWidth: 96, textTransform: 'none', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={createLocation}
              variant="contained"
              disabled={!locationDesc.trim() || !dialogWarehouse || createLoading}
              startIcon={createLoading ? <CircularProgress size={18} color="inherit" /> : <Add />}
              sx={{
                borderRadius: '10px',
                px: 2.5,
                minWidth: 148,
                textTransform: 'none',
                fontWeight: 700,
                background: BRAND_GRADIENT,
                boxShadow: '0 4px 14px rgba(12,44,72,0.25)',
                '&:hover': { background: BRAND_GRADIENT, opacity: 0.92 },
              }}
            >
              {createLoading ? 'Creating…' : 'Create Location'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Locations Grid */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: '16px',
        minHeight: 400,
        border: '1px solid rgba(12,44,72,0.06)',
        boxShadow: '0 6px 24px 0 rgba(12,44,72,0.05)'
      }}>
        {/* {refreshing && <LinearProgress color="primary" sx={{ mb: 3 }} />} */}
        
        {filteredLocations.length === 0 ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300
          }}>
            <Warehouse sx={{ 
              fontSize: 80, 
              color: theme.palette.action.disabled, 
              mb: 2 
            }} />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              No Locations Found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm 
                ? 'No locations match your search criteria' 
                : 'Create your first inventory location to get started'}
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => setOpenDialog(true)}
              startIcon={<Add />}
              sx={{
                background: BRAND_GRADIENT,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                boxShadow: '0 4px 14px rgba(12,44,72,0.25)',
                '&:hover': { background: BRAND_GRADIENT, opacity: 0.92 },
              }}
            >
              Create Location
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredLocations.map((location) => (
              <Grid item xs={12} sm={6} md={4} key={location.location_id}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(12,44,72,0.08)',
                  borderRadius: '16px',
                  boxShadow: '0 6px 22px rgba(12,44,72,0.06)',
                  transition: 'all 0.3s ease',
                  minHeight: location.total_amount_data && location.total_amount_data.length > 0 ? 320 : 280,
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 16px 38px rgba(12,44,72,0.14)'
                  }
                }}>
                  <Box sx={{ height: 5, background: BRAND_GRADIENT }} />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ 
                        background: BRAND_GRADIENT,
                        color: '#fff',
                        mr: 2,
                        width: 48,
                        height: 48,
                        boxShadow: '0 4px 12px rgba(12,44,72,0.25)'
                      }}>
                        <LocationOn />
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                          {location.location_desc}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {location.location_id}
                        </Typography>
                      </Box>
                      <IconButton
                        aria-label="more options"
                        onClick={(e) => handleMenuClick(e, location)}
                        sx={{
                          backgroundColor: 'rgba(12,44,72,0.05)',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.14)
                          }
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                    
                    {/* Total Summary Section */}
                    {location.total_amount_data && location.total_amount_data.length > 0 ? (
                      <Box sx={{ 
                        mb: 2, 
                        p: 2, 
                        backgroundColor: alpha(theme.palette.success.main, 0.1),
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              Total Summary
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {location.total_amount_data.length} form{location.total_amount_data.length !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              Total Count: {location.total_amount_data.reduce((sum: number, item: { total_count: number; total_amount: number; total_weight: number; prd_frm: string }) => sum + (Number(item.total_count) || 0), 0).toLocaleString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              Total Weight: {location.total_amount_data.reduce((sum: number, item: { total_count: number; total_amount: number; total_weight: number; prd_frm: string }) => sum + (Number(item.total_weight) || 0), 0).toLocaleString()}
                            </Typography>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              color: theme.palette.success.main,
                              fontSize: '1.1rem'
                            }}>
                              ${location.total_amount_data.reduce((sum: number, item: { total_count: number; total_amount: number; total_weight: number; prd_frm: string }) => sum + (Number(item.total_amount) || 0), 0).toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Coverage Percentages */}
                        {location.coverage_data && (
                          <Box sx={{ 
                            mt: 1.5, 
                            pt: 1.5, 
                            borderTop: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center'
                          }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Weight Coverage
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 600, 
                                color: theme.palette.info.main
                              }}>
                                {location.coverage_data.weight_coverage.toFixed(1)}%
                              </Typography>
                            </Box>

                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                $ Value Coverage
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 600, 
                                color: theme.palette.warning.main
                              }}>
                                {location.coverage_data.value_coverage.toFixed(1)}%
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        

                      </Box>
                    ) : location.total_amount_data && location.total_amount_data.length === 0 ? (
                      <Box sx={{ 
                        mb: 2, 
                        p: 2, 
                        backgroundColor: alpha(theme.palette.warning.main, 0.1),
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              No Assigned Items
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              No forms assigned to this location
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              Total Count: 0
                            </Typography>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              color: theme.palette.warning.main,
                              fontSize: '1.1rem'
                            }}>
                              $0
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ 
                        mb: 2, 
                        p: 2, 
                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              Loading Data...
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Fetching assigned items data
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <CircularProgress size={20} color="info" />
                          </Box>
                        </Box>
                      </Box>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Business sx={{ 
                          mr: 1.5, 
                          color: theme.palette.secondary.main,
                          fontSize: 20 
                        }} />
                        <Typography variant="body1">
                          {location.branch}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Warehouse sx={{ 
                          mr: 1.5, 
                          color: theme.palette.info.main,
                          fontSize: 20 
                        }} />
                        <Typography variant="body1">
                          {location.warehouse}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        mt: 2
                      }}>
                        <Chip 
                          icon={<GroupWork fontSize="small" />}
                          label={`${location.section_count || 0} Sections`}
                          variant="outlined"
                          size="small"
                          sx={{
                            borderColor: theme.palette.success.light,
                            color: theme.palette.success.dark
                          }}
                        />
                        
                        <Chip 
                          icon={<Category fontSize="small" />}
                          label={`${location.item_group_count || 0} Item Groups`}
                          variant="outlined"
                          size="small"
                          sx={{
                            borderColor: theme.palette.warning.light,
                            color: theme.palette.warning.dark
                          }}
                        />
                      </Box>
                      
                      {/* Total Amount Data */}
                      {location.total_amount_data && location.total_amount_data.length > 0 ? (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                            <Category fontSize="small" sx={{ mr: 0.5 }} />
                            Total Amount by Form ({location.total_amount_data.length}):
                          </Typography>
                          <Box sx={{ 
                            maxHeight: 120, 
                            overflowY: 'auto',
                            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                            borderRadius: 1,
                            backgroundColor: alpha(theme.palette.background.paper, 0.5)
                          }}>
                            <Stack spacing={0}>
                              {location.total_amount_data.map((item, index) => (
                                <Box key={index} sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  p: 1,
                                  borderBottom: index < (location.total_amount_data?.length || 0) - 1 ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.05)
                                  },
                                  transition: 'background-color 0.2s ease'
                                }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ 
                                      width: 8, 
                                      height: 8, 
                                      borderRadius: '50%', 
                                      backgroundColor: theme.palette.primary.main,
                                      mr: 1
                                    }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                      {item.prd_frm}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                                      Count: {Number(item.total_count || 0).toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                                      Weight: {Number(item.total_weight || 0).toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" sx={{ 
                                      fontWeight: 700, 
                                      color: theme.palette.success.main,
                                      fontSize: '0.875rem'
                                    }}>
                                      ${Number(item.total_amount || 0).toLocaleString()}
                                    </Typography>
                                  </Box>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        </Box>
                      ) : location.total_amount_data && location.total_amount_data.length === 0 ? (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ 
                            mb: 1, 
                            fontWeight: 500, 
                            display: 'flex', 
                            alignItems: 'center',
                            fontStyle: 'italic'
                          }}>
                            <Category fontSize="small" sx={{ mr: 0.5 }} />
                            No assigned items with amount data
                          </Typography>
                        </Box>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(12,44,72,0.12)',
            minWidth: 200
          }
        }}
      >
        <MenuList dense>
          <MenuItem onClick={handleCreateSections}>
            <ListItemIcon>
              <Add fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Create Sections" />
          </MenuItem>
          <MenuItem onClick={handleViewSections}>
            <ListItemIcon>
              <Visibility fontSize="small" color="info" />
            </ListItemIcon>
            <ListItemText primary="Assign Team to sections" />
          </MenuItem>
          <MenuItem onClick={handleAssignItem}>
            <ListItemIcon>
              <Assignment fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText primary="Assign Item Group" />
          </MenuItem>
          <MenuItem onClick={handleDeletePhysicalInventory}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Remove Physical Inventory" />
          </MenuItem>
        </MenuList>
      </Menu>

      {/* Dialogs */}
      {openCreateSectionDialog && selectedLocation && (
        <Sections
          open={openCreateSectionDialog}
          onClose={() => setOpenCreateSectionDialog(false)}
          onCreate={fetchLocations}
          location_id={selectedLocation.location_id.toString()}
          location_desc={selectedLocation.location_desc}
          warehouse={selectedLocation.warehouse}
          branch={selectedLocation.branch}
          existingSections={[]} // You should fetch existing sections here
        />
      )}
      
      {openViewSectionDialog && selectedLocation && (
        <ViewSectionsDialog
          open={openViewSectionDialog}
          onClose={() => setOpenViewSectionDialog(false)}
          location_id={selectedLocation.location_id.toString()}
          location_desc={selectedLocation.location_desc}
          warehouse={selectedLocation.warehouse}
          branch={selectedLocation.branch}
        />
      )}
      
      {openAssignItemDialog && selectedLocation && (
        <AssignItem
          open={openAssignItemDialog}
          onClose={() => setOpenAssignItemDialog(false)}
          location_id={selectedLocation.location_id.toString()}
          onUpdate={fetchLocations} // Pass the fetchLocations function as the update callback
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(12,44,72,0.18)'
          }
        }}
      >
        <Box sx={{ background: 'linear-gradient(135deg, #c62828 0%, #e53935 100%)', color: '#fff', px: 3, py: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.16)', width: 44, height: 44 }}>
              <Warning sx={{ color: '#fff' }} />
            </Avatar>
            <Typography variant="h6" fontWeight={800}>
              Delete Physical Inventory
            </Typography>
          </Box>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          {deleteError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This action cannot be undone!
              </Alert>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you sure you want to delete the physical inventory for:
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: alpha(theme.palette.error.main, 0.05), 
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
              }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {selectedLocation?.location_desc}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Branch: {selectedLocation?.branch} | Warehouse: {selectedLocation?.warehouse}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                This will delete the location and all associated sections, but only if there are no transactions linked to this physical inventory.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button 
            onClick={handleCancelDelete} 
            variant="outlined"
            disabled={isDeleting}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          {!deleteError && (
            <Button 
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} /> : <Delete />}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
    );
  } catch (error) {
    console.error('Error rendering LocationManagement component:', error);
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Something went wrong while loading the page. Please refresh and try again.
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          startIcon={<Refresh />}
        >
          Refresh Page
        </Button>
      </Box>
    );
  }
};

export default LocationManagement;