import { useState, useEffect } from "react";
import {
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  LinearProgress,
  Paper,
  alpha,
  Menu,
  MenuItem,
  Fade
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Workspaces as WorkspacesIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  GroupAdd as GroupAddIcon,
  Cancel as CancelIcon,
  Clear as ClearIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  AccessTime as AccessTimeIcon,
  LocalOffer as LocalOfferIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { servicesAPI } from '../config/api';
import { styled } from '@mui/material/styles';
import AddTeamDialog from './AddTeamDialog';
import EditTeamDialog from './EditTeamDialog';

const BRAND = '#0C2C48';
const BRAND_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';
const MEMBERS_GRADIENT = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
const AVG_GRADIENT = 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)';
const FILTER_GRADIENT = 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)';

const SKEU_BG = '#e8eef4';
const SKEU_LIGHT = '#ffffff';
const SKEU_DARK = '#c5d0db';
const skeuRaised = (size = 7) =>
  `${size}px ${size}px ${size * 2}px ${SKEU_DARK}, -${size}px -${size}px ${size * 2}px ${SKEU_LIGHT}`;
const skeuInset = (size = 4) =>
  `inset ${size}px ${size}px ${size * 2}px ${SKEU_DARK}, inset -${size}px -${size}px ${size * 2}px ${SKEU_LIGHT}`;

// Styled components
const StyledCard = styled(Card)(() => ({
  borderRadius: '18px',
  border: 'none',
  background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
  boxShadow: skeuRaised(8),
  transition: 'box-shadow 0.18s ease, transform 0.18s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: skeuRaised(10),
  },
}));

const TeamCard = styled(Card)(() => ({
  borderRadius: '16px',
  border: 'none',
  boxShadow: skeuRaised(7),
  transition: 'box-shadow 0.18s ease, transform 0.18s ease',
  position: 'relative',
  overflow: 'hidden',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: BRAND_GRADIENT,
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: skeuRaised(9),
  },
}));

const StatCard = styled(Card)(() => ({
  borderRadius: '18px',
  padding: '20px 22px',
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

const ActionButton = styled(Button)(() => ({
  borderRadius: '12px',
  textTransform: 'none',
  fontWeight: 600,
  padding: '8px 16px',
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
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

// Interfaces
export interface User {
  user_id: number;
  full_name: string;
  email?: string;
  avatar_color?: string;
}

export interface Role {
  role_id: number;
  role_desc: string;
  color?: string;
}

interface TeamMember {
  id: number;
  user_id: number;
  full_name: string;
  role_id: number;
  role_desc: string;
}

interface Team {
  team_id: number;
  team_name: string;
  tag_from: string;
  tag_to: string;
  current_tag?: string;
  created_by: number | null;
  time_created?: string;
  members: TeamMember[];
  status?: 'active' | 'inactive' | 'archived';
  [key: string]: string | number | TeamMember[] | null | undefined; // Add index signature for dynamic key access
}

const TeamManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  const handleEditClick = (team: Team) => {
    setTeamToEdit(team);
    setEditDialogOpen(true);
  };

  // Color palette for avatars - pastel colors
  const avatarColors = [
    '#b8d4f0', // Soft blue
    '#d4c5f9', // Soft purple
    '#ffd6d6', // Soft pink
    '#ffe0b2', // Soft peach
    '#c8e6c9', // Soft green
    '#dcedc8', // Soft mint
    '#fff9c4', // Soft yellow
    '#e1bee7', // Soft lavender
    '#b2dfdb', // Soft teal
    '#ffccbc', // Soft coral
    '#c5cae9', // Soft indigo
    '#f8bbd0', // Soft rose
  ];


  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setRefreshing(true);
      
      const [teamsRes, usersRes, rolesRes] = await Promise.all([
        servicesAPI.getTeamsWithMembers(),
        servicesAPI.getUsers(),
        servicesAPI.getRoles()
      ]);

      const teamsData = Array.isArray(teamsRes.data) ? teamsRes.data : [];
      const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
      const rolesData = Array.isArray(rolesRes.data) ? rolesRes.data : [];

      const processedTeams = teamsData.map((team: Team) => ({
        ...team,
        team_name: team.team_name || `Team ${team.team_id}`,
        members: Array.isArray(team.members)
          ? team.members.filter((m) => m && m.full_name)
          : [],
        status: 'active' as const,
      }));
      
      setTeams(processedTeams);
      setFilteredTeams(processedTeams);
      
      setUsers(usersData.map((user: User) => ({
        ...user,
        avatar_color: avatarColors[Math.floor(Math.random() * avatarColors.length)]
      })));
      
      // Assign colors to roles
      const coloredRoles = rolesData.map((role: Role, index: number) => ({
        ...role,
        color: avatarColors[index % avatarColors.length]
      }));
      setRoles(coloredRoles);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...teams];
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(team =>
        (team.team_name || '').toLowerCase().includes(term) ||
        (team.members || []).some(member =>
          (member.full_name || '').toLowerCase().includes(term)
        )
      );
    }
    
    // Apply sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
        const key = sortConfig.key;
        const direction = sortConfig.direction;
        
        const compareValues = (val1: string | number, val2: string | number): number => {
          if (val1 === undefined || val2 === undefined) return 0;
          return val1 < val2 ? -1 : val1 > val2 ? 1 : 0;
        };
        
        const aValue = a[key];
        const bValue = b[key];
        if (typeof aValue === 'string' || typeof aValue === 'number') {
          if (typeof bValue === 'string' || typeof bValue === 'number') {
            const comparison = compareValues(aValue, bValue);
            return direction === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });
    }
    
    setFilteredTeams(result);
  }, [searchTerm, teams, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAddTeamClick = () => {
    setOpenDialog(true);
  };

  const handleDeleteClick = (teamId: number) => {
    setTeamToDelete(teamId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;

    // Check if confirmation text matches
    if (deleteConfirmText !== 'CONFIRM') {
      setDeleteError('Please type "CONFIRM" to proceed with deletion');
      return;
    }

    try {
      setDeleteError(null);
      await servicesAPI.deleteTeam(teamToDelete.toString());
      await fetchData(); // Refresh data
      setDeleteConfirmOpen(false);
      setTeamToDelete(null);
      setDeleteConfirmText('');
    } catch (error: any) {
      console.error('Error deleting team:', error);
      setDeleteError(error.response?.data?.message || 'Failed to delete team. Please try again.');
    }
  };

  const getAvatarColor = (userId: number): string => {
    const user = users.find(user => user.user_id === userId);
    return user?.avatar_color || avatarColors[userId % avatarColors.length];
  };

  const getRoleColor = (roleId: number): string => {
    const role = roles.find(role => role.role_id === roleId);
    return role?.color || theme.palette.info.main;
  };


  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, teamId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedTeam(teamId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTeam(null);
  };

  const handleMenuEdit = () => {
    if (selectedTeam) {
      const team = teams.find(t => t.team_id === selectedTeam);
      if (team) {
        handleEditClick(team);
      }
    }
    handleMenuClose();
  };

  const handleMenuDelete = () => {
    if (selectedTeam) {
      handleDeleteClick(selectedTeam);
    }
    handleMenuClose();
  };

  // Calculate statistics
  const totalMembers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
  const averageMembersPerTeam = teams.length > 0 ? (totalMembers / teams.length).toFixed(1) : 0;

  if (loading && !refreshing) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box my={2} textAlign="center">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <ActionButton 
          variant="contained" 
          onClick={fetchData}
          startIcon={<RefreshIcon />}
        >
          Retry
        </ActionButton>
      </Box>
    );
  }

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
          boxShadow: '0 14px 40px 0 rgba(12,44,72,0.30)',
        }}
      >
        <Box sx={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', bottom: -80, right: 120, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 2.5 : 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 56, height: 56 }}>
              <WorkspacesIcon sx={{ fontSize: 30, color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.15 }}>
                Team Management
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
                Organize and manage your inventory teams efficiently
              </Typography>
            </Box>
          </Box>

          <ActionButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddTeamClick}
            sx={{
              bgcolor: '#fff',
              color: BRAND,
              fontWeight: 700,
              px: 2.5,
              boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            }}
          >
            {isMobile ? 'New' : 'New Team'}
          </ActionButton>
        </Box>
      </Box>

      {/* Statistics — skeuomorphic */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {(
          [
            { label: 'Total Teams', value: teams.length, grad: BRAND_GRADIENT, icon: <WorkspacesIcon /> },
            { label: 'Total Members', value: totalMembers, grad: MEMBERS_GRADIENT, icon: <PeopleIcon /> },
            { label: 'Avg per Team', value: averageMembersPerTeam, grad: AVG_GRADIENT, icon: <PersonAddIcon /> },
            { label: 'Filtered Results', value: filteredTeams.length, grad: FILTER_GRADIENT, icon: <SearchIcon /> },
          ] as const
        ).map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <StatCard elevation={0}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      mb: 0.5,
                      color: BRAND,
                      lineHeight: 1.1,
                      textShadow: '1px 1px 0 rgba(255,255,255,0.8)',
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha(BRAND, 0.55), fontWeight: 700 }}>
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
              </Box>
            </StatCard>
          </Grid>
        ))}
      </Grid>

      {/* Search + view — skeuomorphic bar between insights and content */}
      <FilterBar elevation={0}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            minHeight: 40,
          }}
        >
          <TextField
            size="small"
            variant="outlined"
            placeholder="Search teams or members..."
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
                  <IconButton size="small" onClick={() => setSearchTerm('')} aria-label="Clear search">
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

          <Box
            sx={{
              display: 'inline-flex',
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: { xs: 'flex-end', sm: 'center' },
              flexShrink: 0,
              height: 40,
              px: '4px',
              gap: '4px',
              boxSizing: 'border-box',
              borderRadius: '12px',
              background: SKEU_BG,
              boxShadow: skeuInset(3),
            }}
          >
            <Tooltip title="Grid view">
              <IconButton
                size="small"
                onClick={() => setViewMode('grid')}
                aria-label="grid view"
                sx={{
                  borderRadius: 1.5,
                  width: 32,
                  height: 32,
                  p: 0,
                  transition: 'box-shadow 0.15s ease',
                  ...(viewMode === 'grid'
                    ? {
                        color: '#fff',
                        background: BRAND_GRADIENT,
                        boxShadow: `2px 2px 5px ${SKEU_DARK}, inset 0 1px 0 ${alpha('#fff', 0.2)}`,
                        '&:hover': { background: BRAND_GRADIENT },
                      }
                    : {
                        color: BRAND,
                        background: 'transparent',
                        boxShadow: 'none',
                        '&:hover': { background: alpha(BRAND, 0.06) },
                      }),
                }}
              >
                <ViewModuleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="List view">
              <IconButton
                size="small"
                onClick={() => setViewMode('table')}
                aria-label="list view"
                sx={{
                  borderRadius: 1.5,
                  width: 32,
                  height: 32,
                  p: 0,
                  transition: 'box-shadow 0.15s ease',
                  ...(viewMode === 'table'
                    ? {
                        color: '#fff',
                        background: BRAND_GRADIENT,
                        boxShadow: `2px 2px 5px ${SKEU_DARK}, inset 0 1px 0 ${alpha('#fff', 0.2)}`,
                        '&:hover': { background: BRAND_GRADIENT },
                      }
                    : {
                        color: BRAND,
                        background: 'transparent',
                        boxShadow: 'none',
                        '&:hover': { background: alpha(BRAND, 0.06) },
                      }),
                }}
              >
                <ViewListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </FilterBar>

      {/* Teams Display - Grid or Table */}
      {refreshing && <LinearProgress color="primary" sx={{ mb: 2, borderRadius: '10px', bgcolor: alpha(BRAND, 0.08), '& .MuiLinearProgress-bar': { bgcolor: BRAND } }} />}
      
      {filteredTeams.length === 0 ? (
        <StyledCard elevation={0}>
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: 3,
              py: 6
            }}>
              <Avatar
                sx={{
                  width: 96,
                  height: 96,
                  background: BRAND_GRADIENT,
                  boxShadow: skeuRaised(6),
                }}
              >
                <GroupAddIcon sx={{ fontSize: 48, color: '#fff' }} />
              </Avatar>
              <Box textAlign="center">
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: BRAND }}>
                  No Teams Found
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 3 }}>
                  {searchTerm ? 
                    'No teams match your search criteria. Try adjusting your search terms.' : 
                    'Get started by creating your first team to organize your members and streamline your inventory management.'}
                </Typography>
                <ActionButton 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={handleAddTeamClick}
                  size="large"
                  sx={{ 
                    px: 4,
                    py: 1.5,
                    background: BRAND_GRADIENT,
                    color: 'white',
                    boxShadow: `0 4px 16px ${alpha(BRAND, 0.3)}`,
                    '&:hover': {
                      boxShadow: `0 8px 24px ${alpha(BRAND, 0.4)}`,
                      background: BRAND_GRADIENT,
                      filter: 'brightness(1.05)',
                    }
                  }}
                >
                  Create Your First Team
                </ActionButton>
              </Box>
            </Box>
          </CardContent>
        </StyledCard>
      ) : viewMode === 'grid' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2.5,
            alignItems: 'stretch',
          }}
        >
          {filteredTeams.map((team) => {
            const members = (team.members || []).filter((m) => m?.full_name);
            const tagLabel =
              team.tag_from || team.tag_to
                ? `${team.tag_from || '—'} → ${team.tag_to || '—'}`
                : null;

            return (
              <Fade in key={team.team_id} timeout={280}>
                <TeamCard>
                  <CardContent
                    sx={{
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      height: '100%',
                      '&:last-child': { pb: 2 },
                    }}
                  >
                    {/* Header */}
                    <Box display="flex" alignItems="center" gap={1.25}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          background: BRAND_GRADIENT,
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          boxShadow: `2px 2px 6px ${SKEU_DARK}, inset 0 1px 0 ${alpha('#fff', 0.25)}`,
                          flexShrink: 0,
                        }}
                      >
                        {team.team_name?.charAt(0)?.toUpperCase() || 'T'}
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            color: BRAND,
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {team.team_name || `Team ${team.team_id}`}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5} mt={0.25}>
                          <AccessTimeIcon sx={{ fontSize: 12, color: alpha(BRAND, 0.45) }} />
                          <Typography variant="caption" sx={{ color: alpha(BRAND, 0.5), fontWeight: 600 }}>
                            {team.time_created
                              ? new Date(team.time_created).toLocaleDateString()
                              : 'No date'}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, team.team_id)}
                        sx={{
                          width: 28,
                          height: 28,
                          color: alpha(BRAND, 0.45),
                          background: SKEU_BG,
                          boxShadow: skeuRaised(2),
                          '&:hover': { background: SKEU_BG, color: BRAND },
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>

                    {/* Meta chips */}
                    <Box display="flex" flexWrap="wrap" gap={0.75}>
                      <Chip
                        size="small"
                        icon={<PeopleIcon sx={{ fontSize: '14px !important' }} />}
                        label={`${members.length} member${members.length === 1 ? '' : 's'}`}
                        sx={{
                          height: 26,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          color: BRAND,
                          background: SKEU_BG,
                          boxShadow: skeuInset(2),
                          border: 'none',
                          '& .MuiChip-icon': { color: BRAND },
                        }}
                      />
                      {tagLabel && (
                        <Chip
                          size="small"
                          icon={<LocalOfferIcon sx={{ fontSize: '14px !important' }} />}
                          label={tagLabel}
                          sx={{
                            height: 26,
                            maxWidth: '100%',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            color: BRAND,
                            background: SKEU_BG,
                            boxShadow: skeuInset(2),
                            border: 'none',
                            '& .MuiChip-icon': { color: alpha(BRAND, 0.7) },
                            '& .MuiChip-label': {
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            },
                          }}
                        />
                      )}
                    </Box>

                    {/* Members well — scrollable */}
                    <Box
                      sx={{
                        flex: 1,
                        p: 1.25,
                        borderRadius: '12px',
                        background: SKEU_BG,
                        boxShadow: skeuInset(3),
                        minHeight: members.length === 0 ? 56 : undefined,
                        maxHeight: 148,
                        overflowY: members.length > 4 ? 'auto' : 'visible',
                        overflowX: 'hidden',
                        '&::-webkit-scrollbar': { width: 5 },
                        '&::-webkit-scrollbar-track': {
                          background: alpha(BRAND, 0.06),
                          borderRadius: 8,
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: alpha(BRAND, 0.35),
                          borderRadius: 8,
                          '&:hover': { background: alpha(BRAND, 0.5) },
                        },
                      }}
                    >
                      {members.length === 0 ? (
                        <Box
                          sx={{
                            height: '100%',
                            minHeight: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="caption" sx={{ color: alpha(BRAND, 0.45), fontWeight: 600 }}>
                            No members assigned
                          </Typography>
                        </Box>
                      ) : (
                        <Stack spacing={0.75}>
                          {members.map((member) => (
                            <Box
                              key={member.id || `${member.user_id}-${member.role_id}`}
                              display="flex"
                              alignItems="center"
                              gap={1}
                            >
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: getAvatarColor(member.user_id),
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: BRAND,
                                  boxShadow: `1px 1px 3px ${SKEU_DARK}`,
                                  flexShrink: 0,
                                }}
                              >
                                {(member.full_name || '?')
                                  .split(' ')
                                  .filter(Boolean)
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase() || '?'}
                              </Avatar>
                              <Typography
                                variant="body2"
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  color: BRAND,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {member.full_name}
                              </Typography>
                              <Chip
                                label={member.role_desc || 'Member'}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  bgcolor: getRoleColor(member.role_id),
                                  color: theme.palette.getContrastText(getRoleColor(member.role_id)),
                                }}
                              />
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Box>

                    {/* Actions */}
                    <Box display="flex" gap={1}>
                      <Tooltip title="Edit team">
                        <IconButton
                          onClick={() => handleEditClick(team)}
                          size="small"
                          sx={{
                            flex: 1,
                            height: 34,
                            borderRadius: '10px',
                            color: BRAND,
                            background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})`,
                            boxShadow: skeuRaised(3),
                            '&:hover': {
                              background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})`,
                              boxShadow: skeuRaised(4),
                            },
                          }}
                        >
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete team">
                        <IconButton
                          onClick={() => handleDeleteClick(team.team_id)}
                          size="small"
                          sx={{
                            flex: 1,
                            height: 34,
                            borderRadius: '10px',
                            color: theme.palette.error.main,
                            background: `linear-gradient(145deg, ${SKEU_LIGHT}, ${SKEU_BG})`,
                            boxShadow: skeuRaised(3),
                            '&:hover': {
                              background: alpha(theme.palette.error.main, 0.08),
                              boxShadow: skeuRaised(4),
                            },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </TeamCard>
              </Fade>
            );
          })}
        </Box>
      ) : (
        <StyledCard>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ 
                  bgcolor: theme.palette.mode === 'dark' ? 
                    alpha(theme.palette.grey[900], 0.5) : 
                    alpha(theme.palette.grey[100], 0.8)
                }}>
                  <TableCell 
                    sx={{ 
                      fontWeight: 700,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover
                      }
                    }}
                    onClick={() => requestSort('team_name')}
                  >
                    <Box display="flex" alignItems="center">
                      Team Name
                      {sortConfig?.key === 'team_name' && (
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Members</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow 
                    key={team.team_id} 
                    hover 
                    sx={{ 
                      '&:last-child td': { borderBottom: 0 },
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.5)
                      },
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <TableCell sx={{ py: 3 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar 
                          sx={{ 
                            background: BRAND_GRADIENT,
                            color: '#fff',
                            width: 44,
                            height: 44,
                            fontWeight: 700,
                            boxShadow: `0 4px 12px ${alpha(BRAND, 0.3)}`
                          }}
                        >
                          {(team.team_name || 'T').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700} color="text.primary" variant="body1">
                            {team.team_name || `Team ${team.team_id}`}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                            <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(team.time_created || '').toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell sx={{ py: 3 }}>
                      <Stack direction="column" spacing={1.5}>
                        {(team.members || []).filter((m) => m?.full_name).map((member) => (
                          <Box key={member.id || `${member.user_id}-${member.role_id}`} display="flex" alignItems="center" gap={1.5}>
                            <Tooltip title={member.full_name}>
                              <Avatar 
                                sx={{ 
                                  width: 32, 
                                  height: 32, 
                                  bgcolor: getAvatarColor(member.user_id),
                                  fontSize: 14,
                                  fontWeight: 600
                                }}
                              >
                                {(member.full_name || '?')
                                  .split(' ')
                                  .filter(Boolean)
                                  .map(n => n[0])
                                  .join('')
                                  .toUpperCase() || '?'}
                              </Avatar>
                            </Tooltip>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {member.full_name}
                              </Typography>
                              <Chip 
                                label={member.role_desc || 'Member'} 
                                size="small" 
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.65rem',
                                  bgcolor: getRoleColor(member.role_id),
                                  color: theme.palette.getContrastText(getRoleColor(member.role_id)),
                                  fontWeight: 600,
                                  mt: 0.5
                                }}
                              />
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </TableCell>
                    
                    <TableCell align="right" sx={{ py: 3 }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Edit team">
                          <IconButton 
                          color="primary"
                          onClick={() => handleEditClick(team)}
                          size="small"
                          sx={{
                            backgroundColor: alpha(BRAND, 0.1),
                            color: BRAND,
                            '&:hover': {
                              backgroundColor: alpha(BRAND, 0.18)
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete team">
                        <IconButton 
                          color="error"
                          onClick={() => handleDeleteClick(team.team_id)}
                          size="small"
                          sx={{
                            backgroundColor: alpha(theme.palette.error.main, 0.1),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.error.main, 0.2)
                            }
                          }}
                        >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </StyledCard>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            mt: 1,
            minWidth: 180,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
          }
        }}
      >
        <MenuItem onClick={handleMenuEdit} sx={{ borderRadius: '8px', mx: 0.5, mt: 0.5 }}>
          <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
          Edit Team
        </MenuItem>
        <MenuItem onClick={handleMenuDelete} sx={{ borderRadius: '8px', mx: 0.5, mb: 0.5, color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete Team
        </MenuItem>
      </Menu>
      
      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteConfirmText('');
          setDeleteError(null);
        }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 3,
            minWidth: isMobile ? '90%' : 500,
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 700,
          color: theme.palette.error.main,
          px: 0,
          pt: 0
        }}>
          Confirm Team Deletion
        </DialogTitle>
        <DialogContent sx={{ px: 0 }}>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete this team? This action cannot be undone and will remove:
          </Typography>
          
          {teamToDelete && (
            <Box sx={{ 
              backgroundColor: theme.palette.action.hover,
              borderRadius: '12px',
              p: 2,
              mb: 3
            }}>
              <Box display="flex" alignItems="center" gap={2} mb={1}>
                <Avatar 
                  sx={{ 
                    bgcolor: theme.palette.error.light,
                    color: theme.palette.error.contrastText,
                    width: 40,
                    height: 40
                  }}
                >
                  {(teams.find(t => t.team_id === teamToDelete)?.team_name || 'T').charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="subtitle1" fontWeight={600}>
                  {teams.find(t => t.team_id === teamToDelete)?.team_name || `Team ${teamToDelete}`}
                </Typography>
              </Box>
              
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Members:</strong> {teams.find(t => t.team_id === teamToDelete)?.members?.length || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Created:</strong> {new Date(teams.find(t => t.team_id === teamToDelete)?.time_created || '').toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
          
          <Alert severity="error" sx={{ mb: 2 }}>
            This action will permanently delete the team and all its associations.
          </Alert>
          
          <Typography variant="body2" color="text.secondary">
            Type <strong>"CONFIRM"</strong> to proceed:
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Type CONFIRM..."
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            error={!!deleteError}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 0, pb: 0 }}>
          <Button 
            onClick={() => {
              setDeleteConfirmOpen(false);
              setDeleteConfirmText('');
              setDeleteError(null);
            }}
            variant="outlined"
            sx={{ 
              borderRadius: '12px',
              px: 3,
              fontWeight: 600
            }}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteConfirmText !== 'CONFIRM'}
            sx={{ 
              borderRadius: '12px',
              px: 3,
              fontWeight: 600
            }}
            startIcon={<DeleteIcon />}
          >
            Delete Team
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      {/* The original code had deleteSuccess state and Snackbar, but deleteSuccess is not defined.
          Assuming it's a placeholder for a future feature or a bug in the original file.
          For now, removing it as it's not used. */}
      <AddTeamDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onTeamCreated={fetchData} // This will refresh the list after creation
        users={users}
        roles={roles}
      />
      <EditTeamDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onTeamUpdated={fetchData}
        team={teamToEdit}
        users={users}
        roles={roles}
      />
    </Box>
  );
};

export default TeamManagement;