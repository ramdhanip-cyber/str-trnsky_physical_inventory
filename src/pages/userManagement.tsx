import React, { useEffect, useState } from "react";
import { servicesAPI } from "../config/api";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  Tooltip,
  Avatar,
  Skeleton,
  Divider,
  useMediaQuery,
  useTheme,
  Alert,
  Snackbar,
  LinearProgress
} from "@mui/material";
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  PersonAdd as PersonAddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from "@mui/icons-material";
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

interface User {
  user_id: number;
  user_name: string;
  full_name: string;
}

interface EditUserData {
  user_id: number;
  user_name: string;
  full_name: string;
  password?: string;
  confirmPassword?: string;
}

interface NewUserData {
  user_name: string;
  full_name: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  user_name: string;
  full_name: string;
  password: string;
  confirmPassword: string;
}

const UserManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<EditUserData | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState<NewUserData>({
    user_name: "",
    full_name: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState<FormErrors>({
    user_name: "",
    full_name: "",
    password: "",
    confirmPassword: ""
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...users];
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      result = result.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        return 0;
      });
    }
    
    setFilteredUsers(result);
  }, [searchTerm, users, sortConfig]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await servicesAPI.getUsers();
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to fetch users",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const resetForm = () => {
    setNewUser({
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

  const handleCreateUser = async () => {
    try {
      await servicesAPI.createUser({
        user_name: newUser.user_name,
        full_name: newUser.full_name,
        password: newUser.password
      });
      setSnackbar({
        open: true,
        message: "User created successfully!",
        severity: "success"
      });
      fetchUsers();
      setOpenDialog(false);
      resetForm();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to create user",
        severity: "error"
      });
    }
  };

  const handleEditUser = async () => {
    if (!editUser) return;

    try {
      await servicesAPI.updateUser(editUser.user_id.toString(), {
        user_name: editUser.user_name,
        full_name: editUser.full_name,
        ...(editUser.password ? { password: editUser.password } : {})
      });
      setSnackbar({
        open: true,
        message: "User updated successfully!",
        severity: "success"
      });
      fetchUsers();
      setEditDialogOpen(false);
      setEditUser(null);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to update user",
        severity: "error"
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await servicesAPI.deleteUser(userToDelete.toString());
      setSnackbar({
        open: true,
        message: "User deleted successfully!",
        severity: "success"
      });
      fetchUsers();
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to delete user",
        severity: "error"
      });
    }
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
            startIcon={<RefreshIcon />}
            onClick={fetchUsers}
            sx={{ 
              minWidth: isMobile ? 'auto' : 120,
              flex: isMobile ? 1 : 0
            }}
          >
            {isMobile ? <RefreshIcon /> : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ 
              minWidth: isMobile ? 'auto' : 140,
              flex: isMobile ? 1 : 0
            }}
          >
            {isMobile ? <PersonAddIcon /> : 'Add User'}
          </Button>
        </Box>
      </Box>

      {/* Filters Section */}
      <StyledCard sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
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
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  sx: {
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: '12px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1} alignItems="center">
                <PeopleIcon color="action" />
                <Typography variant="body2" color="text.secondary">
                  <strong>{users.length}</strong> users total
                </Typography>
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>{filteredUsers.length}</strong> filtered
                </Typography>
              </Box>
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
                <TableCell 
                  onClick={() => setSortConfig({ 
                    key: 'full_name', 
                    direction: sortConfig?.key === 'full_name' && sortConfig.direction === 'asc' ? 'desc' : 'asc' 
                  })}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    }
                  }}
                >
                  <Box display="flex" alignItems="center">
                    User
                    {sortConfig?.key === 'full_name' && (
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell 
                  onClick={() => setSortConfig({ 
                    key: 'user_name', 
                    direction: sortConfig?.key === 'user_name' && sortConfig.direction === 'asc' ? 'desc' : 'asc' 
                  })}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    }
                  }}
                >
                  <Box display="flex" alignItems="center">
                    Username
                    {sortConfig?.key === 'user_name' && (
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
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
                                setEditDialogOpen(true);
                              }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            color="error"
                            onClick={() => {
                              setUserToDelete(user.user_id);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </StyledTableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Typography variant="body1" color="text.secondary">
                        No users found matching your criteria
                      </Typography>
                      {searchTerm && (
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => setSearchTerm("")}
                          startIcon={<ClearIcon />}
                        >
                          Clear search
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
            <PersonAddIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
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
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
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
            startIcon={<CheckCircleIcon />}
            sx={{ borderRadius: '8px' }}
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => {
          setEditDialogOpen(false);
          setEditUser(null);
        }}
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
            <EditIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            Edit User
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {editUser && (
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
                  value={editUser.password || ""}
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
                          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
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
                  value={editUser.confirmPassword || ""}
                  onChange={(e) => setEditUser({ ...editUser, confirmPassword: e.target.value })}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  sx={{ mb: 1 }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={() => {
              setEditDialogOpen(false);
              setEditUser(null);
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
            startIcon={<CheckCircleIcon />}
            sx={{ borderRadius: '8px' }}
          >
            Update User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
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
            onClick={() => setDeleteConfirmOpen(false)} 
            color="inherit"
            sx={{ borderRadius: '8px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            startIcon={<CancelIcon />}
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