import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Autocomplete,
  TextField,
  DialogActions,
  Grid,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Avatar,
  IconButton,
  CircularProgress,
  Box,
  Chip,
  Divider,
  Menu,
  MenuItem,
  Badge,
  Alert,
  AlertTitle,
  Tabs,
  Tab
} from "@mui/material";
import { servicesAPI } from "../config/api";
import {
  PersonAdd as PersonAddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  AssignmentInd as AssignmentIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Group as GroupIcon
} from "@mui/icons-material";
import { format } from "date-fns";
import { visuallyHidden } from '@mui/utils';

interface Section {
  section_id: string;
  section_desc: string;
  location_id: string;
  created_at?: string;
}

interface Team {
  team_id: string;
  team_name: string;
  created_at?: string;
  created_by?: string;
  tag_from?: string;
  tag_to?: string;
  current_tag?: string;
}

interface AssignedLocation {
  id: string;
  location_id: string;
  sub_location_id: string;
  assigned_at: string;
  competed_at: string | null;
  team_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  team_name?: string;
  tag_from?: string;
  tag_to?: string;
  current_tag?: string;
  team_details?: Team;
}

interface ViewSectionsDialogProps {
  open: boolean;
  onClose: () => void;
  location_id: string;
  warehouse: string;
  location_desc: string;
  branch: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'error'> = {
  pending: 'default',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'error'
};

const statusIcons = {
  pending: <InfoIcon fontSize="small" />,
  in_progress: <CircularProgress size={14} />,
  completed: <CheckCircleIcon fontSize="small" />,
  cancelled: <ErrorIcon fontSize="small" />
};

const ViewSectionsDialog: React.FC<ViewSectionsDialogProps> = ({
  open,
  onClose,
  location_id,
  warehouse,
  location_desc,
  branch
}) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [assignedLocations, setAssignedLocations] = useState<AssignedLocation[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openAssignDialog, setOpenAssignDialog] = useState<boolean>(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Section; direction: 'asc' | 'desc' } | null>(null);

  // Fetch sections from the server
  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await servicesAPI.getSections(location_id);
      console.log('Sections response:', response.data);
              console.log('Sections data structure:', response.data.map((s: Section) => ({ section_id: s.section_id, section_desc: s.section_desc, location_id: s.location_id })));
      setSections(response.data);
    } catch (error) {
      console.error("Error fetching sections:", error);
      setError("Failed to load sections. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [location_id]);

  // Fetch teams from the server
  const fetchTeams = useCallback(async () => {
    try {
      const { data } = await servicesAPI.getTeams();
      setTeams(data);
    } catch (error) {
      console.error("Error fetching teams:", error);
      setError("Failed to load teams. Please try again.");
    }
  }, []);

  // Fetch assigned locations to get assigned team information
  const fetchAssignedLocations = useCallback(async () => {
    try {
      const response = await servicesAPI.getAssignedLocations();
      
      console.log('Assigned locations response:', response.data);
              console.log('Assigned locations data structure:', response.data.map((loc: AssignedLocation) => ({ 
        id: loc.id, 
        sub_location_id: loc.sub_location_id, 
        location_id: loc.location_id, 
        team_name: loc.team_name,
        status: loc.status 
      })));
      setAssignedLocations(response.data);
    } catch (error) {
      console.error("Error fetching assigned locations:", error);
      setError("Failed to load team assignments. Please try again.");
    }
  }, [location_id]);

  useEffect(() => {
    if (open) {
      fetchSections();
      fetchTeams();
      fetchAssignedLocations();
    }
  }, [open, fetchSections, fetchTeams, fetchAssignedLocations]);

  // Filter sections based on search query
  const filteredSections = sections.filter((section) =>
    section.section_desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort sections
  const sortedSections = React.useMemo(() => {
    if (!sortConfig) return filteredSections;
    
    return [...filteredSections].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (!aValue || !bValue) return 0;
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredSections, sortConfig]);

  // Handle assign team
  const handleAssignTeam = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setOpenAssignDialog(true);
    setSelectedTeam("");
  };

  // Handle assignment of team to section in assigned_location table
  const assignTeamToSection = async () => {
    if (!selectedTeam || !selectedSectionId) return;
  
    try {
      setAssigning(true);
            await servicesAPI.assignTeam({
        team_id: selectedTeam,
        sub_location_id: selectedSectionId,
        location_id: location_id,
        status: 'In Progress'
      });

      // Fetch the newly assigned team details
              const teamResponse = await servicesAPI.getTeam(selectedTeam);
  
      // Refresh data to get the updated assignment
      fetchSections();
      fetchAssignedLocations();
  
      setSuccess(`Team ${teamResponse.data.team_name} assigned successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      setOpenAssignDialog(false);
    } catch (error) {
      console.error("Error assigning team:", error);
      
      // Handle specific error for already assigned section
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 409) {
          setError(axiosError.response.data?.message || "This section is already assigned to another team.");
        } else {
          setError("Failed to assign team. Please try again.");
        }
      } else {
        setError("Failed to assign team. Please try again.");
      }
    } finally {
      setAssigning(false);
    }
  };

  // Handle delete section
  const handleDeleteSection = async (id: string) => {
    try {
      setDeleting(id);
      await servicesAPI.deleteSection(id);
      // Refresh data after deletion
      fetchSections();
      fetchAssignedLocations();
      setSuccess("Section deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error deleting section:", error);
      setError("Failed to delete section. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleRefresh = () => {
    setError(null);
    setSuccess(null);
    fetchSections();
    fetchTeams();
    fetchAssignedLocations();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSort = (key: keyof Section) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getAssignedTeamInfo = (sectionId: string): AssignedLocation | null => {
    console.log('Looking for sectionId:', sectionId, 'type:', typeof sectionId, 'location_id:', location_id, 'type:', typeof location_id);
    console.log('Available assigned locations:', assignedLocations);
    
    const found = assignedLocations.find(
      loc => {
        const subLocationMatch = loc.sub_location_id.toString() === sectionId.toString();
        const locationMatch = loc.location_id.toString() === location_id.toString();
        console.log('Comparing:', {
          sub_location_id: loc.sub_location_id,
          sectionId: sectionId,
          subLocationMatch,
          location_id: loc.location_id,
          locationId: location_id,
          locationMatch
        });
        return subLocationMatch && locationMatch;
      }
    );
    
    console.log('Found assignment:', found);
    return found || null;
  };

  const getStatusCount = (status: string) => {
    return assignedLocations.filter(loc => loc.status === status).length;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Sections Management
              <Chip label={sections.length} size="small" sx={{ ml: 1 }} />
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {warehouse} • {location_desc} • {branch}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Tooltip title="More options">
              <IconButton onClick={handleMenuOpen} color="inherit">
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => { handleRefresh(); handleMenuClose(); }}>
                <RefreshIcon sx={{ mr: 1 }} /> Refresh Data
              </MenuItem>
              <MenuItem onClick={handleMenuClose}>
                <FilterListIcon sx={{ mr: 1 }} /> Filter Sections
              </MenuItem>
              <MenuItem onClick={handleMenuClose}>
                <SortIcon sx={{ mr: 1 }} /> Sort Options
              </MenuItem>
            </Menu>
            <IconButton onClick={onClose} color="inherit">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={3}>
          {/* Status Summary */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h6" color="primary">
                  Assignment Summary
                </Typography>
                <Chip 
                  label={`${assignedLocations.length} assigned`} 
                  color="success" 
                  size="small" 
                />
                <Chip 
                  label={`${sections.length - assignedLocations.length} available`} 
                  color="default" 
                  size="small" 
                  variant="outlined"
                />
              </Box>
              <Tabs
                value={activeTab}
                onChange={(_e, newValue) => setActiveTab(newValue)}
                aria-label="section view tabs"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="All" icon={<GroupIcon />} iconPosition="start" />
                <Tab 
                  label="Pending" 
                  icon={
                    <Badge badgeContent={getStatusCount('pending')} color="default">
                      <InfoIcon />
                    </Badge>
                  } 
                  iconPosition="start" 
                />
                <Tab 
                  label="In Progress" 
                  icon={
                    <Badge badgeContent={getStatusCount('in_progress')} color="primary">
                      <CircularProgress size={16} />
                    </Badge>
                  } 
                  iconPosition="start" 
                />
                <Tab 
                  label="Completed" 
                  icon={
                    <Badge badgeContent={getStatusCount('completed')} color="success">
                      <CheckCircleIcon />
                    </Badge>
                  } 
                  iconPosition="start" 
                />
                <Tab 
                  label="Cancelled" 
                  icon={
                    <Badge badgeContent={getStatusCount('cancelled')} color="error">
                      <ErrorIcon />
                    </Badge>
                  } 
                  iconPosition="start" 
                />
              </Tabs>
            </Box>
          </Grid>

          {/* Alerts */}
          {error && (
            <Grid item xs={12}>
              <Alert severity="error" onClose={() => setError(null)}>
                <AlertTitle>Error</AlertTitle>
                {error}
              </Alert>
            </Grid>
          )}
          {success && (
            <Grid item xs={12}>
              <Alert severity="success" onClose={() => setSuccess(null)}>
                <AlertTitle>Success</AlertTitle>
                {success}
              </Alert>
            </Grid>
          )}

          {/* Search and Filters */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={2}>
              <TextField
                fullWidth
                label="Search Sections"
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
              />
              <Button startIcon={<FilterListIcon />} variant="outlined">
                Filters
              </Button>
            </Box>
          </Grid>

          {/* Sections Table */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'primary.main' }}>
                      <TableCell sx={{ color: 'common.white' }}>
                        <Box display="flex" alignItems="center">
                          Section Name
                          <Tooltip title="Sort">
                            <IconButton 
                              size="small" 
                              sx={{ color: 'inherit', ml: 1 }}
                              onClick={() => handleSort('section_desc')}
                            >
                              <SortIcon fontSize="small" />
                              {sortConfig?.key === 'section_desc' && (
                                <span style={visuallyHidden}>
                                  {sortConfig.direction === 'asc' ? 'sorted ascending' : 'sorted descending'}
                                </span>
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'common.white' }}>Physical Inventory</TableCell>
                      <TableCell sx={{ color: 'common.white' }}>Assigned Team</TableCell>
                      <TableCell sx={{ color: 'common.white' }}>Status</TableCell>
                      <TableCell sx={{ color: 'common.white' }}>Assigned At</TableCell>
                      <TableCell sx={{ color: 'common.white' }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <CircularProgress />
                          <Typography sx={{ mt: 1 }}>Loading sections...</Typography>
                        </TableCell>
                      </TableRow>
                    ) : sortedSections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="textSecondary">
                            {searchQuery ? 'No matching sections found' : 'No sections available'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedSections.map((section) => {
                        console.log('Processing section:', section);
                        const assignment = getAssignedTeamInfo(section.section_id);
                        const isAssigned = Boolean(assignment);
                        console.log('Section assignment result:', assignment, 'isAssigned:', isAssigned);
                        
                        return (
                          <TableRow key={section.section_id} hover>
                            <TableCell>
                              <Typography fontWeight="medium">{section.section_desc}</Typography>
                              {section.created_at && (
                                <Typography variant="caption" color="textSecondary">
                                  Created: {format(new Date(section.created_at), 'MMM dd, yyyy')}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip label={section.location_id} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              {assignment ? (
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'success.main' }}>
                                    <AssignmentIcon fontSize="small" />
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium" color="success.main">
                                      {assignment.team_name}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                      Assigned: {format(new Date(assignment.assigned_at), 'MMM dd, yyyy HH:mm')}
                                    </Typography>
                                    {assignment.team_details?.tag_from && assignment.team_details?.tag_to && (
                                      <Typography variant="caption" color="textSecondary" display="block">
                                        Tags: {assignment.team_details.tag_from} → {assignment.team_details.tag_to}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              ) : (
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.300' }}>
                                    <AssignmentIcon fontSize="small" color="disabled" />
                                  </Avatar>
                                  <Typography variant="body2" color="textSecondary">
                                    Not assigned
                                  </Typography>
                                </Box>
                              )}
                            </TableCell>
                            <TableCell>
                              {isAssigned ? (
                                <Chip
                                  label={assignment?.status.replace('_', ' ') || 'pending'}
                                  color={statusColors[assignment?.status || 'pending'] as 'default' | 'primary' | 'success' | 'error'}
                                  size="small"
                                  icon={statusIcons[assignment?.status || 'pending']}
                                  sx={{ textTransform: 'capitalize' }}
                                />
                              ) : (
                                <Chip
                                  label="Available for assignment"
                                  color="default"
                                  size="small"
                                  variant="outlined"
                                  icon={<InfoIcon fontSize="small" />}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {isAssigned ? (
                                <Typography variant="body2">
                                  {format(new Date(assignment?.assigned_at || new Date()), 'MMM dd, yyyy HH:mm')}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="textSecondary">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Box display="flex" justifyContent="flex-end" gap={1}>
                                {isAssigned ? (
                                  <Tooltip title={`Already assigned to ${assignment?.team_name}. Cannot reassign.`}>
                                    <span>
                                      <IconButton
                                        color="success"
                                        disabled
                                        size="small"
                                        sx={{ opacity: 0.6 }}
                                      >
                                        <CheckCircleIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="Assign Team">
                                    <IconButton
                                      color="primary"
                                      onClick={() => handleAssignTeam(section.section_id)}
                                      size="small"
                                    >
                                      <PersonAddIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Delete Section">
                                  <IconButton
                                    color="error"
                                    onClick={() => handleDeleteSection(section.section_id)}
                                    disabled={deleting === section.section_id}
                                    size="small"
                                  >
                                    {deleting === section.section_id ? (
                                      <CircularProgress size={20} />
                                    ) : (
                                      <DeleteIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Box>
          <Typography variant="body2" color="textSecondary">
            Showing {sortedSections.length} of {sections.length} sections
          </Typography>
          {sortConfig && (
            <Typography variant="caption" color="textSecondary">
              Sorted by: {sortConfig.key} ({sortConfig.direction})
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={1}>
          <Button 
            onClick={handleRefresh} 
            variant="outlined" 
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
          <Button onClick={onClose} variant="contained" color="primary">
            Close
          </Button>
        </Box>
      </DialogActions>

      {/* Assign Team Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Assign Team to Section
              {selectedSectionId && (
                <Typography variant="subtitle2" color="textSecondary">
                  Section: {sections.find(s => s.section_id === selectedSectionId)?.section_desc}
                </Typography>
              )}
            </Typography>
            <IconButton onClick={() => setOpenAssignDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <Divider />
        
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Important</AlertTitle>
                Only one team can be assigned to each section. Once assigned, the team cannot be changed.
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={teams}
                getOptionLabel={(team) => `${team.team_name} (${team.team_id})`}
                groupBy={(team) => team.current_tag || 'No Tag'}
                value={teams.find(team => team.team_id === selectedTeam) || null}
                onChange={(_event, newValue) => setSelectedTeam(newValue ? newValue.team_id : "")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Team"
                    variant="outlined"
                    fullWidth
                    helperText="Select a team to assign to this section"
                  />
                )}
                renderOption={(props, team) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GroupIcon color="action" />
                      <Box>
                        <Typography>{team.team_name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {team.created_by && `Created by: ${team.created_by}`}
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                )}
              />
            </Grid>
            {selectedTeam && (
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Team Details:
                  </Typography>
                  {(() => {
                    const team = teams.find(t => t.team_id === selectedTeam);
                    if (!team) return null;
                    
                    return (
                      <Box>
                        <Typography variant="body2">
                          <strong>Name:</strong> {team.team_name}
                        </Typography>
                        {team.created_by && (
                          <Typography variant="body2">
                            <strong>Created by:</strong> {team.created_by}
                          </Typography>
                        )}
                        {team.tag_from && team.tag_to && (
                          <Typography variant="body2">
                            <strong>Tags:</strong> {team.tag_from} → {team.tag_to}
                          </Typography>
                        )}
                        {team.current_tag && (
                          <Typography variant="body2">
                            <strong>Current Tag:</strong> {team.current_tag}
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        
        <Divider />
        
        <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
          <Button
            onClick={() => setOpenAssignDialog(false)}
            variant="outlined"
            color="inherit"
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            onClick={assignTeamToSection}
            variant="contained"
            color="primary"
            disabled={!selectedTeam || assigning}
            startIcon={assigning ? <CircularProgress size={20} /> : <PersonAddIcon />}
          >
            {assigning ? 'Assigning...' : 'Assign Team'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default ViewSectionsDialog;