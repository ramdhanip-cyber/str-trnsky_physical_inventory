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
  PersonRemove as PersonRemoveIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  AssignmentInd as AssignmentIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Sort as SortIcon,
  Group as GroupIcon,
  Download as DownloadIcon
} from "@mui/icons-material";
import { format } from "date-fns";
import { visuallyHidden } from '@mui/utils';
import * as XLSX from "xlsx";

interface Section {
  section_id: string;
  section_desc: string;
  location_id: string;
  created_at?: string;
}

interface TeamMember {
  id?: string;
  user_id: string;
  full_name: string;
  role_id: string;
  role_desc: string;
}

interface Team {
  team_id: string;
  team_name: string;
  created_at?: string;
  created_by?: string;
  tag_from?: string;
  tag_to?: string;
  current_tag?: string;
  members?: TeamMember[];
}

interface AssignedLocation {
  id: string;
  location_id: string;
  sub_location_id: string;
  assigned_at: string;
  competed_at: string | null;
  team_id: string;
  status: 'In Progress' | 'Count Completed' | 'Assigned Checker' | 'Completed';
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
  'In Progress': 'primary',
  'Count Completed': 'default',
  'Assigned Checker': 'default',
  'Completed': 'success'
};

const statusIcons = {
  'In Progress': <CircularProgress size={14} />,
  'Count Completed': <CheckCircleIcon fontSize="small" />,
  'Assigned Checker': <AssignmentIcon fontSize="small" />,
  'Completed': <CheckCircleIcon fontSize="small" />
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<{id: string, name: string} | null>(null);
  const [unassignConfirmOpen, setUnassignConfirmOpen] = useState(false);
  const [sectionToUnassign, setSectionToUnassign] = useState<{locationId: string, sectionId: string, sectionName: string, teamName: string} | null>(null);
  const [unassigning, setUnassigning] = useState<string | null>(null);
  const [openAssignDialog, setOpenAssignDialog] = useState<boolean>(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // State for success and error messages
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
      const { data } = await servicesAPI.getTeamsWithMembers();
      console.log('Teams with members:', data);
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

  // Filter sections based on search query and active tab
  const filteredSections = React.useMemo(() => {
    return sections.filter((section) => {
      // Search filter
      const matchesSearch = section.section_desc.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter based on active tab
      if (activeTab === 0) {
        // "All" tab - show all sections
        return matchesSearch;
      }
      
      const assignment = assignedLocations.find(
        loc => loc.sub_location_id.toString() === section.section_id.toString() && 
               loc.location_id.toString() === location_id.toString()
      );
      
      // Map tab index to status
      const statusByTab = [
        null, // Tab 0 = All
        'In Progress', // Tab 1
        'Count Completed', // Tab 2
        'Assigned Checker', // Tab 3
        'Completed' // Tab 4
      ];
      
      const expectedStatus = statusByTab[activeTab];
      const currentStatus = assignment?.status;
      
      return matchesSearch && currentStatus === expectedStatus;
    });
  }, [sections, searchQuery, activeTab, assignedLocations, location_id]);

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
    // Find the section to get its name for the confirmation dialog
    const section = sections.find(s => s.section_id.toString() === id);
    setSectionToDelete({
      id: id,
      name: section?.section_desc || `Section ${id}`
    });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sectionToDelete) return;
    
    try {
      setDeleting(sectionToDelete.id);
      setDeleteConfirmOpen(false);
      await servicesAPI.deleteSection(sectionToDelete.id);
      // Refresh data after deletion
      fetchSections();
      fetchAssignedLocations();
      setSuccess("Section deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      console.error("Error deleting section:", error);
      const axiosError = error as { response?: { data?: { error?: string } } };
      const errorMessage = axiosError.response?.data?.error || "Failed to delete section. Please try again.";
      setError(errorMessage);
    } finally {
      setDeleting(null);
      setSectionToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setSectionToDelete(null);
  };

  const handleUnassignTeam = (sectionId: string) => {
    console.log("=== DEBUGGING UNASSIGN TEAM ===");
    console.log("handleUnassignTeam called with sectionId:", sectionId, "type:", typeof sectionId);
    
    // Ensure data is loaded
    if (loading || sections.length === 0 || assignedLocations.length === 0) {
      console.log("Data still loading or empty, aborting unassign");
      setError("Data is still loading. Please wait and try again.");
      return;
    }
    
    // Use the same logic as getAssignedTeamInfo for consistency
    const section = sections.find(s => s.section_id.toString() === sectionId.toString());
    const assignment = getAssignedTeamInfo(sectionId);
    
    console.log("Found section:", section);
    console.log("Found assignment using getAssignedTeamInfo:", assignment);
    console.log("=== END DEBUG ===");
    
    if (section && assignment) {
      const unassignData = {
        locationId: location_id.toString(),
        sectionId: sectionId.toString(),
        sectionName: section.section_desc,
        teamName: assignment.team_name || 'Unknown Team'
      };
      console.log("Setting sectionToUnassign:", unassignData);
      setSectionToUnassign(unassignData);
      setUnassignConfirmOpen(true);
      console.log("Opening unassign confirmation dialog");
    } else {
      // Provide more specific error messages
      if (!section) {
        console.log("Section not found for ID:", sectionId);
        setError(`Error: Section with ID ${sectionId} not found!`);
      } else if (!assignment) {
        console.log("Assignment not found for section ID:", sectionId, "and location ID:", location_id);
        setError(`Error: No team assignment found for this section. The section may not be assigned to any team.`);
      }
    }
  };

  const handleUnassignConfirm = async () => {
    if (!sectionToUnassign) {
      console.log("No sectionToUnassign data available");
      setError("Error: No section data available for unassignment");
      return;
    }
    
    console.log("handleUnassignConfirm called with:", sectionToUnassign);
    console.log("Checking if servicesAPI.unassignTeam exists:", typeof servicesAPI.unassignTeam);
    
    if (typeof servicesAPI.unassignTeam !== 'function') {
      console.error("servicesAPI.unassignTeam is not a function!");
      setError("Error: API function not available!");
      return;
    }
    
    try {
      setUnassigning(sectionToUnassign.sectionId);
      setUnassignConfirmOpen(false);
      console.log("Making API call to unassign team:", sectionToUnassign.locationId, sectionToUnassign.sectionId);
      console.log("API call URL will be:", `/services/assign-team/${sectionToUnassign.locationId}/${sectionToUnassign.sectionId}`);
      
      const response = await servicesAPI.unassignTeam(sectionToUnassign.locationId, sectionToUnassign.sectionId);
      console.log("API call successful, response:", response);
      
      // Refresh data after unassignment
      fetchSections();
      fetchAssignedLocations();
      setSuccess(`Team "${sectionToUnassign.teamName}" unassigned successfully from section "${sectionToUnassign.sectionName}"!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      console.error("Error unassigning team:", error);
      const axiosError = error as { response?: { data?: { error?: string; message?: string } } };
      const errorMessage = axiosError.response?.data?.error || 
                           axiosError.response?.data?.message || 
                           "Failed to unassign team. Please try again.";
      setError(errorMessage);
      console.log("Full error response:", axiosError.response?.data);
    } finally {
      setUnassigning(null);
      setSectionToUnassign(null);
    }
  };

  const handleUnassignCancel = () => {
    setUnassignConfirmOpen(false);
    setSectionToUnassign(null);
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

  const getTeamMembersWithRolesText = (assignment: AssignedLocation | null): string => {
    if (!assignment) return "-";

    const sourceMembers =
      assignment.team_details?.members ??
      teams.find((team) => team.team_id.toString() === assignment.team_id.toString())?.members ??
      [];

    if (!sourceMembers || sourceMembers.length === 0) return "-";

    const groupedMembers = sourceMembers.reduce<Record<string, Set<string>>>((acc, member) => {
      const name = member.full_name?.trim();
      if (!name) return acc;
      if (!acc[name]) acc[name] = new Set<string>();
      if (member.role_desc?.trim()) {
        acc[name].add(member.role_desc.trim());
      }
      return acc;
    }, {});

    const memberText = Object.entries(groupedMembers).map(([name, roleSet]) => {
      const roles = Array.from(roleSet);
      return roles.length > 0 ? `${name} (${roles.join(", ")})` : name;
    });

    return memberText.length > 0 ? memberText.join("; ") : "-";
  };

  const handleExportSections = () => {
    try {
      const exportRows = sortedSections.map((section, index) => {
        const assignment = getAssignedTeamInfo(section.section_id);
        return {
          "No.": index + 1,
          "Section Name": section.section_desc || "-",
          "Assigned Team": assignment?.team_name || "Not Assigned",
          "Team Members & Roles": getTeamMembersWithRolesText(assignment),
          "Assignment Status": assignment?.status || "Not Assigned",
          "Assigned At": assignment?.assigned_at ? format(new Date(assignment.assigned_at), "MMM dd, yyyy HH:mm") : "-"
        };
      });
      const worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.sheet_add_aoa(worksheet, [
        ["Sections Management Export"],
        [`Location: ${location_desc} | Branch: ${branch} | Warehouse: ${warehouse}`],
        [`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`],
        []
      ], { origin: "A1" });
      XLSX.utils.sheet_add_json(worksheet, exportRows, { origin: "A5", skipHeader: false });
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 24 },
        { wch: 70 },
        { wch: 20 },
        { wch: 22 }
      ];
      worksheet["!autofilter"] = { ref: "A5:F5" };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sections Export");
      const fileName = `Sections_Management_${location_id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      setSuccess("Sections exported successfully.");
    } catch (error) {
      console.error("Error exporting sections:", error);
      setError("Failed to export sections. Please try again.");
    }
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
    return assignedLocations.filter(loc => 
      loc.status === status && 
      loc.location_id.toString() === location_id.toString()
    ).length;
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
              <MenuItem onClick={() => { handleExportSections(); handleMenuClose(); }}>
                <DownloadIcon sx={{ mr: 1 }} /> Export Sections
              </MenuItem>
              <MenuItem onClick={handleMenuClose}>
                Filter Sections
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
              </Box>
              <Tabs
                value={activeTab}
                onChange={(_e, newValue) => setActiveTab(newValue)}
                aria-label="section view tabs"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="All" icon={<GroupIcon />} iconPosition="start" />
                <Tab 
                  label="In Progress" 
                  icon={
                    <Badge badgeContent={getStatusCount('In Progress')} color="primary">
                      <CircularProgress size={16} />
                    </Badge>
                  } 
                  iconPosition="start" 
                />
                <Tab 
                  label="Count Completed" 
                  icon={
                    <Badge badgeContent={getStatusCount('Count Completed')} color="default">
                      <CheckCircleIcon />
                    </Badge>
                  } 
                  iconPosition="start" 
                />
                <Tab 
                  label="Assigned Checker" 
                  icon={
                    <Badge badgeContent={getStatusCount('Assigned Checker')} color="default">
                      <AssignmentIcon />
                    </Badge>
                  } 
                  iconPosition="start" 
                />
                <Tab 
                  label="Completed" 
                  icon={
                    <Badge badgeContent={getStatusCount('Completed')} color="success">
                      <CheckCircleIcon />
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
                      <TableCell sx={{ color: 'common.white' }}>Assigned Team</TableCell>
                      <TableCell sx={{ color: 'common.white' }}>Status</TableCell>
                      <TableCell sx={{ color: 'common.white' }}>Assigned At</TableCell>
                      <TableCell sx={{ color: 'common.white' }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <CircularProgress />
                          <Typography sx={{ mt: 1 }}>Loading sections...</Typography>
                        </TableCell>
                      </TableRow>
                    ) : sortedSections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
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
                                  color={statusColors[assignment?.status || 'In Progress'] as 'default' | 'primary' | 'success' | 'error'}
                                  size="small"
                                  icon={statusIcons[assignment?.status || 'In Progress']}
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
                                {isAssigned && assignment && (
                                  <Tooltip title="Unassign Team">
                                    <IconButton
                                      color="warning"
                                      onClick={() => {
                                        console.log("=== UNASSIGN BUTTON CLICKED ===");
                                        console.log("Section ID:", section.section_id);
                                        console.log("Is Assigned:", isAssigned);
                                        console.log("Assignment:", assignment);
                                        handleUnassignTeam(section.section_id);
                                      }}
                                      disabled={unassigning === section.section_id || loading}
                                      size="small"
                                    >
                                      {unassigning === section.section_id ? (
                                        <CircularProgress size={20} />
                                      ) : (
                                        <PersonRemoveIcon fontSize="small" />
                                      )}
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
            onClick={handleExportSections}
            variant="contained"
            color="success"
            startIcon={<DownloadIcon />}
          >
            Export
          </Button>
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
                renderOption={(props, team) => {
                  // Count unique users
                  const uniqueUserCount = team.members 
                    ? new Set(team.members.map(m => m.user_id)).size 
                    : 0;
                  
                  return (
                    <li {...props}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GroupIcon color="action" />
                        <Box sx={{ flex: 1 }}>
                          <Typography>{team.team_name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {uniqueUserCount > 0 
                              ? `${uniqueUserCount} member${uniqueUserCount > 1 ? 's' : ''}`
                              : 'No members'
                            }
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  );
                }}
              />
            </Grid>
            {selectedTeam && (
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Team Members:
                  </Typography>
                  {(() => {
                    const team = teams.find(t => t.team_id === selectedTeam);
                    if (!team) return null;
                    
                    if (!team.members || team.members.length === 0) {
                      return (
                        <Typography variant="body2" color="textSecondary">
                          No members assigned to this team
                        </Typography>
                      );
                    }
                    
                    // Group members by user_id to combine roles
                    console.log('Team members before grouping:', team.members);
                    const groupedMembers = team.members.reduce((acc, member) => {
                      if (!acc[member.user_id]) {
                        acc[member.user_id] = {
                          user_id: member.user_id,
                          full_name: member.full_name,
                          roles: []
                        };
                      }
                      if (member.role_desc) {
                        acc[member.user_id].roles.push(member.role_desc);
                      }
                      return acc;
                    }, {} as Record<string, { user_id: string; full_name: string; roles: string[] }>);
                    
                    const uniqueMembers = Object.values(groupedMembers);
                    console.log('Grouped members:', uniqueMembers);
                    
                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                        {uniqueMembers.map((member) => (
                          <Box 
                            key={member.user_id} 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              p: 1,
                              backgroundColor: 'white',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                              {member.full_name?.charAt(0) || '?'}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {member.full_name || 'Unknown User'}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                {member.roles.map((role, idx) => (
                                  <Chip 
                                    key={idx}
                                    label={role} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          </Box>
                        ))}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete section "{sectionToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} variant="outlined" color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" startIcon={<DeleteIcon />}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unassign Confirmation Dialog */}
      <Dialog open={unassignConfirmOpen} onClose={handleUnassignCancel} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Unassignment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to unassign team "{sectionToUnassign?.teamName}" from section "{sectionToUnassign?.sectionName}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUnassignCancel} variant="outlined" color="primary">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              console.log("=== CONFIRM UNASSIGN BUTTON CLICKED ===");
              handleUnassignConfirm();
            }} 
            variant="contained" 
            color="warning" 
            startIcon={<AssignmentIcon />}
          >
            Unassign
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default ViewSectionsDialog;