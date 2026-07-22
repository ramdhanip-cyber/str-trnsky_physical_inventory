import React, { useCallback, useEffect, useState } from "react";
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
  VisibilityOff as VisibilityOffIcon,
  Badge as BadgeIcon
} from "@mui/icons-material";
import { styled } from '@mui/material/styles';

// Brand + design tokens
const BRAND_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
  'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)',
  'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
  'linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%)',
];

const getAvatarGradient = (seed: number) =>
  AVATAR_GRADIENTS[Math.abs(seed) % AVATAR_GRADIENTS.length];

// Styled components for better customization
const StyledCard = styled(Card)(() => ({
  borderRadius: '16px',
  border: '1px solid rgba(12,44,72,0.06)',
  boxShadow: '0 6px 24px 0 rgba(12,44,72,0.06)',
  transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
  '&:hover': {
    boxShadow: '0 12px 34px 0 rgba(12,44,72,0.10)'
  }
}));

const StatCard = styled(Card)(() => ({
  borderRadius: '16px',
  border: '1px solid rgba(12,44,72,0.06)',
  boxShadow: '0 6px 24px 0 rgba(12,44,72,0.05)',
  height: '100%',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 14px 32px 0 rgba(12,44,72,0.12)'
  }
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  transition: 'background-color 0.2s ease',
  '&:nth-of-type(odd)': {
    backgroundColor: 'rgba(12,44,72,0.02)',
  },
  '&:hover': {
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

const emptyErrors: FormErrors = {
  user_name: "",
  full_name: "",
  password: "",
  confirmPassword: ""
};

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
  const [errors, setErrors] = useState<FormErrors>(emptyErrors);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning"
  });

  const showSnackbar = useCallback((message: string, severity: "success" | "error" | "info" | "warning") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: unknown }).response === "object"
    ) {
      const response = (error as { response?: { data?: { message?: string } } }).response;
      return response?.data?.message || fallback;
    }
    return fallback;
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await servicesAPI.getUsers();
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch {
      showSnackbar("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...users];

    if (searchTerm.trim() !== '') {
      result = result.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

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
    setPage(0);
  }, [searchTerm, users, sortConfig]);

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
    setErrors(emptyErrors);
  };

  const validateForm = () => {
    let valid = true;
    const newErrors: FormErrors = { ...emptyErrors };

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

  const validateEditForm = () => {
    if (!editUser) return false;
    let valid = true;
    const newErrors: FormErrors = { ...emptyErrors };

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
    } catch (error: unknown) {
      showSnackbar(getApiErrorMessage(error, "An error occurred while creating the user."), "error");
    }
  };

  const handleEditUser = async () => {
    if (!editUser || !validateEditForm()) return;

    try {
      await servicesAPI.updateUser(editUser.user_id.toString(), {
        user_name: editUser.user_name,
        full_name: editUser.full_name,
        ...(editUser.password ? { password: editUser.password } : {})
      });
      showSnackbar("User updated successfully!", "success");
      fetchUsers();
      setEditDialogOpen(false);
      setEditUser(null);
      setErrors(emptyErrors);
    } catch (error: unknown) {
      showSnackbar(getApiErrorMessage(error, "Failed to update user"), "error");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await servicesAPI.deleteUser(userToDelete.toString());
      showSnackbar("User deleted successfully!", "success");
      fetchUsers();
    } catch (error: unknown) {
      showSnackbar(getApiErrorMessage(error, "Failed to delete user"), "error");
    } finally {
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Hero Header */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '20px',
          mb: 3,
          px: isMobile ? 2.5 : 4,
          py: isMobile ? 3 : 3.5,
          background: BRAND_GRADIENT,
          color: '#fff',
          boxShadow: '0 14px 40px 0 rgba(12,44,72,0.30)'
        }}
      >
        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', bottom: -80, right: 120, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <Box sx={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2.5 : 0
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                width: 56,
                height: 56,
                backdropFilter: 'blur(6px)'
              }}
            >
              <PeopleIcon sx={{ fontSize: 30, color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.15 }}>
                User Management
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
                Manage user accounts with better visibility and faster actions
              </Typography>
            </Box>
          </Box>

          <Box sx={{
            display: 'flex',
            gap: 1.5,
            width: isMobile ? '100%' : 'auto',
            flexShrink: 0
          }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchUsers}
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.5)',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flex: isMobile ? 1 : 'none',
                flexShrink: 0,
                px: 2,
                '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' }
              }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{
                backgroundColor: '#fff',
                color: theme.palette.primary.main,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                flex: isMobile ? 1 : 'none',
                flexShrink: 0,
                px: 2.5,
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
              }}
            >
              Add User
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Stats Strip */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ background: BRAND_GRADIENT, width: 48, height: 48 }}>
                <PeopleIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ color: theme.palette.primary.main, lineHeight: 1 }}>
                  {users.length.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">Total Users</Typography>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', width: 48, height: 48 }}>
                <SearchIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ color: theme.palette.primary.main, lineHeight: 1 }}>
                  {filteredUsers.length.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm ? 'Matching Search' : 'Currently Showing'}
                </Typography>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ background: 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)', width: 48, height: 48 }}>
                <BadgeIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ color: theme.palette.primary.main, lineHeight: 1.1 }}>
                  {searchTerm ? 'Filtered' : 'All Records'}
                </Typography>
                <Typography variant="body2" color="text.secondary">Search Mode</Typography>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Search */}
      <StyledCard sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search by name or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: {
                backgroundColor: theme.palette.background.paper,
                borderRadius: '12px'
              }
            }}
          />
        </CardContent>
      </StyledCard>

      {/* Users Table */}
      <StyledCard>
        {loading && <LinearProgress />}
        <TableContainer component={Paper} sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'none' }}>
          <Table>
            <TableHead sx={{
              background: 'linear-gradient(180deg, rgba(12,44,72,0.06) 0%, rgba(12,44,72,0.03) 100%)'
            }}>
              <TableRow>
                <TableCell width="60px" sx={{ borderBottom: '2px solid rgba(12,44,72,0.10)' }}></TableCell>
                <TableCell
                  onClick={() => setSortConfig({
                    key: 'full_name',
                    direction: sortConfig?.key === 'full_name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                  })}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem',
                    borderBottom: '2px solid rgba(12,44,72,0.10)',
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
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem',
                    borderBottom: '2px solid rgba(12,44,72,0.10)',
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
                <TableCell
                  onClick={() => setSortConfig({
                    key: 'user_id',
                    direction: sortConfig?.key === 'user_id' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                  })}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem',
                    borderBottom: '2px solid rgba(12,44,72,0.10)',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    }
                  }}
                >
                  <Box display="flex" alignItems="center">
                    User ID
                    {sortConfig?.key === 'user_id' && (
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.primary.main, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem', borderBottom: '2px solid rgba(12,44,72,0.10)' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <StyledTableRow key={index}>
                    <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" width="50%" /></TableCell>
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
                            background: getAvatarGradient(user.user_id),
                            width: 42,
                            height: 42,
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#fff',
                            boxShadow: '0 3px 10px rgba(12,44,72,0.20)'
                          }}
                        >
                          {user.full_name.charAt(0).toUpperCase()}
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600} sx={{ color: theme.palette.primary.main }}>{user.full_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            px: 1.25,
                            py: 0.35,
                            borderRadius: '8px',
                            backgroundColor: 'rgba(12,44,72,0.06)',
                            color: theme.palette.text.secondary,
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          {user.user_name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">#{user.user_id}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Edit">
                          <IconButton
                            color="primary"
                            size="small"
                            sx={{
                              mr: 1,
                              backgroundColor: 'rgba(12,44,72,0.06)',
                              '&:hover': { backgroundColor: 'rgba(12,44,72,0.14)' }
                            }}
                            onClick={() => {
                              setEditUser({
                                user_id: user.user_id,
                                user_name: user.user_name,
                                full_name: user.full_name,
                                password: "",
                                confirmPassword: ""
                              });
                              setEditDialogOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(211,47,47,0.08)',
                              '&:hover': { backgroundColor: 'rgba(211,47,47,0.18)' }
                            }}
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
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1.5
                    }}>
                      <Avatar sx={{ bgcolor: 'rgba(12,44,72,0.06)', width: 64, height: 64 }}>
                        <PeopleIcon sx={{ fontSize: 34, color: theme.palette.primary.main, opacity: 0.6 }} />
                      </Avatar>
                      <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.primary.main }}>
                        No users found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm ? 'Try adjusting your search terms' : 'Add a user to get started'}
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
          setErrors(emptyErrors);
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
              setErrors(emptyErrors);
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
