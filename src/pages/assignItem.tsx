import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  CircularProgress,
  Typography,
  Box,
  Checkbox,
  ListItemText,
  Alert,
  Paper,
  Tooltip,
  IconButton,
  Avatar,
  useTheme,
  Autocomplete,
  TextField,
  alpha,
  Grid,
  Stack
} from "@mui/material";
import {
  Close as CloseIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from "@mui/icons-material";
import { servicesAPI } from "../config/api";

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

const AssignItem: React.FC<AssignItemProps> = ({ open, onClose, location_id, onUpdate }) => {
  const theme = useTheme();
  const [formValues, setFormValues] = useState<FormData[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [assignedItems, setAssignedItems] = useState<AssignedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [autocompleteOpen, setAutocompleteOpen] = useState<boolean>(false);

  const filteredFormValues = useMemo(() => {
    if (!searchInput.trim()) {
      return formValues;
    }
    const searchLower = searchInput.toLowerCase();
    return formValues.filter(form => 
      form.prd_frm.toLowerCase().includes(searchLower)
    );
  }, [formValues, searchInput]);

  const selectAll = useMemo(() => {
    return filteredFormValues.length > 0 && 
           filteredFormValues.every(form => selectedItems.includes(form.prd_frm));
  }, [filteredFormValues, selectedItems]);

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
      setSearchInput("");
      setAutocompleteOpen(false);
    }
  }, [open, location_id]);

  const handleSelectChange = (_event: React.SyntheticEvent, newValue: FormData[]) => {
    setSelectedItems(newValue.map(item => item.prd_frm));
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
  };

  const clearSelection = () => {
    setSelectedItems([]);
    setSearchInput("");
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
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: theme.shadows[10]
        }
      }}
    >
      <DialogTitle sx={{ 
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        color: "white",
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 2.5,
        px: 3,
        boxShadow: theme.shadows[2]
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ 
            bgcolor: 'rgba(255,255,255,0.2)',
            width: 48,
            height: 48
          }}>
            <AssignmentIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="700" sx={{ mb: 0.5 }}>
              Assign Items to Location
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <LocationIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Location ID: {location_id}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Tooltip title="Close">
          <IconButton 
            onClick={onClose} 
            sx={{ 
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.15)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, bgcolor: theme.palette.background.default }}>
        {/* Info Banner */}
        <Box sx={{
          p: 2.5,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <InfoIcon sx={{ color: theme.palette.info.main }} />
                <Box>
                  <Typography variant="body2" fontWeight="500" color="text.primary">
                    Select items from the list below to assign them to this location
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Type to search, use "Select All" for bulk selection, or choose individual items
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper 
                elevation={0}
                sx={{
                  p: 1.5,
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                <Typography variant="h4" fontWeight="700" color="primary">
                  {assignedItems.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Currently Assigned
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Selection Section */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 2.5, 
            mb: 3,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Select Items
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedItems.length > 0 ? `${selectedItems.length} item(s) selected` : 'Search and select items to assign'}
              </Typography>
            </Box>
            {selectedItems.length > 0 && (
              <Chip
                icon={<CheckCircleIcon />}
                label={`${selectedItems.length} Selected`}
                color="primary"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>

          <Autocomplete
            multiple
            fullWidth
            open={autocompleteOpen}
            onOpen={() => setAutocompleteOpen(true)}
            onClose={() => {
              // Always allow closing, except we'll handle Select All clicks separately
              setAutocompleteOpen(false);
            }}
            options={filteredFormValues}
            value={formValues.filter(form => selectedItems.includes(form.prd_frm))}
            onChange={(event, newValue) => {
              handleSelectChange(event, newValue);
            }}
            onInputChange={(_event, newInputValue, reason) => {
              // Always update the search input
              setSearchInput(newInputValue);
              // Keep dropdown open when user is typing
              if (reason === 'input') {
                setAutocompleteOpen(true);
              }
            }}
            inputValue={searchInput}
            getOptionLabel={(option) => option.prd_frm}
            isOptionEqualToValue={(option, value) => option.prd_frm === value.prd_frm}
            loading={loading}
            disableCloseOnSelect
            clearOnBlur={false}
            filterOptions={(options) => options}
            PaperComponent={({ children, ...other }) => (
              <Paper 
                {...other} 
                sx={{ mt: 1, boxShadow: theme.shadows[8], borderRadius: 2 }}
                onClick={(e) => {
                  // Prevent clicks inside Paper from closing dropdown
                  e.stopPropagation();
                }}
              >
                {/* Select All Header */}
                <Box
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSelectAll();
                    // Force dropdown to stay open
                    setTimeout(() => {
                      setAutocompleteOpen(true);
                    }, 0);
                  }}
                  onMouseDown={(e) => {
                    // Prevent focus loss
                    e.preventDefault();
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2.5,
                    py: 1.75,
                    cursor: 'pointer',
                    borderBottom: `2px solid ${theme.palette.divider}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1)
                    }
                  }}
                >
                  <Checkbox 
                    checked={selectAll}
                    indeterminate={selectedItems.length > 0 && selectedItems.length < filteredFormValues.length}
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
                      fontWeight: 600 
                    }}
                  />
                  {selectedItems.length > 0 && (
                    <Chip
                      label={selectedItems.length}
                      size="small"
                      color="primary"
                      sx={{ ml: 'auto', fontWeight: 600 }}
                    />
                  )}
                </Box>
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" p={3} gap={2}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">
                      Loading items...
                    </Typography>
                  </Box>
                ) : filteredFormValues.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <SearchIcon sx={{ fontSize: 40, color: theme.palette.text.disabled, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      No items found
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Try adjusting your search terms
                    </Typography>
                  </Box>
                ) : (
                  children
                )}
              </Paper>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Items"
                placeholder="Type to search items..."
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                        <SearchIcon sx={{ color: theme.palette.action.active }} />
                      </Box>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                inputProps={{
                  ...params.inputProps,
                  autoComplete: 'off',
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      }
                    },
                    '& .MuiOutlinedInput-input': {
                      cursor: 'text',
                    }
                  }
                }}
              />
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.prd_frm} style={{ listStyle: 'none' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.05)
                    }
                  }}
                >
                  <Checkbox
                    checked={selected}
                    sx={{
                      '&.Mui-checked': {
                        color: theme.palette.primary.main
                      }
                    }}
                  />
                  <ListItemText 
                    primary={option.prd_frm} 
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      fontWeight: selected ? 600 : 400
                    }}
                  />
                  {selected && (
                    <CheckCircleIcon 
                      sx={{ 
                        color: theme.palette.success.main,
                        fontSize: 20,
                        ml: 'auto'
                      }} 
                    />
                  )}
                </Box>
              </li>
            )}
            renderTags={(selected, getTagProps) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                {selected.length === 0 ? (
                  <Chip
                    label="No items selected"
                    size="small"
                    variant="outlined"
                    sx={{ 
                      borderStyle: 'dashed',
                      color: theme.palette.text.secondary
                    }}
                  />
                ) : (
                  selected.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.prd_frm}
                      label={option.prd_frm}
                      color="primary"
                      size="medium"
                      onDelete={() => {
                        setSelectedItems(selectedItems.filter(item => item !== option.prd_frm));
                      }}
                      deleteIcon={
                        <Tooltip title="Remove">
                          <CloseIcon fontSize="small" />
                        </Tooltip>
                      }
                      icon={<CheckCircleIcon />}
                      sx={{
                        fontWeight: 600,
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
            ListboxProps={{
              style: {
                maxHeight: 300,
              },
            }}
          />
        </Paper>

        {error && (
          <Alert 
            severity={error.includes('Successfully') || error.includes('already assigned') ? "info" : "error"}
            sx={{ mb: 3, borderRadius: 2 }} 
            onClose={() => setError("")}
            icon={error.includes('Successfully') ? <CheckCircleIcon /> : undefined}
          >
            {error}
          </Alert>
        )}

        {/* Assigned Items Section */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 2.5,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 2 
          }}>
            <Box>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Currently Assigned Items
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {assignedItems.length > 0 
                  ? `${assignedItems.length} item(s) assigned to this location`
                  : 'No items have been assigned yet'
                }
              </Typography>
            </Box>
            {assignedItems.length > 0 && (
              <Tooltip title="Remove all assigned items">
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleDeleteAll}
                  disabled={loading}
                  startIcon={<DeleteIcon />}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Remove All
                </Button>
              </Tooltip>
            )}
          </Box>
          
          {assignedItems.length === 0 ? (
            <Paper 
              elevation={0} 
              sx={{ 
                p: 4, 
                textAlign: 'center', 
                bgcolor: alpha(theme.palette.info.main, 0.05),
                borderRadius: 2,
                border: `2px dashed ${alpha(theme.palette.info.main, 0.3)}`
              }}
            >
              <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                <Avatar sx={{ 
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  width: 64,
                  height: 64,
                  mb: 1
                }}>
                  <AssignmentIcon sx={{ fontSize: 32, color: theme.palette.info.main }} />
                </Avatar>
                <Typography variant="body1" fontWeight="500" color="text.primary">
                  No items assigned yet
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 300 }}>
                  Select items from the search field above and click "Assign Items" to add them to this location
                </Typography>
              </Box>
            </Paper>
          ) : (
            <Box 
              sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1.5,
                p: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
              }}
            >
              {assignedItems.map((item) => (
                <Chip
                  key={item.id}
                  label={item.item_name}
                  onDelete={() => handleDelete(item.id)}
                  deleteIcon={
                    <Tooltip title="Remove from location">
                      <CloseIcon fontSize="small" />
                    </Tooltip>
                  }
                  color="primary"
                  variant="outlined"
                  icon={<CheckCircleIcon />}
                  sx={{
                    fontWeight: 600,
                    py: 2.5,
                    '& .MuiChip-label': {
                      px: 1.5
                    },
                    '& .MuiChip-deleteIcon': {
                      color: theme.palette.error.main,
                      fontSize: 18,
                      '&:hover': {
                        color: theme.palette.error.dark
                      }
                    },
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[2]
                    }
                  }}
                />
              ))}
            </Box>
          )}
        </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        borderTop: `1px solid ${theme.palette.divider}`,
        justifyContent: 'space-between',
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(10px)'
      }}>
        <Stack direction="row" spacing={1.5}>
          <Button
            onClick={clearSelection}
            disabled={selectedItems.length === 0 || loading}
            variant="outlined"
            color="secondary"
            startIcon={<ClearIcon />}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3
            }}
          >
            Clear Selection
          </Button>
          <Button
            onClick={onClose}
            variant="outlined"
            color="secondary"
            disabled={loading}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3
            }}
          >
            Cancel
          </Button>
        </Stack>
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
            minWidth: 180,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            px: 4,
            py: 1.25,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.5)}`,
              transform: 'translateY(-2px)',
            },
            '&:disabled': {
              background: theme.palette.action.disabledBackground,
              boxShadow: 'none'
            },
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? 'Assigning...' : `Assign ${selectedItems.length > 0 ? `${selectedItems.length} ` : ''}Items`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignItem;