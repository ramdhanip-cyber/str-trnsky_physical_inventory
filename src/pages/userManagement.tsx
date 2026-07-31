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
  Badge as BadgeIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { styled, alpha } from '@mui/material/styles';

// Brand + design tokens
const BRAND = '#0C2C48';
const BRAND_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';
const SHOWING_GRADIENT = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
const MODE_GRADIENT = 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)';

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

/** Soft clay surface for skeuomorphic depth */
const SKEU_BG = '#e8eef4';
const SKEU_LIGHT = '#ffffff';
const SKEU_DARK = '#c5d0db';
const skeuRaised = (size = 7) =>
  `${size}px ${size}px ${size * 2}px ${SKEU_DARK}, -${size}px -${size}px ${size * 2}px ${SKEU_LIGHT}`;
const skeuInset = (size = 4) =>
  `inset ${size}px ${size}px ${size * 2}px ${SKEU_DARK}, inset -${size}px -${size}px ${size * 2}px ${SKEU_LIGHT}`;

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
  borderRadius: '18px',
  border: 'none',
  background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
  boxShadow: skeuRaised(8),
  height: '100%',
  transition: 'box-shadow 0.18s ease, transform 0.18s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: skeuRaised(10),
  },
}));

const FilterBar = styled(Paper)(() => ({
  padding: '16px 20px',
  borderRadius: '18px',
  border: 'none',
  background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
  boxShadow: skeuRaised(8),
  marginBottom: 24,
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
    <Box sx={{ p: isMobile ? 2 : 3, bgcolor: SKEU_BG, minHeight: 'calc(100vh - 112px)' }}>
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

      {/* Stats Strip — skeuomorphic */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard elevation={0}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.25, '&:last-child': { pb: 2.25 } }}>
              <Avatar
                sx={{
                  background: BRAND_GRADIENT,
                  width: 48,
                  height: 48,
                  boxShadow: `3px 3px 8px ${SKEU_DARK}, inset 0 1px 0 ${alpha('#fff', 0.28)}`,
                }}
              >
                <PeopleIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{ color: BRAND, lineHeight: 1, textShadow: '1px 1px 0 rgba(255,255,255,0.8)' }}
                >
                  {users.length.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: alpha(BRAND, 0.55), fontWeight: 700 }}>
                  Total Users
                </Typography>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard elevation={0}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.25, '&:last-child': { pb: 2.25 } }}>
              <Avatar
                sx={{
                  background: SHOWING_GRADIENT,
                  width: 48,
                  height: 48,
                  boxShadow: `3px 3px 8px ${SKEU_DARK}, inset 0 1px 0 ${alpha('#fff', 0.28)}`,
                }}
              >
                <SearchIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{ color: BRAND, lineHeight: 1, textShadow: '1px 1px 0 rgba(255,255,255,0.8)' }}
                >
                  {filteredUsers.length.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: alpha(BRAND, 0.55), fontWeight: 700 }}>
                  {searchTerm ? 'Matching Search' : 'Currently Showing'}
                </Typography>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard elevation={0}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.25, '&:last-child': { pb: 2.25 } }}>
              <Avatar
                sx={{
                  background: MODE_GRADIENT,
                  width: 48,
                  height: 48,
                  boxShadow: `3px 3px 8px ${SKEU_DARK}, inset 0 1px 0 ${alpha('#fff', 0.28)}`,
                }}
              >
                <BadgeIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{ color: BRAND, lineHeight: 1.1, textShadow: '1px 1px 0 rgba(255,255,255,0.8)' }}
                >
                  {searchTerm ? 'Filtered' : 'All Records'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: alpha(BRAND, 0.55), fontWeight: 700 }}>
                  Search Mode
                </Typography>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Search — skeuomorphic, constrained width */}
      <FilterBar elevation={0}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search by name or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: 360, md: 400 },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: alpha(BRAND, 0.5) }} />
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
              height: 40,
              borderRadius: 3,
              background: SKEU_BG,
              boxShadow: skeuInset(4),
              '& fieldset': { border: 'none' },
              '&.Mui-focused': {
                boxShadow: `${skeuInset(4)}, 0 0 0 2px ${alpha(BRAND, 0.18)}`,
              },
            },
          }}
        />
      </FilterBar>

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
        onClose={() => {
          setOpenDialog(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(12,44,72,0.2)',
          },
        }}
      >
        <DialogTitle
          sx={{
            background: BRAND_GRADIENT,
            color: '#fff',
            py: 2,
            px: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <PersonAddIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Create New User
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
              Add login credentials for a new inventory user
            </Typography>
          </Box>
          <IconButton
            onClick={() => {
              setOpenDialog(false);
              resetForm();
            }}
            size="small"
            sx={{
              color: '#fff',
              bgcolor: 'rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 1.5,
              fontWeight: 700,
              color: alpha(BRAND, 0.55),
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            Account details
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                size="small"
                required
                value={newUser.user_name}
                onChange={(e) => setNewUser({ ...newUser, user_name: e.target.value })}
                error={!!errors.user_name}
                helperText={errors.user_name}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                variant="outlined"
                size="small"
                required
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                error={!!errors.full_name}
                helperText={errors.full_name}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mb: 1.5,
                  mt: 0.5,
                  fontWeight: 700,
                  color: alpha(BRAND, 0.55),
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                Security
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                variant="outlined"
                size="small"
                required
                type={showPassword ? 'text' : 'password'}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                error={!!errors.password}
                helperText={errors.password || 'Minimum 6 characters'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirm Password"
                variant="outlined"
                size="small"
                required
                type={showPassword ? 'text' : 'password'}
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            py: 2,
            gap: 1,
            borderTop: `1px solid ${alpha(BRAND, 0.08)}`,
          }}
        >
          <Button
            onClick={() => {
              setOpenDialog(false);
              resetForm();
            }}
            sx={{ textTransform: 'none', fontWeight: 600, color: BRAND }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            startIcon={<PersonAddIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              px: 2.5,
              background: BRAND_GRADIENT,
              boxShadow: 'none',
              '&:hover': {
                background: BRAND_GRADIENT,
                filter: 'brightness(1.05)',
                boxShadow: 'none',
              },
            }}
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
