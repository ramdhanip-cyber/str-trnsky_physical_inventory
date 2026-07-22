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
  ToggleButton,
  ToggleButtonGroup,
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
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  AccessTime as AccessTimeIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon
} from "@mui/icons-material";
import { servicesAPI } from '../config/api';
import { styled } from '@mui/material/styles';
import AddTeamDialog from './AddTeamDialog';
import EditTeamDialog from './EditTeamDialog';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  background: theme.palette.mode === 'dark' 
    ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
    : theme.palette.background.paper,
  backdropFilter: 'blur(10px)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
    borderColor: alpha(theme.palette.primary.main, 0.3)
  }
}));

const TeamCard = styled(Card)(() => ({
  borderRadius: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: `1px solid ${alpha('#b8d4f0', 0.4)}`,
  position: 'relative',
  overflow: 'hidden',
  width: '320px',
  height: '420px',
  display: 'flex',
  flexDirection: 'column',
  background: `${alpha('#0088FE', 0.08)}`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: `#0088FE`,
    opacity: 0,
    transition: 'opacity 0.3s ease'
  },
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 20px 60px rgba(184, 212, 240, 0.25)',
    borderColor: alpha('#b8d4f0', 0.6),
    background: `${alpha('#0088FE', 0.1)}`,
    '&::before': {
      opacity: 1
    }
  }
}));

const StatCard = styled(Card)(({ theme }) => ({
  borderRadius: '16px',
  padding: theme.spacing(2.5),
  background: `${alpha('#0088FE', 0.08)}`,
  border: `1px solid ${alpha('#0088FE', 0.15)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 8px 24px ${alpha('#b8d4f0', 0.3)}`
  }
}));

// const StatusBadge = styled(Badge)(({ theme }) => ({
//   '& .MuiBadge-badge': {
//     right: 10,
//     top: 10,
//     border: `2px solid ${theme.palette.background.paper}`,
//     padding: '0 4px',
//     borderRadius: '12px'
//   }
// }));

