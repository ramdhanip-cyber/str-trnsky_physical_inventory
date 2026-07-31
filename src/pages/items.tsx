import React, { useEffect, useMemo, useState } from 'react';
import { servicesAPI } from '../config/api';
import {
  DataGrid,
  GridColDef,
  GridToolbar,
  GridFilterModel,
  GridRowParams,
  GridRenderCellParams,
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
  SelectChangeEvent,
  Avatar,
  Paper,
  Tooltip,
  Grid,
  Alert,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import InventoryIcon from '@mui/icons-material/Inventory';
import FilterListIcon from '@mui/icons-material/FilterList';
import ScaleIcon from '@mui/icons-material/Scale';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CategoryIcon from '@mui/icons-material/Category';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import RefreshIcon from '@mui/icons-material/Refresh';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const BRAND = '#0C2C48';
const BRAND_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';
const WEIGHT_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';
const COST_GRADIENT = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
const FORMS_GRADIENT = 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)';
const RECORDS_GRADIENT = 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)';

const SKEU_BG = '#e8eef4';
const SKEU_LIGHT = '#ffffff';
const SKEU_DARK = '#c5d0db';
const skeuRaised = (size = 7) =>
  `${size}px ${size}px ${size * 2}px ${SKEU_DARK}, -${size}px -${size}px ${size * 2}px ${SKEU_LIGHT}`;
