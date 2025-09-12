import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  Button,
  Chip,
  Container,
  Stack,
  Paper,
  styled,
  Zoom
} from '@mui/material';
import { 
  Search, 
  Refresh, 
  Assignment,
  LocationOn,
  CheckCircle,
  Pending,
  Group,
  Person,
  Schedule,
  Analytics,
  ViewModule,
  ViewList
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { servicesAPI } from '../config/api';


interface LocationSummary {
  location_id: number;
  location_name?: string;
  team_name?: string;
  user_names: string;
  assigned_at: string;
  competed_at: string | null;
  total_sections: number;
  assigned_sections: number;
  count_completed: number;
  completed: number;
  assigned_checker: number;
  in_progress: number;
  no_status: number;
  overall_status: 'In Progress' | 'Count Completed';
}

// Styled components for modern UI
const GradientCard = styled(Card)(() => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
}));

const StatCard = styled(Card)(() => ({
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(0, 0, 0, 0.05)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
  },
}));

const LocationCard = styled(Card)(() => ({
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(0, 0, 0, 0.05)',
  transition: 'all 0.3s ease',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
  },
}));

const AssignedChecker = () => {
  const navigate = useNavigate();
  const [locationSummaries, setLocationSummaries] = useState<LocationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'In Progress' | 'Count Completed'>('all');

  useEffect(() => {
    fetchAssignedLocations();
  }, []);

  const fetchAssignedLocations = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getLocationSummary();
      console.log('Location summary response:', response.data);
      console.log('Sample data structure:', response.data.slice(0, 3));
      // Ensure we always set an array
      setLocationSummaries(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching location summary:', error);
      // Set empty array on error
      setLocationSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = (locationSummaries || []).filter((location) => {
    // Search filter
    const searchMatch = !searchTerm || (() => {
      const searchTermLower = searchTerm.toLowerCase();
      const fieldsToSearch = [
        location.location_id?.toString() ?? '',
        location.team_name ?? '',
        location.user_names ?? '',
        location.location_name ?? ''
      ];
      return fieldsToSearch.some(field => 
        field.toLowerCase().includes(searchTermLower)
      );
    })();

    // Status filter
    const statusMatch = statusFilter === 'all' || location.overall_status === statusFilter;

    return searchMatch && statusMatch;
  });

  // Calculate statistics
  const stats = {
    total: (locationSummaries || []).length,
    inProgress: (locationSummaries || []).filter(l => l.overall_status === 'In Progress').length,
    countCompleted: (locationSummaries || []).filter(l => l.overall_status === 'Count Completed').length,
  };

  const handleViewCountReview = (locationId: number) => {
    navigate(`/check-review/${locationId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'warning';
      case 'Count Completed': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <GradientCard sx={{ p: 4, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Assigned Checkers
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Monitor and manage checker assignments across all locations
              </Typography>
            </Box>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
              <Assignment sx={{ fontSize: 40 }} />
            </Avatar>
          </Box>
        </GradientCard>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Zoom in={true} timeout={500}>
              <StatCard sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {stats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Locations
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 56, height: 56 }}>
                    <LocationOn sx={{ fontSize: 28 }} />
                  </Avatar>
                </Box>
              </StatCard>
            </Zoom>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Zoom in={true} timeout={700}>
              <StatCard sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      {stats.inProgress}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.light', width: 56, height: 56 }}>
                    <Pending sx={{ fontSize: 28 }} />
                  </Avatar>
                </Box>
              </StatCard>
            </Zoom>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Zoom in={true} timeout={900}>
              <StatCard sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {stats.countCompleted}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Count Completed
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.light', width: 56, height: 56 }}>
                    <CheckCircle sx={{ fontSize: 28 }} />
                  </Avatar>
                </Box>
              </StatCard>
            </Zoom>
          </Grid>
        </Grid>
      </Box>

      {/* Search and Filter Section */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            variant="outlined"
            placeholder="Search locations, teams, or users..."
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              sx: { borderRadius: '12px' }
            }}
          />
          
          <Stack direction="row" spacing={1}>
            <Chip
              label="All"
              onClick={() => setStatusFilter('all')}
              color={statusFilter === 'all' ? 'primary' : 'default'}
              variant={statusFilter === 'all' ? 'filled' : 'outlined'}
            />
            <Chip
              label="In Progress"
              onClick={() => setStatusFilter('In Progress')}
              color={statusFilter === 'In Progress' ? 'warning' : 'default'}
              variant={statusFilter === 'In Progress' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Count Completed"
              onClick={() => setStatusFilter('Count Completed')}
              color={statusFilter === 'Count Completed' ? 'success' : 'default'}
              variant={statusFilter === 'Count Completed' ? 'filled' : 'outlined'}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Grid View">
              <IconButton 
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
              >
                <ViewModule />
              </IconButton>
            </Tooltip>
            <Tooltip title="List View">
              <IconButton 
                onClick={() => setViewMode('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
              >
                <ViewList />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchAssignedLocations}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Location Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredData.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '16px' }}>
                <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  No assigned locations found
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Try adjusting your search criteria or filters
                </Typography>
              </Paper>
            </Grid>
          ) : (
            filteredData.map((location, index) => (
              <Grid item xs={12} sm={6} md={4} key={location.location_id}>
                <Zoom in={true} timeout={500 + (index * 100)}>
                  <LocationCard>
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 48, height: 48 }}>
                          <LocationOn />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                            {location.location_name || `Location #${location.location_id}`}
                          </Typography>
                          <Chip 
                            label={location.overall_status} 
                            color={getStatusColor(location.overall_status) as any}
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Group sx={{ mr: 2, color: 'text.secondary', fontSize: 20 }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Team
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {location.team_name || 'Unassigned'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ mr: 2, color: 'text.secondary', fontSize: 20 }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Assigned to
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {location.user_names || 'No one assigned'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Analytics sx={{ mr: 2, color: 'text.secondary', fontSize: 20 }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Sections Progress
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {location.count_completed + location.completed + location.assigned_checker} / {location.total_sections} completed
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Schedule sx={{ mr: 2, color: 'text.secondary', fontSize: 20 }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Assigned on
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {formatDate(location.assigned_at)}
                            </Typography>
                          </Box>
                        </Box>

                        {location.competed_at && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CheckCircle sx={{ mr: 2, color: 'text.secondary', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Completed on
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {formatDate(location.competed_at)}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                    <CardActions sx={{ p: 3, pt: 0 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Assignment />}
                        onClick={() => handleViewCountReview(location.location_id)}
                        sx={{ borderRadius: '12px', py: 1.5 }}
                      >
                        View Counts
                      </Button>
                    </CardActions>
                  </LocationCard>
                </Zoom>
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Container>
  );
};

export default AssignedChecker;