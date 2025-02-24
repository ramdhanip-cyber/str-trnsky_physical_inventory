import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DataGrid, GridColDef, GridToolbar, GridFilterModel } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem, Typography, Box } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Item {
  prd_frm: string;
  prd_grd: string;
  prd_size: string;
  prd_itm_ctl_no: string;
  prd_cmpy_id: string;
  prd_fnsh: string;
  prd_fc_wdth: string;
  prd_brh: string;
}

const ItemsPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get('http://localhost:5000/services/items');
        setItems(response.data.Data);
      } catch (err) {
        setError('Failed to fetch items');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const columns: GridColDef[] = [
    { field: 'prd_frm', headerName: 'Form', flex: 1 },
    { field: 'prd_grd', headerName: 'Grade', flex: 1 },
    { field: 'prd_size', headerName: 'Size', flex: 1 },
    { field: 'prd_itm_ctl_no', headerName: 'Control No', flex: 1 },
    { field: 'prd_cmpy_id', headerName: 'Company ID', flex: 1 },
    { field: 'prd_fnsh', headerName: 'Finish', flex: 1 },
    { field: 'prd_fc_wdth', headerName: 'External Finish', flex: 1 },
    { field: 'prd_brh', headerName: 'Branch', flex: 1 },
  ];

  const handleFilterChange = (filterModel: GridFilterModel) => {
    if (filterModel.items.length > 0) {
      const filteredRows = items.filter((item) =>
        filterModel.items.every((filter) => {
          if (!filter.value) return true;
          const fieldValue = String(item[filter.field as keyof Item]).toLowerCase();
          return fieldValue.includes(filter.value.toLowerCase());
        })
      );
      setFilteredItems(filteredRows);
    } else {
      setFilteredItems(items);
    }
  };

  const exportToExcel = (data: Item[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

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

  return (
    <Box sx={{ height: 600, width: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Product List</Typography>

        {/* Three-Dot Menu */}
        <IconButton onClick={handleMenuClick}>
          <MoreVertIcon />
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
          <MenuItem onClick={() => { exportToExcel(items, 'Full_Products'); handleMenuClose(); }}>
            Download Full Items
          </MenuItem>
          <MenuItem onClick={() => { exportToExcel(filteredItems, 'Filtered_Products'); handleMenuClose(); }}>
            Download Filtered Items
          </MenuItem>
        </Menu>
      </Box>

      {error && <Typography color="error">{error}</Typography>}

      <DataGrid
        rows={items.map((item, index) => ({ id: index, ...item }))}
        columns={columns}
        pageSize={10}
        loading={loading}
        autoHeight
        components={{ Toolbar: GridToolbar }}
        onFilterModelChange={handleFilterChange}
      />
    </Box>
  );
};

export default ItemsPage;
