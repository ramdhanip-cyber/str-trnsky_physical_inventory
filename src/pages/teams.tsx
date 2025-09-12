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
  Divider,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  LinearProgress
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Workspaces as WorkspacesIcon,
  Tag as TagIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  GroupAdd as GroupAddIcon,
  Cancel as CancelIcon
} from "@mui/icons-material";
import { servicesAPI } from '../config/api';
import { styled } from '@mui/material/styles';
import AddTeamDialog from './AddTeamDialog';
import EditTeamDialog from './EditTeamDialog';

// Styled components
const StyledCard = styled(Card)(() => ({
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.1)'
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

  const handleEditClick = (team: Team) => {
    setTeamToEdit(team);
    setEditDialogOpen(true);
  };

  // Color palette for avatars
  const avatarColors = [
    theme.palette.primary.main,
    // theme.palette.secondary.main,
    // theme.palette.success.main,
    // theme.palette.error.main,
    // theme.palette.warning.main,
    // theme.palette.info.main
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

  const handleRefresh = () => {
    fetchData();
  };

  const getAvatarColor = (userId: number): string => {
    const user = users.find(user => user.user_id === userId);
    return user?.avatar_color || theme.palette.primary.main;
  };

  const getRoleColor = (roleId: number): string => {
    const role = roles.find(role => role.role_id === roleId);
    return role?.color || theme.palette.info.main;
  };

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
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      {/* Header Section */}
      <StyledCard sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={2}>
                <WorkspacesIcon sx={{ 
                  fontSize: 40,
                  color: theme.palette.primary.main 
                }} />
                <Box>
                  <Typography variant="h4" component="h1" sx={{ 
                    fontWeight: 700,
                    color: theme.palette.text.primary,
                    lineHeight: 1.2
                  }}>
                    Team Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage all your teams in one place
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box display="flex" gap={2} justifyContent={isMobile ? 'flex-start' : 'flex-end'}>
                <TextField
                  size="small"
                  placeholder="Search teams..."
                  variant="outlined"
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
                      borderRadius: '12px',
                      width: isMobile ? '100%' : 250
                    }
                  }}
                />
                
                <ActionButton 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />}
                  onClick={handleAddTeamClick}
                  sx={{
                    minWidth: 'auto'
                  }}
                >
                  {isMobile ? 'New' : 'New Team'}
                </ActionButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>

      {/* Filters and Stats */}
      <StyledCard sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box display="flex" gap={1} alignItems="center">
                <PeopleIcon color="action" />
                <Typography variant="body2" color="text.secondary">
                  <strong>{teams.length}</strong> teams total
                </Typography>
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>{filteredTeams.length}</strong> filtered
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box display="flex" justifyContent={isMobile ? 'flex-start' : 'flex-end'} gap={1}>
                <Tooltip title="Refresh">
                  <IconButton 
                    onClick={handleRefresh} 
                    disabled={refreshing}
                    sx={{
                      backgroundColor: theme.palette.action.hover,
                      borderRadius: '12px'
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>

      {/* Teams Table */}
      <StyledCard>
        {refreshing && <LinearProgress color="primary" sx={{ mb: 2 }} />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                bgcolor: theme.palette.mode === 'dark' ? 
                  theme.palette.grey[900] : 
                  theme.palette.grey[100] 
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
                <TableCell sx={{ fontWeight: 700 }}>Tag Range</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      gap: 2
                    }}>
                      <GroupAddIcon sx={{ 
                        fontSize: 80, 
                        color: theme.palette.action.disabled
                      }} />
                      <Typography variant="h5" color="text.secondary">
                        No Teams Found
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
                        {searchTerm ? 
                          'No teams match your search criteria. Try adjusting your search.' : 
                          'Get started by creating your first team to organize your members.'}
                      </Typography>
                      <ActionButton 
                        variant="contained" 
                        color="primary" 
                        startIcon={<AddIcon />}
                        onClick={handleAddTeamClick}
                        size="large"
                        sx={{ px: 4 }}
                      >
                        Create Team
                      </ActionButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeams.map((team) => (
                  <TableRow 
                    key={team.team_id} 
                    hover 
                    sx={{ 
                      '&:last-child td': { borderBottom: 0 },
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover
                      }
                    }}
                  >
                    <TableCell sx={{ py: 3 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar 
                          sx={{ 
                            bgcolor: theme.palette.primary.light,
                            color: theme.palette.primary.contrastText,
                            width: 40,
                            height: 40,
                            fontWeight: 600
                          }}
                        >
                          {team.team_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600} color="text.primary">
                            {team.team_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created: {new Date(team.time_created || '').toLocaleDateString()}
                          </Typography>
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
                                  fontWeight: 500
                                }}
                              >
                                {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </Avatar>
                            </Tooltip>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
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
                                  fontWeight: 600
                                }}
                              />
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </TableCell>
                    
                    <TableCell sx={{ py: 3 }}>
                      <Chip 
                        icon={<TagIcon fontSize="small" />}
                        label={`${team.tag_from} - ${team.tag_to}`}
                        color="default"
                        variant="outlined"
                        sx={{
                          borderColor: theme.palette.success.light,
                          color: theme.palette.success.dark,
                          bgcolor: theme.palette.success.light + '20',
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    
                    <TableCell align="right" sx={{ py: 3 }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Edit team">
                          <IconButton 
                            color="primary"
                            onClick={() => handleEditClick(team)}
                            size="small"
                            sx={{
                              backgroundColor: theme.palette.primary.light + '20',
                              '&:hover': {
                                backgroundColor: theme.palette.primary.light + '30'
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
                              backgroundColor: theme.palette.error.light + '20',
                              '&:hover': {
                                backgroundColor: theme.palette.error.light + '30'
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </StyledCard>
      
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
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Tag Range:</strong> {teams.find(t => t.team_id === teamToDelete)?.tag_from} - {teams.find(t => t.team_id === teamToDelete)?.tag_to}
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