import { useState, useEffect } from "react";
import {
  Button,
  Typography,
  Dialog,
  DialogTitle,
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
  Alert
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
  CompareArrows
} from "@mui/icons-material";
import { servicesAPI } from "../config/api";
import { useNavigate } from "react-router-dom";
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

interface Branch {
  brh_brh: string;
}



const LocationManagement: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState<boolean>(false);

  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  // Separate state for create location dialog
  const [dialogBranch, setDialogBranch] = useState<string>("");
  const [dialogWarehouse, setDialogWarehouse] = useState<string>("");

  const [locationDesc, setLocationDesc] = useState<string>("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [openCreateSectionDialog, setOpenCreateSectionDialog] = useState<boolean>(false);
  const [openViewSectionDialog, setOpenViewSectionDialog] = useState<boolean>(false);
  const [openAssignItemDialog, setOpenAssignItemDialog] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);

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

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await servicesAPI.getBranches();
        setBranches(response.data.Data);
      } catch (error) {
        console.error("Error fetching branches:", error);
        setError("Failed to load branches");
      }
    };
    fetchBranches();
  }, []);

  // Fetch warehouses when branch changes
  useEffect(() => {
    const fetchWarehouses = async () => {
      if (dialogBranch && dialogBranch.trim() !== '') {
        try {
          setWarehousesLoading(true);
          console.log('Fetching warehouses for branch:', dialogBranch);
          const response = await servicesAPI.getWarehouses(dialogBranch);
          console.log('Warehouses response:', response);
          
          if (response && response.data) {
            const warehouseData = response.data.Data || response.data || [];
            console.log('Setting warehouses:', warehouseData);
            // Extract warehouse names from the objects and ensure they're strings
            const warehouseNames = Array.isArray(warehouseData) 
              ? warehouseData
                  .map(item => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object' && item.whs_whs) return item.whs_whs;
                    return null;
                  })
                  .filter(Boolean)
                  .filter(warehouse => typeof warehouse === 'string' && warehouse.trim() !== '')
              : [];
            console.log('Processed warehouse names:', warehouseNames);
            setWarehouses(warehouseNames);
          } else {
            console.log('No warehouse data in response');
            setWarehouses([]);
          }
        } catch (error) {
          console.error("Error fetching warehouses:", error);
          setWarehouses([]);
          // Don't set error state here to avoid breaking the UI
        } finally {
          setWarehousesLoading(false);
        }
      } else {
        setWarehouses([]);
        setWarehousesLoading(false);
      }
    };
    
    // Only fetch if we have a valid branch
    if (dialogBranch) {
      try {
        fetchWarehouses();
      } catch (error) {
        console.error("Error in warehouse fetch effect:", error);
        setWarehouses([]);
        setWarehousesLoading(false);
      }
    }
  }, [dialogBranch]);

  // Reset warehouse selection when branch changes
  useEffect(() => {
    if (dialogBranch !== '') {
      setDialogWarehouse('');
    }
  }, [dialogBranch]);


  // Fetch locations from the database
  const fetchLocations = async () => {
    try {
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

  // Filter locations based on search term and branch
  useEffect(() => {
    let filtered = locations;

    // Filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(location =>
        location.location_desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.warehouse.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by branch
    if (selectedBranch !== '') {
      filtered = filtered.filter(location => location.branch === selectedBranch);
    }

    console.log('Filtering results:', {
      totalLocations: locations.length,
      filteredCount: filtered.length,
      searchTerm,
      selectedBranch,
      filters: {
        search: searchTerm.trim() !== '',
        branch: selectedBranch !== ''
      }
    });
    setFilteredLocations(filtered);
  }, [searchTerm, selectedBranch, locations]);

  const createLocation = async () => {
    if (!dialogBranch || !locationDesc || !dialogWarehouse) {
      setError("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      await servicesAPI.createLocation({
        location_desc: locationDesc,
        branch: dialogBranch,
        warehouse: dialogWarehouse,
      });

      setOpenDialog(false);
      resetDialogState();
      await fetchLocations();
    } catch (error) {
      console.error("Error creating location:", error);
      setError("Failed to create location");
    } finally {
      setLoading(false);
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

  const handleRefresh = () => {
    fetchLocations();
  };

  const resetDialogState = () => {
    setLocationDesc("");
    setDialogBranch("");
    setDialogWarehouse("");
    setWarehouses([]);
    setError(null);
  };

  // Safety function to ensure branches is always an array
  const getSafeBranches = () => {
    if (!Array.isArray(branches)) return [];
    // Remove duplicates and ensure unique branches
    const uniqueBranches = [...new Set(branches.map(branch => branch.brh_brh))].map(brh_brh => ({ brh_brh }));
    return uniqueBranches;
  };

  // Safety function to ensure warehouses is always an array
  const getSafeWarehouses = () => {
    if (!Array.isArray(warehouses)) return [];
    // Ensure all warehouses are strings and filter out any invalid values
    return warehouses.filter(warehouse => typeof warehouse === 'string' && warehouse.trim() !== '');
  };

  if (loading && !refreshing) {
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
      <Box sx={{ p: 3 }}>
        {/* Header Section */}
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
              <Warehouse sx={{ 
                mr: 2, 
                fontSize: 40,
                color: theme.palette.primary.main 
              }} />
              Inventory Locations
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
              Manage all your inventory locations in one place
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => setOpenDialog(true)}
            startIcon={<Add />}
            sx={{ 
              height: 48,
              minWidth: 180,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none'
              }
            }}
          >
            New Location
          </Button>
        </Box>
      </Paper>

      {/* Filters and Search */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.action.hover, 0.1)
                }
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Branch</InputLabel>
              <Select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                label="Filter by Branch"
                sx={{ borderRadius: 2 }}
                startAdornment={
                  <InputAdornment position="start">
                    <Business fontSize="small" />
                  </InputAdornment>
                }
              >
                <MenuItem value="">All Branches</MenuItem>
                {getSafeBranches().map((branch, index) => (
                  <MenuItem key={`branch-${branch.brh_brh}-${index}`} value={branch.brh_brh}>
                    {branch.brh_brh}
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
                    setSelectedBranch('');
                  }}
                  disabled={!searchTerm && !selectedBranch}
                  sx={{
                    backgroundColor: alpha(theme.palette.action.hover, 0.1),
                    borderRadius: 2
                  }}
                >
                  <CompareArrows fontSize="small" />
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
        {(searchTerm || selectedBranch) && (
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
            {selectedBranch && (
              <Chip
                label={`Branch: ${selectedBranch}`}
                size="small"
                onDelete={() => setSelectedBranch('')}
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
          setOpenDialog(false);
          resetDialogState();
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: `1px solid ${theme.palette.divider}`, 
          pb: 2,
          backgroundColor: alpha(theme.palette.primary.main, 0.05)
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            color: theme.palette.primary.main
          }}>
            <Add sx={{ mr: 1.5 }} />
            <Typography variant="h6" fontWeight={600}>
              Create New Location
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            label="Location Description"
            value={locationDesc}
            onChange={(e) => setLocationDesc(e.target.value)}
            fullWidth
            margin="normal"
            InputProps={{
              startAdornment: (
                <Description color="action" sx={{ mr: 1 }} />
              ),
              sx: {
                borderRadius: 2
              }
            }}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Branch</InputLabel>
            <Select 
              value={dialogBranch} 
              onChange={(e) => setDialogBranch(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {getSafeBranches().map((branch, index) => (
                <MenuItem key={`branch-${branch.brh_brh}-${index}`} value={branch.brh_brh}>
                  {branch.brh_brh}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Warehouse</InputLabel>
            <Select 
              value={dialogWarehouse} 
              onChange={(e) => setDialogWarehouse(e.target.value)}
              sx={{ borderRadius: 2 }}
              disabled={!dialogBranch}
            >
              {!dialogBranch ? (
                <MenuItem disabled>
                  Please select a branch first
                </MenuItem>
              ) : warehousesLoading ? (
                <MenuItem disabled>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    Loading warehouses...
                  </Box>
                </MenuItem>
              ) : getSafeWarehouses().length === 0 ? (
                <MenuItem disabled>
                  No warehouses found
                </MenuItem>
              ) : (
                getSafeWarehouses().map((warehouse, index) => (
                  <MenuItem key={`warehouse-${warehouse}-${index}`} value={warehouse}>
                    {warehouse}
                  </MenuItem>
                ))
              )}
            </Select>
            {dialogBranch && !warehousesLoading && getSafeWarehouses().length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                No warehouses found for this branch
              </Typography>
            )}
          </FormControl>


        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.action.hover, 0.05)
        }}>
          <Button 
            onClick={() => setOpenDialog(false)} 
            variant="outlined"
            sx={{ 
              mr: 2,
              borderRadius: 2,
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={createLocation} 
            color="primary" 
            variant="contained"
            disabled={!dialogBranch || !locationDesc || !dialogWarehouse || loading}
            sx={{
              borderRadius: 2,
              px: 3
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Location'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Locations Grid */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 3,
        minHeight: 400
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
                  borderLeft: `4px solid ${theme.palette.primary.main}`,
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  minHeight: location.total_amount_data && location.total_amount_data.length > 0 ? 320 : 280,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[6]
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        mr: 2,
                        width: 48,
                        height: 48
                      }}>
                        <LocationOn />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
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
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.1)
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
            borderRadius: 2,
            boxShadow: theme.shadows[3],
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
            <ListItemText primary="View Sections" />
          </MenuItem>
          <MenuItem onClick={handleAssignItem}>
            <ListItemIcon>
              <Assignment fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText primary="Assign Item Group" />
          </MenuItem>
          <MenuItem onClick={() => {
            handleMenuClose();
            navigate(`/reconciliation-records/${selectedLocation?.location_id}`);
          }}>
            <ListItemIcon>
              <CompareArrows fontSize="small" color="info" />
            </ListItemIcon>
            <ListItemText primary="View Reconciliation Records" />
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