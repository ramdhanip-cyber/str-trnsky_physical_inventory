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
  Zoom
} from '@mui/material';
import { 
  Search, 
  Refresh, 
  Assignment,
  LocationOn,
  CheckCircle,
  Pending,
  People,
  Schedule,
  ViewList,
  Dashboard,
  Analytics
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

const AssignedPage = () => {
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
        location.user_names ?? '',
        location.location_name ?? '',
        location.team_name ?? ''
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
    navigate(`/count-review/${locationId}`);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'warning';
      case 'Count Completed': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h3" component="h1" sx={{ 
              fontWeight: 700, 
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}>
              Inventory Management Dashboard
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Monitor and manage assigned inventory locations
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2}>
            <Tooltip title="Refresh data">
              <IconButton 
                onClick={fetchAssignedLocations}
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.total}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Locations
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <LocationOn />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.inProgress}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      In Progress
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <Pending />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>


          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.countCompleted}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Count Completed
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <CheckCircle />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

      </Box>

      {/* Search and Filter Section */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              variant="outlined"
              placeholder="Search locations, teams, or users..."
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
              }}
              sx={{ flexGrow: 1 }}
            />

            <Stack direction="row" spacing={1}>
              {['all', 'In Progress', 'Count Completed'].map((status) => (
                <Chip
                  key={status}
                  label={status}
                  onClick={() => setStatusFilter(status as any)}
                  color={statusFilter === status ? 'primary' : 'default'}
                  variant={statusFilter === status ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>

            <Stack direction="row" spacing={1}>
              <Tooltip title="Grid View">
                <IconButton 
                  onClick={() => setViewMode('grid')}
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                >
                  <Dashboard />
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
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Results Section */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={60} />
            <Typography variant="h6" color="text.secondary">
              Loading inventory data...
            </Typography>
          </Stack>
        </Box>
      ) : filteredData.length === 0 ? (
        <Card sx={{ textAlign: 'center', p: 6 }}>
          <CardContent>
            <Avatar sx={{ bgcolor: 'grey.100', width: 80, height: 80, mx: 'auto', mb: 2 }}>
              <LocationOn sx={{ fontSize: 40, color: 'grey.400' }} />
            </Avatar>
            <Typography variant="h5" gutterBottom>
              No locations found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search criteria or filters'
                : 'No inventory locations have been assigned yet'
              }
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredData.map((location, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={location.location_id}>
              <Zoom in={true} timeout={300 + index * 100}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: 'primary.main', 
                        mr: 2,
                        width: 48,
                        height: 48
                      }}>
                        <LocationOn />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                          {location.location_name || `Location #${location.location_id}`}
                        </Typography>
                        <Chip 
                          label={location.overall_status}
                          color={getStatusColor(location.overall_status) as any}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <People sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Team
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {location.team_name || 'No Team Assigned'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Assignment sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Assigned to
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {location.user_names}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Schedule sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Assigned on
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {formatDate(location.assigned_at)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Analytics sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Sections Progress
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {location.count_completed + location.completed + location.assigned_checker} / {location.total_sections} completed
                          </Typography>
                        </Box>
                      </Box>

                      {location.competed_at && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircle sx={{ mr: 1, color: 'success.main', fontSize: 20 }} />
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
                      startIcon={<Analytics />}
                      onClick={() => handleViewCountReview(location.location_id)}
                      sx={{ 
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        py: 1.5
                      }}
                    >
                      View Counts
                    </Button>
                  </CardActions>
                </Card>
              </Zoom>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default AssignedPage;