const skeuInset = (size = 4) =>
  `inset ${size}px ${size}px ${size * 2}px ${SKEU_DARK}, inset -${size}px -${size}px ${size * 2}px ${SKEU_LIGHT}`;

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

  const [availableWarehouses, setAvailableWarehouses] = useState<string[]>([]);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string[]>([]);

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
          size="small"
          sx={{
            background: BRAND_GRADIENT,
            color: '#fff',
            fontWeight: 700,
            boxShadow: `2px 2px 5px ${SKEU_DARK}`,
          }}
        />
      ),
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleWarehouseClick(form, warehouse);
                }}
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: BRAND,
                  background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})`,
                  boxShadow: skeuRaised(3),
                  border: 'none',
                  '&:hover': {
                    background: BRAND_GRADIENT,
                    color: '#fff',
                  },
                }}
              />
            ))}
          </Box>
        );
      },
    },
    {
      field: 'total_weight',
      headerName: 'Total Weight',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        const value = Number(params.value);
        return (
          <Typography fontWeight={600} sx={{ color: BRAND }}>
            {isNaN(value) ? '0' : value.toLocaleString()}
          </Typography>
        );
      },
    },
    {
      field: 'cost_pool_total',
      headerName: 'Cost Pool Total',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        const value = Number(params.value);
        return (
          <Typography fontWeight={600} sx={{ color: theme.palette.success.dark }}>
            {isNaN(value) ? '$0' : `$${value.toLocaleString()}`}
          </Typography>
        );
      },
    },
    {
      field: 'weight_percentage',
      headerName: 'Weight %',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        const value = Number(params.value);
        const displayValue = isNaN(value) ? 0 : value;
        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: '60%',
                height: 8,
                background: SKEU_BG,
                boxShadow: skeuInset(2),
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${Math.min(displayValue, 100)}%`,
                  height: '100%',
                  background: BRAND_GRADIENT,
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
            <Typography variant="caption" fontWeight={700} sx={{ minWidth: 40, color: BRAND }}>
              {displayValue.toFixed(1)}%
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'cost_pool_percentage',
      headerName: 'Cost Pool %',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        const value = Number(params.value);
        const displayValue = isNaN(value) ? 0 : value;
        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: '60%',
                height: 8,
                background: SKEU_BG,
                boxShadow: skeuInset(2),
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${Math.min(displayValue, 100)}%`,
                  height: '100%',
                  background: COST_GRADIENT,
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
            <Typography variant="caption" fontWeight={700} sx={{ minWidth: 40, color: theme.palette.success.dark }}>
              {displayValue.toFixed(1)}%
            </Typography>
          </Box>
        );
      },
    },
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
  const uniqueForms = new Set(inventoryData.map((item) => item.prd_frm)).size;

  const topFormByWeight = useMemo(() => {
    if (inventoryData.length === 0) return null;
    return [...inventoryData].sort((a, b) => (b.total_weight || 0) - (a.total_weight || 0))[0];
  }, [inventoryData]);

  const stats = [
    {
      label: 'Total Weight',
      value: totalWeight.toLocaleString(),
      grad: WEIGHT_GRADIENT,
      icon: <ScaleIcon />,
    },
    {
      label: 'Total Cost Pool',
      value: `$${totalCostPool.toLocaleString()}`,
      grad: COST_GRADIENT,
      icon: <AttachMoneyIcon />,
    },
    {
      label: 'Unique Forms',
      value: String(uniqueForms),
      grad: FORMS_GRADIENT,
      icon: <CategoryIcon />,
    },
    {
      label: 'Total Records',
      value: String(inventoryData.length),
      grad: RECORDS_GRADIENT,
      icon: <AssessmentIcon />,
    },
  ];

  return (
    <Box sx={{ width: '100%', p: 3, bgcolor: SKEU_BG, minHeight: 'calc(100vh - 112px)' }}>
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
              <BarChartIcon sx={{ fontSize: 30, color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.15 }}>
                Analyse Inventory
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
                Weight and cost-pool analysis by form — click a row to drill into type & quality
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
            <Tooltip title="Refresh analysis">
              <IconButton
                onClick={fetchInventoryAnalysis}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  borderRadius: 2.5,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleMenuClick}
              sx={{
                bgcolor: '#fff',
                color: BRAND,
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '10px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              }}
            >
              Export
            </Button>
            <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose} PaperProps={{ sx: { borderRadius: 2, mt: 1 } }}>
              <MenuItem
                onClick={() => {
                  exportToExcel(inventoryData, 'Full_Inventory_Analysis');
                  handleMenuClose();
                }}
              >
                Download Full Analysis
              </MenuItem>
              <MenuItem
                onClick={() => {
                  exportToExcel(filteredData, 'Filtered_Inventory_Analysis');
                  handleMenuClose();
                }}
              >
                Download Filtered Analysis
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {stats.map((stat) => (
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

      {topFormByWeight && (
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
            <InventoryIcon fontSize="small" />
          </Avatar>
          <Box flex={1} minWidth={200}>
            <Typography variant="caption" sx={{ color: alpha(BRAND, 0.55), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Top form by weight
            </Typography>
            <Typography fontWeight={800} sx={{ color: BRAND }}>
              {topFormByWeight.prd_frm}{' '}
              <Typography component="span" variant="body2" sx={{ color: alpha(BRAND, 0.6), fontWeight: 600 }}>
                — {Number(topFormByWeight.total_weight || 0).toLocaleString()} wt · $
                {Number(topFormByWeight.cost_pool_total || 0).toLocaleString()} ·{' '}
                {Number(topFormByWeight.weight_percentage || 0).toFixed(1)}% of weight pool
              </Typography>
            </Typography>
          </Box>
          <Chip
            label="Click grid rows to drill down"
            size="small"
            sx={{ fontWeight: 600, color: BRAND, bgcolor: alpha(BRAND, 0.08) }}
          />
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1.5,
          }}
        >
          <FormControl size="small" sx={{ minWidth: { sm: 260 }, maxWidth: 360, flex: 1 }}>
            <InputLabel sx={{ color: alpha(BRAND, 0.55), '&.Mui-focused': { color: BRAND } }}>
              Warehouses
            </InputLabel>
            <Select
              labelId="warehouse-filter-label"
              multiple
              value={selectedWarehouseFilter}
              label="Warehouses"
              onChange={handleWarehouseFilterChange}
              startAdornment={
                <FilterListIcon sx={{ mr: 1, color: alpha(BRAND, 0.5), fontSize: 20 }} />
              }
              renderValue={(selected) => {
                if (selected.length === 0) return 'All Warehouses';
                if (selected.length === 1) return selected[0];
                return `${selected.length} warehouses selected`;
              }}
              sx={{
                height: 40,
                borderRadius: 3,
                background: SKEU_BG,
                boxShadow: skeuInset(4),
                '& fieldset': { border: 'none' },
                '&.Mui-focused': {
                  boxShadow: `${skeuInset(4)}, 0 0 0 2px ${alpha(BRAND, 0.18)}`,
                },
              }}
            >
              {availableWarehouses?.map((warehouse) => (
                <MenuItem key={warehouse} value={warehouse}>
                  {warehouse}
                </MenuItem>
              )) || []}
            </Select>
          </FormControl>

          {selectedWarehouseFilter.length > 0 && (
            <Button
              size="small"
              onClick={() => setSelectedWarehouseFilter([])}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                color: BRAND,
                borderRadius: 2.5,
                height: 40,
                px: 2,
                background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})`,
                boxShadow: skeuRaised(3),
                '&:hover': { background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})` },
              }}
            >
              Clear filters
            </Button>
          )}

          <Typography variant="body2" sx={{ color: alpha(BRAND, 0.55), fontWeight: 700, ml: { sm: 'auto' } }}>
            Showing {filteredData.length} of {inventoryData.length} form{inventoryData.length === 1 ? '' : 's'}
          </Typography>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Data grid */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '18px',
          border: 'none',
          background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
          boxShadow: skeuRaised(8),
          overflow: 'hidden',
          height: { xs: 520, md: 'calc(100vh - 420px)' },
          minHeight: 420,
        }}
      >
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
            border: 'none',
            bgcolor: 'transparent',
            '& .MuiDataGrid-columnHeaders': {
              background: alpha(BRAND, 0.06),
              borderBottom: `1px solid ${alpha(BRAND, 0.1)}`,
              color: BRAND,
              fontWeight: 700,
            },
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: alpha(BRAND, 0.05),
              },
            },
            '& .MuiDataGrid-toolbarContainer': {
              px: 2,
              py: 1.5,
              borderBottom: `1px solid ${alpha(BRAND, 0.08)}`,
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${alpha(BRAND, 0.08)}`,
            },
          }}
        />
      </Paper>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetailDialog}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(12,44,72,0.25)',
          },
        }}
      >
        <DialogTitle
          sx={{
            background: BRAND_GRADIENT,
            color: '#fff',
            py: 2.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.16)' }}>
              <InventoryIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Type & Quality — {selectedForm}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {selectedWarehouse ? (
                  <>
                    <WarehouseIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    {selectedWarehouse}
                  </>
                ) : (
                  'All warehouses for this form'
                )}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: SKEU_BG, pt: 2.5 }}>
          <Box sx={{ height: 420, mt: 1 }}>
            <DataGrid
              rows={detailTypeQualityData.map((item, index) => ({ id: index, ...item }))}
              columns={detailTypeQualityColumns}
              loading={detailLoading}
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[10, 25, 50]}
              sx={{
                border: 'none',
                borderRadius: 2,
                bgcolor: SKEU_LIGHT,
                boxShadow: skeuRaised(4),
                '& .MuiDataGrid-columnHeaders': {
                  background: alpha(BRAND, 0.06),
                  color: BRAND,
                  fontWeight: 700,
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: SKEU_BG }}>
          <Button onClick={handleCloseDetailDialog} sx={{ textTransform: 'none', fontWeight: 600, color: BRAND }}>
            Close
          </Button>
          <Button
            onClick={() => {
              exportToExcel(detailTypeQualityData, `Detail_TypeQuality_${selectedForm}`);
            }}
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              background: BRAND_GRADIENT,
              borderRadius: 2,
              '&:hover': { background: BRAND_GRADIENT, filter: 'brightness(1.05)' },
            }}
          >
            Export details
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnalyseInventoryPage;