const ActionButton = styled(Button)(() => ({
  borderRadius: '12px',
  textTransform: 'none',
  fontWeight: 600,
  padding: '8px 16px',
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none'
  }
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
      
      const processedTeams = teamsRes.data.map((team: Team) => ({
        ...team,
        status: ['active'][Math.floor(Math.random() * 3)] as 'active'
      }));
      
      setTeams(processedTeams);
      setFilteredTeams(processedTeams);
      
      setUsers(usersRes.data.map((user: User) => ({
        ...user,
        avatar_color: avatarColors[Math.floor(Math.random() * avatarColors.length)]
      })));
      
      // Assign colors to roles
      const coloredRoles = rolesRes.data.map((role: Role, index: number) => ({
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
      result = result.filter(team =>
        team.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.members.some(member => 
          member.full_name.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newView: 'grid' | 'table' | null) => {
    if (newView !== null) {
      setViewMode(newView);
    }
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
    <Box sx={{ p: isMobile ? 1 : 3, background: `${alpha('#0088FE', 0.03)}`, minHeight: '100vh' }}>
      {/* Header Section */}
      <StyledCard sx={{ mb: 3, background: `${alpha('#0088FE', 0.06)}` }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  background: `#0088FE`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px ${alpha('#0088FE', 0.25)}`
                }}>
                  <WorkspacesIcon sx={{ 
                    fontSize: 32,
                    color: 'white'
                  }} />
                </Box>
                <Box>
                  <Typography variant="h4" component="h1" sx={{ 
                    fontWeight: 800,
                    color: '#0088FE',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2,
                    mb: 0.5
                  }}>
                    Team Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Organize and manage your inventory teams efficiently
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box display="flex" gap={2} justifyContent={isMobile ? 'flex-start' : 'flex-end'} alignItems="center" flexWrap="wrap">
                <TextField
                  size="small"
                  placeholder="Search teams or members..."
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: '12px',
                      width: isMobile ? '100%' : 280,
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: theme.palette.primary.main,
                        },
                      }
                    }
                  }}
                />
                
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      borderRadius: '12px',
                      border: `1px solid ${alpha('#667eea', 0.3)}`,
                      '&.Mui-selected': {
                            background: `#0088FE`,
                            color: 'white',
                        '&:hover': {
                          background: `linear-gradient(135deg, #d4c5f9, #b8d4f0)`,
                        }
                      }
                    }
                  }}
                >
                  <ToggleButton value="grid" aria-label="grid view">
                    <ViewModuleIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="table" aria-label="table view">
                    <ViewListIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>
                
                <ActionButton 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />}
                  onClick={handleAddTeamClick}
                  sx={{
                    minWidth: 'auto',
                    background: `linear-gradient(135deg, #b8d4f0 0%, #d4c5f9 100%)`,
                    color: '#6b7f9f',
                    boxShadow: `0 4px 16px ${alpha('#b8d4f0', 0.4)}`,
                    '&:hover': {
                      boxShadow: `0 8px 24px ${alpha('#b8d4f0', 0.5)}`,
                      transform: 'translateY(-2px)',
                      background: `linear-gradient(135deg, #d4c5f9 0%, #b8d4f0 100%)`
                    }
                  }}
                >
                  {isMobile ? 'New' : 'New Team'}
                </ActionButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {teams.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Total Teams
                </Typography>
              </Box>
              <Box sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                background: `${alpha('#0088FE', 0.1)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <WorkspacesIcon sx={{ fontSize: 28, color: '#0088FE' }} />
              </Box>
            </Box>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {totalMembers}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Total Members
                </Typography>
              </Box>
              <Box sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                background: `${alpha('#0088FE', 0.1)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PeopleIcon sx={{ fontSize: 28, color: '#0088FE' }} />
              </Box>
            </Box>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {averageMembersPerTeam}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Avg per Team
                </Typography>
              </Box>
              <Box sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                background: `${alpha('#0088FE', 0.1)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PersonAddIcon sx={{ fontSize: 28, color: '#0088FE' }} />
              </Box>
            </Box>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {filteredTeams.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Filtered Results
                </Typography>
              </Box>
              <Box sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                background: `${alpha('#0088FE', 0.1)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <SearchIcon sx={{ fontSize: 28, color: '#0088FE' }} />
              </Box>
            </Box>
          </StatCard>
        </Grid>
      </Grid>

      {/* Teams Display - Grid or Table */}
      {refreshing && <LinearProgress color="primary" sx={{ mb: 2, borderRadius: '10px' }} />}
      
      {filteredTeams.length === 0 ? (
        <StyledCard>
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: 3,
              py: 6
            }}>
              <Box sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: `${alpha('#0088FE', 0.1)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <GroupAddIcon sx={{ 
                  fontSize: 60, 
                  color: '#0088FE',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }} />
              </Box>
              <Box textAlign="center">
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#0088FE' }}>
                  No Teams Found
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 3 }}>
                  {searchTerm ? 
                    'No teams match your search criteria. Try adjusting your search terms.' : 
                    'Get started by creating your first team to organize your members and streamline your inventory management.'}
                </Typography>
                <ActionButton 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />}
                  onClick={handleAddTeamClick}
                  size="large"
                  sx={{ 
                    px: 4,
                    py: 1.5,
                    background: `#0088FE`,
                    color: 'white',
                    boxShadow: `0 4px 16px ${alpha('#0088FE', 0.3)}`,
                    '&:hover': {
                      boxShadow: `0 8px 24px ${alpha('#0088FE', 0.4)}`,
                      transform: 'translateY(-2px)',
                      background: `#0066CC`
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
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: 3, 
          justifyContent: 'flex-start',
          alignContent: 'flex-start'
        }}>
          {filteredTeams.map((team) => (
            <Box key={team.team_id} sx={{ flexShrink: 0 }}>
              <Fade in={true} timeout={300}>
                <TeamCard>
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                    {/* Team Header */}
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2} flexShrink={0}>
                      <Box display="flex" alignItems="center" gap={2} flex={1}>
                        <Avatar 
                          sx={{ 
                            width: 48,
                            height: 48,
                            background: `#0088FE`,
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1.2rem',
                            boxShadow: `0 4px 12px ${alpha('#0088FE', 0.3)}`
                          }}
                        >
                          {team.team_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 700,
                              mb: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {team.team_name}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(team.time_created || '').toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, team.team_id)}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.action.hover, 0.5)
                          }
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Members */}
                    <Box mb={2.5} flex={1} display="flex" flexDirection="column" minHeight={0}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1.5, display: 'block', flexShrink: 0 }}>
                        MEMBERS ({team.members?.length || 0})
                      </Typography>
                      <Box
                        sx={{
                          flex: 1,
                          minHeight: 0,
                          maxHeight: '140px', // Height for 2 members (approximately 70px each)
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          pr: 1,
                          '&::-webkit-scrollbar': {
                            width: '6px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: alpha(theme.palette.divider, 0.1),
                            borderRadius: '10px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: `#0088FE`,
                            borderRadius: '10px',
                            '&:hover': {
                              background: `#0066CC`,
                            },
                          },
                        }}
                      >
                        <Stack spacing={1.5}>
                          {team.members?.map((member) => (
                            <Box key={member.id} display="flex" alignItems="center" gap={1.5}>
                              <Avatar 
                                sx={{ 
                                  width: 36, 
                                  height: 36, 
                                  bgcolor: getAvatarColor(member.user_id),
                                  fontSize: 14,
                                  fontWeight: 600,
                                  boxShadow: `0 2px 8px ${alpha(getAvatarColor(member.user_id), 0.3)}`
                                }}
                              >
                                {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </Avatar>
                              <Box flex={1} minWidth={0}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {member.full_name}
                                </Typography>
                                <Chip 
                                  label={member.role_desc} 
                                  size="small" 
                                  sx={{ 
                                    height: 22, 
                                    fontSize: '0.7rem',
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
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box display="flex" gap={1} pt={1} borderTop={`1px solid ${alpha(theme.palette.divider, 0.5)}`} flexShrink={0}>
                      <Tooltip title="Edit team">
                        <IconButton 
                          color="primary"
                          onClick={() => handleEditClick(team)}
                          size="small"
                          sx={{
                            flex: 1,
                            borderRadius: '10px',
                            backgroundColor: alpha('#0088FE', 0.15),
                            '&:hover': {
                              backgroundColor: alpha('#0088FE', 0.25)
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
                            flex: 1,
                            borderRadius: '10px',
                            backgroundColor: alpha(theme.palette.error.main, 0.1),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.error.main, 0.2)
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </TeamCard>
              </Fade>
            </Box>
          ))}
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
                            background: `#0088FE`,
                            color: '#6b7f9f',
                            width: 44,
                            height: 44,
                            fontWeight: 700,
                            boxShadow: `0 4px 12px ${alpha('#0088FE', 0.3)}`
                          }}
                        >
                          {team.team_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700} color="text.primary" variant="body1">
                            {team.team_name}
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
                        {team.members?.map((member) => (
                          <Box key={member.id} display="flex" alignItems="center" gap={1.5}>
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
                                {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </Avatar>
                            </Tooltip>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {member.full_name}
                              </Typography>
                              <Chip 
                                label={member.role_desc} 
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
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.2)
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
                  {teams.find(t => t.team_id === teamToDelete)?.team_name.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="subtitle1" fontWeight={600}>
                  {teams.find(t => t.team_id === teamToDelete)?.team_name}
                </Typography>
              </Box>
              
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Members:</strong> {teams.find(t => t.team_id === teamToDelete)?.members.length || 0}
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