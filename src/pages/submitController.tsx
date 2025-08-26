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
  Button
} from '@mui/material';
import { 
  Search, 
  Refresh, 
  Assignment,
  LocationOn,
  CheckCircle,
  Pending,
  Cancel
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { servicesAPI } from '../config/api';

interface AssignedLocation {
  id: number;
  location_id: number;
  sub_location_id: number;
  assigned_at: string;
  competed_at: string | null;
  team_id: number;
  status: 'active' | 'inactive' | 'completed';
  user_names: string;
  location_name?: string;
  team_name?: string;
}

const AssignedPage = () => {
  const navigate = useNavigate();
  const [assignedLocations, setAssignedLocations] = useState<AssignedLocation[]>([]);
  const [uniqueLocations, setUniqueLocations] = useState<AssignedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAssignedLocations();
  }, []);

  useEffect(() => {
    if (assignedLocations.length > 0) {
      // Get unique locations based on location_id
      const unique = assignedLocations.filter(
        (location, index, self) => index === self.findIndex(
          (t) => t.location_id === location.location_id
        )
      );
      setUniqueLocations(unique);
    }
  }, [assignedLocations]);

  const fetchAssignedLocations = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getAssignedLocations();
      setAssignedLocations(response.data);
    } catch (error) {
      console.error('Error fetching assigned locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = uniqueLocations.filter((location) => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    
    const fieldsToSearch = [
      location.location_id?.toString() ?? '',
      location.team_id?.toString() ?? '',
      location.user_names ?? '',
      location.location_name ?? '',
      location.team_name ?? ''
    ];
  
    return fieldsToSearch.some(field => 
      field.toLowerCase().includes(searchTermLower)
    );
  });

  const handleViewCountReview = (locationId: number) => {
    navigate(`/count-review/${locationId}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle color="success" />;
      case 'inactive': return <Pending color="warning" />;
      case 'completed': return <Cancel color="primary" />;
      default: return <Pending color="action" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Assigned Inventory
      </Typography>

      {/* Search */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            variant="outlined"
            placeholder="Search locations, teams or users..."
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
            }}
          />

          <Tooltip title="Refresh data">
            <IconButton onClick={fetchAssignedLocations}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Card>

      {/* Location Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredData.length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="h6" align="center" sx={{ p: 4 }}>
                No assigned locations found
              </Typography>
            </Grid>
          ) : (
            filteredData.map((location) => (
              <Grid item xs={12} sm={6} md={4} key={location.location_id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        <LocationOn />
                      </Avatar>
                      <Typography variant="h6" component="div">
                        {location.location_name || `Location #${location.location_id}`}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Team:</strong> {location.team_name || location.team_id}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Assigned to:</strong> {location.user_names}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getStatusIcon(location.status ?? 'inactive')}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {(location.status?.charAt(0)?.toUpperCase() ?? '') + 
                         (location.status?.slice(1) ?? '')}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      Assigned on: {formatDate(location.assigned_at)}
                    </Typography>
                    {location.competed_at && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Completed on: {formatDate(location.competed_at)}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      startIcon={<Assignment />}
                      onClick={() => handleViewCountReview(location.location_id)}
                    >
                      View Counts
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Box>
  );
};

export default AssignedPage;