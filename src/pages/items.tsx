import React, { useEffect, useState } from 'react';
import { servicesAPI } from '../config/api';
import { 
  DataGrid, 
  GridColDef, 
  GridToolbar, 
  GridFilterModel,
  GridRowParams,
  GridRenderCellParams
} from '@mui/x-data-grid';
import { 
  IconButton, 
  Menu, 
  MenuItem, 
  Typography, 
  Box, 
  Card, 
  CardContent,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BarChartIcon from '@mui/icons-material/BarChart';
import InventoryIcon from '@mui/icons-material/Inventory';
import FilterListIcon from '@mui/icons-material/FilterList';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface InventoryAnalysis {
  prd_frm: string;
  total_weight: number;
  cost_pool_total: number;
  weight_percentage: number;
  cost_pool_percentage: number;
  warehouses?: string[];
}



interface InventoryDetailTypeQuality {
  prd_frm: string;
  prd_invt_typ: string;
  prd_invt_qlty: string;
  type_description: string;
  quality_description: string;
  total_pieces: number;
  total_value: number;
  pieces_percentage: number;
  value_percentage: number;
}

const AnalyseInventoryPage: React.FC = () => {
  const theme = useTheme();
  const [inventoryData, setInventoryData] = useState<InventoryAnalysis[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryAnalysis[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  // Warehouse filter state
  const [availableWarehouses, setAvailableWarehouses] = useState<string[]>([]);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string[]>([]);

  // Drill-down state
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [detailTypeQualityData, setDetailTypeQualityData] = useState<InventoryDetailTypeQuality[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    fetchAvailableWarehouses();
    fetchInventoryAnalysis();
  }, [selectedWarehouseFilter]);

  const fetchAvailableWarehouses = async () => {
    try {
      const response = await servicesAPI.getAvailableWarehouses();
      if (response.data.success) {
        setAvailableWarehouses(response.data.data || []);
      } else {
        console.error('Failed to fetch warehouses:', response.data.message);
        setAvailableWarehouses([]);
      }
    } catch (error) {
      console.error('Failed to fetch available warehouses:', error);
      setAvailableWarehouses([]);
    }
  };

  const fetchInventoryAnalysis = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = selectedWarehouseFilter.length > 0 ? { warehouse: selectedWarehouseFilter.join(',') } : {};
      console.log('Selected warehouses:', selectedWarehouseFilter);
      console.log('API params:', params);
      const response = await servicesAPI.getCombinations(params);
      console.log('Raw response:', response.data);

      if (response.data.success) {
        console.log('Inventory data:', response.data.data);
        setInventoryData(response.data.data);
        setFilteredData(response.data.data);
      } else {
        setError('Failed to fetch inventory analysis');
      }
    } catch (error) {
      console.error('Failed to fetch inventory analysis:', error);
      setError('Failed to fetch inventory analysis');
    } finally {
      setLoading(false);
    }
  };



  const fetchInventoryDetailsByTypeQuality = async (form: string, warehouse?: string) => {
    try {
      setDetailLoading(true);
      
      const params: { warehouse?: string } = {};
      if (warehouse) {
        params.warehouse = warehouse;
      }
      
      const response = await servicesAPI.getInventoryDetailsByTypeQuality(form, params);

      if (response.data.success) {
        console.log('Type & Quality API Response:', response.data);
        console.log('First item data:', response.data.data[0]);
        console.log('First item pieces:', response.data.data[0]?.total_pieces, typeof response.data.data[0]?.total_pieces);
        console.log('First item value:', response.data.data[0]?.total_value, typeof response.data.data[0]?.total_value);
        console.log('First item percentages:', response.data.data[0]?.pieces_percentage, response.data.data[0]?.value_percentage);
        setDetailTypeQualityData(response.data.data);
      } else {
        setError('Failed to fetch inventory details by type and quality');
      }
    } catch (error) {
      console.error('Failed to fetch inventory details by type and quality:', error);
      setError('Failed to fetch inventory details by type and quality');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRowClick = (params: GridRowParams) => {
    const { prd_frm, warehouses } = params.row;
    setSelectedForm(prd_frm);
    setSelectedWarehouse('');
    setDetailDialogOpen(true);
    
    // If there's only one warehouse, drill down to that specific warehouse
    // If multiple warehouses, show all details
    const warehouse = warehouses && warehouses.length === 1 ? warehouses[0] : undefined;
    if (warehouse) {
      setSelectedWarehouse(warehouse);
    }
    fetchInventoryDetailsByTypeQuality(prd_frm, warehouse);
  };

  const handleWarehouseClick = (form: string, warehouse: string) => {
    setSelectedForm(form);
    setSelectedWarehouse(warehouse);
    setDetailDialogOpen(true);
    fetchInventoryDetailsByTypeQuality(form, warehouse);
  };

  const handleWarehouseFilterChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedWarehouseFilter(Array.isArray(value) ? value : [value]);
  };



  const columns: GridColDef[] = [
    { 
      field: 'prd_frm', 
      headerName: 'Form', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          color="primary" 
          variant="filled"
          size="small"
          sx={{
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            fontWeight: 600
          }}
        />
      )
    },
    { 
      field: 'warehouses', 
      headerName: 'Warehouses', 
      flex: 1.5,
      renderCell: (params: GridRenderCellParams) => {
        const warehouses = params.value || [];
        const form = params.row.prd_frm;
        
        if (warehouses.length === 0) {
          return (
            <Typography variant="body2" color="text.secondary">
              No warehouse data
            </Typography>
          );
        }
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {warehouses.map((warehouse: string, index: number) => (
              <Chip
                key={index}
                label={warehouse}
                size="small"
                variant="filled"
                color="info"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent row click
                  handleWarehouseClick(form, warehouse);
                }}
                sx={{ 
                  fontSize: '0.7rem',
                  backgroundColor: theme.palette.info.main,
                  color: theme.palette.info.contrastText,
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.palette.info.dark,
                  }
                }}
              />
            ))}
          </Box>
        );
      }
    },
    { 
      field: 'total_weight', 
      headerName: 'Total Weight', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        console.log('total_weight renderCell value:', params.value, typeof params.value);
        const value = Number(params.value);
        return (
          <Typography>
            {isNaN(value) ? '0' : value.toLocaleString()}
          </Typography>
        );
      }
    },
    { 
      field: 'cost_pool_total', 
      headerName: 'Cost Pool Total', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        console.log('cost_pool_total renderCell value:', params.value, typeof params.value);
        const value = Number(params.value);
        return (
          <Typography>
            {isNaN(value) ? '$0' : `$${value.toLocaleString()}`}
          </Typography>
        );
      }
    },
    { 
      field: 'weight_percentage', 
      headerName: 'Weight %', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        console.log('weight_percentage renderCell value:', params.value, typeof params.value);
        const value = Number(params.value);
        const displayValue = isNaN(value) ? 0 : value;
        return (
          <Box sx={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center',
            gap: 1
          }}>
            <Box sx={{ 
              width: '60%', 
              height: 8, 
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
              borderRadius: 1,
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                width: `${displayValue}%`, 
                height: '100%', 
                backgroundColor: theme.palette.primary.main,
                transition: 'width 0.3s ease'
              }} />
            </Box>
            <Typography variant="caption" sx={{ minWidth: 40 }}>
              {displayValue.toFixed(1)}%
            </Typography>
          </Box>
        );
      }
    },
    { 
      field: 'cost_pool_percentage', 
      headerName: 'Cost Pool %', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        console.log('cost_pool_percentage renderCell value:', params.value, typeof params.value);
        const value = Number(params.value);
        const displayValue = isNaN(value) ? 0 : value;
        return (
          <Box sx={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center',
            gap: 1
          }}>
            <Box sx={{ 
              width: '60%', 
              height: 8, 
              backgroundColor: alpha(theme.palette.success.main, 0.2),
              borderRadius: 1,
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                width: `${displayValue}%`, 
                height: '100%', 
                backgroundColor: theme.palette.success.main,
                transition: 'width 0.3s ease'
              }} />
            </Box>
            <Typography variant="caption" sx={{ minWidth: 40 }}>
              {displayValue.toFixed(1)}%
            </Typography>
          </Box>
        );
      }
    }
  ];



  const detailTypeQualityColumns: GridColDef[] = [
    { 
      field: 'type_description', 
      headerName: 'Inventory Type', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        const typeValue = params.value || 'N/A';
        let color = 'secondary';
        
        // Color coding for different inventory types
        switch (typeValue) {
          case 'Finished':
            color = 'success';
            break;
          case 'Work in Process':
            color = 'warning';
            break;
          case 'Master':
            color = 'primary';
            break;
          case 'Drop':
            color = 'error';
            break;
          case 'Reject':
            color = 'error';
            break;
          case 'Scrap':
            color = 'error';
            break;
          default:
            color = 'secondary';
        }
        
        return (
          <Chip 
            label={typeValue} 
            color={color as 'success' | 'warning' | 'primary' | 'error' | 'secondary'}
            variant="filled"
            size="small"
            sx={{
              fontWeight: 600
            }}
          />
        );
      }
    },
    { 
      field: 'quality_description', 
      headerName: 'Quality', 
      flex: 1.5,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value || 'N/A'} 
          color="info" 
          variant="filled"
          size="small"
          sx={{
            backgroundColor: theme.palette.info.main,
            color: theme.palette.info.contrastText,
            fontWeight: 600
          }}
        />
      )
    },
    { 
      field: 'total_pieces', 
      headerName: 'Pieces', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        console.log('Type&Quality total_pieces renderCell:', params.value, typeof params.value);
        const value = Number(params.value);
        return (
          <Typography>
            {isNaN(value) ? '0' : value.toLocaleString()}
          </Typography>
        );
      }
    },
    { 
      field: 'total_value', 
      headerName: 'Value', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        console.log('Type&Quality total_value renderCell:', params.value, typeof params.value);
        const value = Number(params.value);
        return (
          <Typography>
            {isNaN(value) ? '$0' : `$${value.toLocaleString()}`}
          </Typography>
        );
      }
    },
    { 
      field: 'pieces_percentage', 
      headerName: 'Pieces %', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        console.log('pieces_percentage renderCell:', params.value, typeof params.value);
        const value = Number(params.value);
        const displayValue = isNaN(value) ? 0 : value;
        return (
          <Box sx={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center',
            gap: 1
          }}>
            <Box sx={{ 
              width: '60%', 
              height: 8, 
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
              borderRadius: 1,
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                width: `${Math.min(displayValue, 100)}%`, 
                height: '100%', 
                backgroundColor: theme.palette.primary.main,
                transition: 'width 0.3s ease'
              }} />
            </Box>
            <Typography variant="caption" sx={{ minWidth: 40 }}>
              {displayValue.toFixed(2)}%
            </Typography>
          </Box>
        );
      }
    },
    { 
      field: 'value_percentage', 
      headerName: 'Value %', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        console.log('value_percentage renderCell:', params.value, typeof params.value);
        const value = Number(params.value);
        const displayValue = isNaN(value) ? 0 : value;
        return (
          <Box sx={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center',
            gap: 1
          }}>
            <Box sx={{ 
              width: '60%', 
              height: 8, 
              backgroundColor: alpha(theme.palette.success.main, 0.2),
              borderRadius: 1,
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                width: `${Math.min(displayValue, 100)}%`, 
                height: '100%', 
                backgroundColor: theme.palette.success.main,
                transition: 'width 0.3s ease'
              }} />
            </Box>
            <Typography variant="caption" sx={{ minWidth: 40 }}>
              {displayValue.toFixed(2)}%
            </Typography>
          </Box>
        );
      }
    }
  ];

  const handleFilterChange = (filterModel: GridFilterModel) => {
    if (filterModel.items.length > 0) {
      const filteredRows = inventoryData.filter((item) =>
        filterModel.items.every((filter) => {
          if (!filter.value) return true;
          const fieldValue = String(item[filter.field as keyof InventoryAnalysis]).toLowerCase();
          return fieldValue.includes(filter.value.toLowerCase());
        })
      );
      setFilteredData(filteredRows);
    } else {
      setFilteredData(inventoryData);
    }
  };

  const exportToExcel = (data: InventoryAnalysis[] | InventoryDetailTypeQuality[], fileName: string) => {
    const exportData = data.map(item => {
      // Check if this is InventoryAnalysis or InventoryDetailTypeQuality
      if ('total_weight' in item) {
        // InventoryAnalysis data
        const baseData = {
          'Form': item.prd_frm,
          'Total Weight': item.total_weight,
          'Cost Pool Total': item.cost_pool_total,
          'Weight %': `${item.weight_percentage?.toFixed(2) || '0'}%`,
          'Cost Pool %': `${item.cost_pool_percentage?.toFixed(2) || '0'}%`
        };

        return {
          ...baseData,
          'Warehouses': 'warehouses' in item && item.warehouses ? item.warehouses.join(', ') : 'No warehouse data'
        };
      } else {
        // InventoryDetailTypeQuality data
        return {
          'Form': item.prd_frm,
          'On Hand Qty': item.total_pieces,
          'On Hand Value': item.total_value,
          'Qty %': `${item.pieces_percentage?.toFixed(2) || '0'}%`,
          'Value %': `${item.value_percentage?.toFixed(2) || '0'}%`,
          'Inventory Type': item.type_description,
          'Quality': item.quality_description
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Analysis');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(blob, `${fileName}.xlsx`);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedForm('');
    setSelectedWarehouse('');
    setDetailTypeQualityData([]);
  };

  // Calculate summary statistics
  const totalWeight = inventoryData.reduce((sum, item) => sum + (item.total_weight || 0), 0);
  const totalCostPool = inventoryData.reduce((sum, item) => sum + (item.cost_pool_total || 0), 0);
  const uniqueForms = new Set(inventoryData.map(item => item.prd_frm)).size;

  return (
    <Box sx={{ height: '100vh', width: '100%', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BarChartIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Analyse Inventory
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Warehouse Filter */}
          <FormControl size="small" sx={{ minWidth: 300 }}>
            <InputLabel id="warehouse-filter-label">Warehouses</InputLabel>
            <Select
              labelId="warehouse-filter-label"
              multiple
              value={selectedWarehouseFilter}
              label="Warehouses"
              onChange={handleWarehouseFilterChange}
              startAdornment={<FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} />}
              renderValue={(selected) => {
                if (selected.length === 0) {
                  return 'All Warehouses';
                }
                if (selected.length === 1) {
                  return selected[0];
                }
                return `${selected.length} warehouses selected`;
              }}
            >
              {availableWarehouses?.map((warehouse) => (
                <MenuItem key={warehouse} value={warehouse}>
                  {warehouse}
                </MenuItem>
              )) || []}
            </Select>
          </FormControl>
          
          {/* Clear Selection Button */}
          {selectedWarehouseFilter.length > 0 && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedWarehouseFilter([])}
              sx={{ ml: 1 }}
            >
              Clear All
            </Button>
          )}

          <IconButton onClick={handleMenuClick}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            <MenuItem onClick={() => { exportToExcel(inventoryData, 'Full_Inventory_Analysis'); handleMenuClose(); }}>
              Download Full Analysis
            </MenuItem>
            <MenuItem onClick={() => { exportToExcel(filteredData, 'Filtered_Inventory_Analysis'); handleMenuClose(); }}>
              Download Filtered Analysis
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1, p: 2 }}>
          <CardContent sx={{ textAlign: 'center', p: '8px !important' }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
              {totalWeight.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Weight
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, p: 2 }}>
          <CardContent sx={{ textAlign: 'center', p: '8px !important' }}>
            <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
              ${totalCostPool.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Cost Pool
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, p: 2 }}>
          <CardContent sx={{ textAlign: 'center', p: '8px !important' }}>
            <Typography variant="h6" color="info.main" sx={{ fontWeight: 600 }}>
              {uniqueForms}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unique Forms
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, p: 2 }}>
          <CardContent sx={{ textAlign: 'center', p: '8px !important' }}>
            <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600 }}>
              {inventoryData.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Records
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Main Data Grid */}
      <Box sx={{ height: 'calc(100vh - 280px)' }}>
        <DataGrid
          rows={filteredData.map((item, index) => ({ id: index, ...item }))}
          columns={columns}
          loading={loading}
          slots={{ toolbar: GridToolbar }}
          onFilterModelChange={handleFilterChange}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          onRowClick={handleRowClick}
          sx={{
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05)
              }
            }
          }}
        />
      </Box>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetailDialog}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InventoryIcon color="primary" />
            <Typography variant="h6">
              Inventory Details by Type & Quality - {selectedForm}
              {selectedWarehouse && ` (${selectedWarehouse})`}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ height: 400 }}>
            <DataGrid
              rows={detailTypeQualityData.map((item, index) => ({ id: index, ...item }))}
              columns={detailTypeQualityColumns}
              loading={detailLoading}
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[10, 25, 50]}
              autoHeight
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailDialog}>Close</Button>
          <Button 
            onClick={() => {
              exportToExcel(detailTypeQualityData, `Detail_TypeQuality_${selectedForm}`);
            }}
            variant="contained"
          >
            Export Type & Quality Details
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnalyseInventoryPage;
