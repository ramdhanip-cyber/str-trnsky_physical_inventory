import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  CircularProgress,
  Divider,
  Typography,
  Box,
  Checkbox,
  ListItemText,
  Alert,
  Paper,
  Tooltip,
  IconButton,
  Avatar,
  Badge,
  useTheme,
  SelectChangeEvent
} from "@mui/material";
import {
  Close as CloseIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon
} from "@mui/icons-material";
import { servicesAPI } from "../config/api";
import { styled } from "@mui/material/styles";

interface AssignItemProps {
  open: boolean;
  onClose: () => void;
  location_id: string;
  onUpdate?: () => Promise<void>; // Add callback for parent update
}

interface FormData {
  prd_frm: string;
}

interface AssignedItem {
  id: number;
  item_name: string;
}

const StyledSelect = styled(Select)(() => ({
  '& .MuiSelect-select': {
    minHeight: '42px',
    display: 'flex',
    alignItems: 'center',
  },
}));

const AssignItem: React.FC<AssignItemProps> = ({ open, onClose, location_id, onUpdate }) => {
  const theme = useTheme();
  const [formValues, setFormValues] = useState<FormData[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [assignedItems, setAssignedItems] = useState<AssignedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [selectAll, setSelectAll] = useState<boolean>(false);

  const filteredFormValues = useMemo(() => {
    return formValues;
  }, [formValues]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('Fetching data for location_id:', location_id);
        
        const [formsResponse, assignedResponse] = await Promise.all([
          servicesAPI.getItems(),
          servicesAPI.getAssignedItems(location_id)
        ]);
        
        console.log('Forms response:', formsResponse);
        console.log('Assigned items response:', assignedResponse);
        
        setFormValues(formsResponse.data.Data || []);
        setAssignedItems(assignedResponse.data.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError("Error fetching data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchData();
      setSelectedItems([]);
      setSelectAll(false);
    }
  }, [open, location_id]);

  useEffect(() => {
    // Update selectAll state when filtered items change
    if (filteredFormValues.length > 0) {
      const allSelected = filteredFormValues.every(form => 
        selectedItems.includes(form.prd_frm)
      );
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  }, [selectedItems, filteredFormValues]);

  const handleSelectChange = (event: SelectChangeEvent<unknown>) => {
    setSelectedItems(event.target.value as string[]);
  };


  const toggleSelectAll = () => {
    if (selectAll) {
      // Deselect all currently visible items
      const newSelected = selectedItems.filter(item => 
        !filteredFormValues.some(form => form.prd_frm === item)
      );
      setSelectedItems(newSelected);
    } else {
      // Select all currently visible items plus keep any existing selections
      const newSelected = [
        ...new Set([
          ...selectedItems,
          ...filteredFormValues.map(form => form.prd_frm)
        ])
      ];
      setSelectedItems(newSelected);
    }
    setSelectAll(!selectAll);
  };

  const clearSelection = () => {
    setSelectedItems([]);
    setSelectAll(false);
  };

  const handleAssign = async () => {
    if (selectedItems.length === 0) {
      setError("Please select at least one item");
      return;
    }

    try {
      setLoading(true);
      const response = await servicesAPI.assignForms({
        location_id,
        items: selectedItems,
      });

      // Handle the response with detailed information
      if (response.data.success) {
        const { alreadyAssigned, newlyAssigned } = response.data;
        
        // Update assigned items list with only newly assigned items
        if (newlyAssigned && newlyAssigned.length > 0) {
          const newAssignedItems = newlyAssigned.map((item: string, index: number) => ({
            id: Date.now() + index,
            item_name: item,
          }));

          setAssignedItems(prev => [...prev, ...newAssignedItems]);
        }

        // Show appropriate message
        if (alreadyAssigned && alreadyAssigned.length > 0 && newlyAssigned && newlyAssigned.length > 0) {
          setError(`Successfully assigned ${newlyAssigned.length} new item(s). ${alreadyAssigned.length} item(s) were already assigned.`);
        } else if (alreadyAssigned && alreadyAssigned.length > 0 && (!newlyAssigned || newlyAssigned.length === 0)) {
          setError(`All selected items are already assigned to this location.`);
        } else {
          setError("");
        }

        clearSelection();
        
        // Update parent component if callback provided
        if (onUpdate) {
          await onUpdate();
        }
        
        onClose();
      }
    } catch (error) {
      console.error('Error assigning items:', error);
      setError("Error assigning items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    try {
      setLoading(true);
      await servicesAPI.deleteAssignedItem(location_id, itemId.toString());

      setAssignedItems(prev => prev.filter(item => item.id !== itemId));
      
      // Update parent component if callback provided
      if (onUpdate) {
        await onUpdate();
      }
    } catch {
      setError("Error deleting item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      await servicesAPI.deleteAssignedLocation(location_id);

      setAssignedItems([]);
      
      // Update parent component if callback provided
      if (onUpdate) {
        await onUpdate();
      }
    } catch {
      setError("Error deleting all items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: theme.palette.primary.main, 
        color: "white",
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 2,
        px: 3
      }}>
        <Box display="flex" alignItems="center">
          <AssignmentIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" fontWeight="600">
            Assign Items to Location
          </Typography>
        </Box>
        <Tooltip title="Close">
          <IconButton 
            onClick={onClose} 
            sx={{ 
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Box mb={3} display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" fontWeight="500" gutterBottom>
              Location ID: <strong>{location_id}</strong>
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Select items to assign to this location
            </Typography>
          </Box>
          <Badge 
            badgeContent={assignedItems.length} 
            color="primary"
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                right: -3,
                top: 13,
                border: `2px solid ${theme.palette.background.paper}`,
                padding: '0 4px',
              },
            }}
          >
            <Avatar sx={{ 
              bgcolor: theme.palette.primary.light,
              width: 40,
              height: 40
            }}>
              <AssignmentIcon fontSize="small" />
            </Avatar>
          </Badge>
        </Box>


        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel shrink>Select Items</InputLabel>
          <StyledSelect
            multiple
            value={selectedItems}
            onChange={handleSelectChange}
            input={<OutlinedInput notched label="Select Items" />}
            renderValue={(selected: unknown) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No items selected
                  </Typography>
                ) : (
                  (selected as string[]).map((value: string) => (
                    <Chip
                      key={value}
                      label={value}
                      color="primary"
                      size="small"
                      onDelete={() => {
                        setSelectedItems(selectedItems.filter(item => item !== value));
                      }}
                      deleteIcon={
                        <Tooltip title="Remove">
                          <CloseIcon fontSize="small" />
                        </Tooltip>
                      }
                      sx={{
                        '& .MuiChip-deleteIcon': {
                          color: theme.palette.error.main,
                          '&:hover': {
                            color: theme.palette.error.dark
                          }
                        },
                      }}
                    />
                  ))
                )}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                },
                sx: {
                  borderRadius: 2,
                  mt: 1,
                  boxShadow: theme.shadows[3]
                }
              },
            }}
          >
            <MenuItem 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSelectAll();
              }}
              sx={{ 
                py: 1,
                '&:hover': {
                  backgroundColor: 'transparent'
                }
              }}
            >
              <Checkbox 
                checked={selectAll}
                indeterminate={selectedItems.length > 0 && !selectAll}
                icon={<SelectAllIcon />}
                checkedIcon={<CheckIcon />}
                sx={{
                  '&.Mui-checked': {
                    color: theme.palette.primary.main
                  }
                }}
              />
              <ListItemText 
                primary={selectAll ? "Deselect All" : "Select All"} 
                primaryTypographyProps={{ 
                  variant: 'body2', 
                  fontWeight: 500 
                }}
              />
              {selectedItems.length > 0 && (
                <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                  {selectedItems.length} selected
                </Typography>
              )}
            </MenuItem>
            <Divider />

            {loading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : filteredFormValues.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="textSecondary">
                  No items found
                </Typography>
              </MenuItem>
            ) : (
              filteredFormValues.map((form, index) => (
                <MenuItem 
                  key={index} 
                  value={form.prd_frm}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.action.selected
                    },
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    }
                  }}
                >
                  <Checkbox 
                    checked={selectedItems.indexOf(form.prd_frm) > -1} 
                    sx={{
                      '&.Mui-checked': {
                        color: theme.palette.primary.main
                      }
                    }}
                  />
                  <ListItemText 
                    primary={form.prd_frm} 
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </MenuItem>
              ))
            )}
          </StyledSelect>
        </FormControl>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }} 
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2 
        }}>
          <Typography variant="h6" fontWeight="500">
            Assigned Items
          </Typography>
          <Box display="flex" alignItems="center">
            <Typography variant="caption" color="textPrimary" sx={{ mr: 1 }}>
              {assignedItems.length} items assigned
            </Typography>
            {assignedItems.length > 0 && (
              <Tooltip title="Remove all items">
                <IconButton
                  size="small"
                  onClick={handleDeleteAll}
                  disabled={loading}
                  sx={{
                    color: theme.palette.error.main,
                    '&:hover': {
                      backgroundColor: theme.palette.error.light
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        
        {assignedItems.length === 0 ? (
          <Paper elevation={0} sx={{ 
            p: 3, 
            textAlign: 'center', 
            bgcolor: theme.palette.background.default,
            borderRadius: 2,
            border: `1px dashed ${theme.palette.divider}`
          }}>
            <Box display="flex" flexDirection="column" alignItems="center">
              <AssignmentIcon 
                fontSize="large" 
                sx={{ 
                  color: theme.palette.text.disabled,
                  mb: 1
                }} 
              />
              <Typography variant="body2" color="textSecondary">
                No items assigned to this location yet
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Select items above and click "Assign Items"
              </Typography>
            </Box>
          </Paper>
        ) : (
          <Paper elevation={0} sx={{ 
            p: 2, 
            bgcolor: theme.palette.background.default,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`
          }}>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {assignedItems.map((item) => (
                <Chip
                  key={item.id}
                  label={item.item_name}
                  onDelete={() => handleDelete(item.id)}
                  deleteIcon={
                    <Tooltip title="Remove">
                      <CloseIcon fontSize="small" />
                    </Tooltip>
                  }
                  color="primary"
                  variant="outlined"
                  sx={{
                    '& .MuiChip-deleteIcon': {
                      color: theme.palette.error.main,
                      '&:hover': {
                        color: theme.palette.error.dark
                      }
                    },
                  }}
                />
              ))}
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        borderTop: `1px solid ${theme.palette.divider}`,
        justifyContent: 'space-between'
      }}>
        <Box>
          <Button
            onClick={clearSelection}
            disabled={selectedItems.length === 0 || loading}
            variant="text"
            color="secondary"
            startIcon={<ClearIcon />}
            sx={{ mr: 1 }}
          >
            Clear
          </Button>
          <Button
            onClick={onClose}
            variant="outlined"
            color="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
        </Box>
        <Button
          onClick={handleAssign}
          color="primary"
          variant="contained"
          disabled={loading || selectedItems.length === 0}
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <AddIcon />
            )
          }
          sx={{
            minWidth: 150,
            '&:hover': {
              boxShadow: theme.shadows[2]
            }
          }}
        >
          {loading ? 'Assigning...' : 'Assign Items'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignItem;