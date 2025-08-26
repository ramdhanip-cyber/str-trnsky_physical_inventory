import React, { useEffect, useState } from "react";
import { servicesAPI } from "../config/api";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  Avatar,
  Skeleton,
  LinearProgress,
  TablePagination,
  useMediaQuery
} from "@mui/material";
import {
  Search,
  Delete,
  Edit,
  Refresh,
  Visibility,
  VisibilityOff,
  PersonAdd,
  CheckCircle,
  Cancel,
  FilterList,
  Clear
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { Snackbar, Alert } from "@mui/material";
import { styled } from '@mui/material/styles';

// Styled components for better customization
const StyledCard = styled(Card)(() => ({
  borderRadius: '12px',
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
  transition: 'box-shadow 0.3s ease-in-out',
  '&:hover': {
    boxShadow: '0 8px 30px 0 rgba(0,0,0,0.1)'
  }
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const StatusChip = styled(Chip)(() => ({
  fontWeight: 500,
  fontSize: '0.75rem',
  borderRadius: '4px'
}));

interface User {
  user_id: number;
  user_name: string;
  full_name: string;
  last_login?: string;
  status?: 'active' | 'inactive';
}

interface EditUserData {
  user_id: number;
  user_name: string;
  full_name: string;
  password?: string;
  confirmPassword?: string;
}

const UserManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [newUser, setNewUser] = useState({
    user_name: "",
    full_name: "",
    password: "",
    confirmPassword: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    user_name: "",
    full_name: "",
    password: "",
    confirmPassword: ""
  });
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editUser, setEditUser] = useState<EditUserData>({
    user_id: 0,
    user_name: "",
    full_name: "",
    password: "",
    confirmPassword: ""
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isFiltered, setIsFiltered] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => {
      const matchesSearch = 
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.user_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
    setFilteredUsers(filtered);
    setIsFiltered(searchTerm !== "" || statusFilter !== "all");
  }, [users, searchTerm, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await servicesAPI.getUsers();
      setUsers(res.data);
    } catch (error) {
      showSnackbar("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error" | "info" | "warning") => {
    setSnackbar({ open: true, message, severity });
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      user_name: "",
      full_name: "",
      password: "",
      confirmPassword: "",
    };

    if (!newUser.user_name.trim()) {
      newErrors.user_name = "Username is required";
      valid = false;
    }

    if (!newUser.full_name.trim()) {
      newErrors.full_name = "Full name is required";
      valid = false;
    }

    if (!newUser.password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (newUser.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    if (newUser.password !== newUser.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    try {
      await servicesAPI.createUser({
        user_name: newUser.user_name,
        full_name: newUser.full_name,
        password: newUser.password
      });
      showSnackbar("User created successfully!", "success");
      fetchUsers();
      setOpenDialog(false);
      resetForm();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.message || "An error occurred while creating the user.",
        "error"
      );
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await servicesAPI.deleteUser(userToDelete.toString());
      showSnackbar("User deleted successfully!", "success");
      fetchUsers();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.message || "Failed to delete user.",
        "error"
      );
    } finally {
      setOpenDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const resetForm = () => {
    setNewUser({
      user_name: "",
      full_name: "",
      password: "",
      confirmPassword: "",
    });
    setErrors({
      user_name: "",
      full_name: "",
      password: "",
      confirmPassword: "",
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never logged in";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const handleEditUser = async () => {
    if (!validateEditForm()) return;
  
    try {
      const payload: any = {
        user_name: editUser.user_name,
        full_name: editUser.full_name,
      };
  
      if (editUser.password) {
        payload.password = editUser.password;
      }
  
      await servicesAPI.updateUser(editUser.user_id.toString(), payload);
      showSnackbar("User updated successfully!", "success");
      fetchUsers();
      setOpenEditDialog(false);
      resetEditForm();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.message || "An error occurred while updating the user.",
        "error"
      );
    }
  };
  
  const validateEditForm = () => {
    let valid = true;
    const newErrors = {
      user_name: "",
      full_name: "",
      password: "",
      confirmPassword: "",
    };
  
    if (!editUser.user_name.trim()) {
      newErrors.user_name = "Username is required";
      valid = false;
    }
  
    if (!editUser.full_name.trim()) {
      newErrors.full_name = "Full name is required";
      valid = false;
    }
  
    if (editUser.password && editUser.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }
  
    if (editUser.password !== editUser.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      valid = false;
    }
  
    setErrors(newErrors);
    return valid;
  };
  
  const resetEditForm = () => {
    setEditUser({
      user_id: 0,
      user_name: "",
      full_name: "",
      password: "",
      confirmPassword: ""
    });
    setErrors({
      user_name: "",
      full_name: "",
      password: "",
      confirmPassword: ""
    });
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setIsFiltered(false);
  };

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header Section */}
      <Box sx={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        mb: 3,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0
      }}>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ color: theme.palette.primary.main }}>
          User Management
        </Typography>
        <Box sx={{ 
          display: 'flex',
          gap: 2,
          width: isMobile ? '100%' : 'auto'
        }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchUsers}
            sx={{ 
              minWidth: isMobile ? 'auto' : 120,
              flex: isMobile ? 1 : 0
            }}
          >
            {isMobile ? <Refresh /> : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAdd />}
            onClick={() => setOpenDialog(true)}
            sx={{ 
              minWidth: isMobile ? 'auto' : 140,
              flex: isMobile ? 1 : 0
            }}
          >
            {isMobile ? <PersonAdd /> : 'Add User'}
          </Button>
        </Box>
      </Box>

      {/* Filters Section */}
      <StyledCard sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: isFiltered && (
                    <InputAdornment position="end">
                      <Tooltip title="Clear filters">
                        <IconButton
                          size="small"
                          onClick={clearFilters}
                        >
                          <Clear fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                  sx: {
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: '8px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                  sx={{
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: '8px'
                  }}
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterList fontSize="small" color="action" />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3} sx={{ textAlign: isMobile ? 'left' : 'right' }}>
              <Typography variant="body2" color="text.secondary">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
                {isFiltered && ' (filtered)'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>

      {/* Users Table */}
      <StyledCard>
        {loading && <LinearProgress />}
        <TableContainer component={Paper} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ 
              backgroundColor: theme.palette.mode === 'dark' ? 
                theme.palette.grey[800] : theme.palette.grey[100] 
            }}>
              <TableRow>
                <TableCell width="60px"></TableCell>
                <TableCell>User</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <StyledTableRow key={index}>
                    <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                    <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                  </StyledTableRow>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <StyledTableRow key={user.user_id} hover>
                      <TableCell>
                        <Avatar 
                          sx={{ 
                            bgcolor: theme.palette.primary.main,
                            width: 40, 
                            height: 40,
                            fontSize: '1rem'
                          }}
                        >
                          {user.full_name.charAt(0).toUpperCase()}
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">{user.full_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {user.user_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(user.last_login)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          label={user.status || "active"}
                          color={user.status === "active" ? "success" : "default"}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Edit">
                          <IconButton 
                            color="primary" 
                            sx={{ mr: 1 }}
                            onClick={() => {
                              const userToEdit = users.find(u => u.user_id === user.user_id);
                              if (userToEdit) {
                                setEditUser({
                                  user_id: userToEdit.user_id,
                                  user_name: userToEdit.user_name,
                                  full_name: userToEdit.full_name,
                                  password: "",
                                  confirmPassword: ""
                                });
                                setOpenEditDialog(true);
                              }
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            color="error"
                            onClick={() => {
                              setUserToDelete(user.user_id);
                              setOpenDeleteDialog(true);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </StyledTableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Typography variant="body1" color="text.secondary">
                        No users found matching your criteria
                      </Typography>
                      {isFiltered && (
                        <Button
                          variant="text"
                          size="small"
                          onClick={clearFilters}
                          startIcon={<Clear />}
                        >
                          Clear filters
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            '& .MuiTablePagination-toolbar': {
              paddingLeft: 2,
              paddingRight: 2
            }
          }}
        />
      </StyledCard>

      {/* Add User Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px'
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: "bold", 
          bgcolor: theme.palette.grey[100],
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Box display="flex" alignItems="center">
            <PersonAdd sx={{ mr: 1, color: theme.palette.primary.main }} />
            Create New User
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username *"
                variant="outlined"
                size="small"
                value={newUser.user_name}
                onChange={(e) => setNewUser({ ...newUser, user_name: e.target.value })}
                error={!!errors.user_name}
                helperText={errors.user_name}
                sx={{ mb: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name *"
                variant="outlined"
                size="small"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                error={!!errors.full_name}
                helperText={errors.full_name}
                sx={{ mb: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password *"
                variant="outlined"
                size="small"
                type={showPassword ? "text" : "password"}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirm Password *"
                variant="outlined"
                size="small"
                type={showPassword ? "text" : "password"}
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                sx={{ mb: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              resetForm();
            }}
            color="inherit"
            sx={{ borderRadius: '8px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            color="primary"
            startIcon={<CheckCircle />}
            sx={{ borderRadius: '8px' }}
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px'
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: "bold", 
          bgcolor: theme.palette.grey[100],
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Box display="flex" alignItems="center">
            <Edit sx={{ mr: 1, color: theme.palette.primary.main }} />
            Edit User
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username *"
                variant="outlined"
                size="small"
                value={editUser.user_name}
                onChange={(e) => setEditUser({ ...editUser, user_name: e.target.value })}
                error={!!errors.user_name}
                helperText={errors.user_name}
                sx={{ mb: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name *"
                variant="outlined"
                size="small"
                value={editUser.full_name}
                onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                error={!!errors.full_name}
                helperText={errors.full_name}
                sx={{ mb: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Leave password fields blank to keep current password
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="New Password"
                variant="outlined"
                size="small"
                type={showPassword ? "text" : "password"}
                value={editUser.password}
                onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirm Password"
                variant="outlined"
                size="small"
                type={showPassword ? "text" : "password"}
                value={editUser.confirmPassword}
                onChange={(e) => setEditUser({ ...editUser, confirmPassword: e.target.value })}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                sx={{ mb: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={() => {
              setOpenEditDialog(false);
              resetEditForm();
            }}
            color="inherit"
            sx={{ borderRadius: '8px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditUser}
            variant="contained"
            color="primary"
            startIcon={<CheckCircle />}
            sx={{ borderRadius: '8px' }}
          >
            Update User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={() => setOpenDeleteDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            padding: '8px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this user? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDeleteDialog(false)} 
            color="inherit"
            sx={{ borderRadius: '8px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            startIcon={<Cancel />}
            sx={{ borderRadius: '8px' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ 
            width: "100%",
            borderRadius: '8px',
            boxShadow: theme.shadows[3]
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;