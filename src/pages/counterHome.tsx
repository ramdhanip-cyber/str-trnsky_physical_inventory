import React, { useEffect, useState } from "react";
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  TextField,
  InputAdornment,
  Skeleton,
  Button
} from "@mui/material";
import { 
  Visibility, 
  Search, 
  Refresh, 
  AssignmentInd,
  CheckCircle,
  PendingActions,
  Warning
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { servicesAPI } from '../config/api';

// Define the structure of your Location Data
interface LocationData {
  user_id: number;
  full_name: string;
  user_name: string;
  role_desc: string;
  team_id: number;
  team_name: string;
  location_id: number;
  location_desc: string;
  sub_location_id: number;
  section_desc: string;
  status: string;
}

// Styled components for better customization
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
  '& .Mui-disabled': {
    cursor: 'not-allowed',
  },
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  fontWeight: 600,
  textTransform: 'capitalize',
  ...(status.toLowerCase() === 'count completed' && {
    backgroundColor: theme.palette.success.light,
    borderColor: theme.palette.success.dark,
  }),
}));

const CounterHome: React.FC = () => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const navigate = useNavigate();
  const fullName = localStorage.getItem('full_name');

  const fetchLocations = async () => {
    try {
      const userId = localStorage.getItem("User ID");
      const response = await servicesAPI.getCounterLocations(userId || '');
      
      setLocations(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLocations();
  };

  const filteredLocations = locations.filter(location =>
    Object.values(location).some(
      value => value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Update status color and icon mappings
  const statusColors = {
    'In Progress': 'warning',
    'Count Completed': 'info',
    'Assigned Checker': 'primary',
    'Check Completed': 'success',
    'Not Started': 'error',
  } as const;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Progress':
        return <PendingActions color="warning" />;
      case 'Count Completed':
        return <CheckCircle color="info" />;
      case 'Assigned Checker':
        return <AssignmentInd color="primary" />;
      case 'Check Completed':
        return <CheckCircle color="success" />;
      default:
        return <Warning color="error" />;
    }
  };

  if (loading && !refreshing) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={56} sx={{ mb: 2 }} />
        {[...Array(5)].map((_, index) => (
          <Skeleton key={index} variant="rectangular" height={52} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        height: "60vh",
        textAlign: "center",
        p: 3
      }}>
        <Warning color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h6" color="error" gutterBottom>
          Error Loading Data
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Refresh />}
          onClick={handleRefresh}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Physical Inventory
          </Typography>
          {fullName && (
            <Typography variant="subtitle1" color="text.secondary">
              Assigned to: <strong>{fullName}</strong>
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search assignments..."
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Refresh data">
            <IconButton 
              onClick={handleRefresh} 
              color="primary"
              disabled={refreshing}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'common.white', fontWeight: 600 }}>Team</TableCell>
                <TableCell sx={{ color: 'common.white', fontWeight: 600 }}>Inventory</TableCell>
                <TableCell sx={{ color: 'common.white', fontWeight: 600 }}>Section</TableCell>
                <TableCell sx={{ color: 'common.white', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: 'common.white', fontWeight: 600 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {searchTerm ? 'No matching assignments found' : 'No assignments available'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLocations.map((location) => (
                  <StyledTableRow key={`${location.location_id}-${location.sub_location_id}`}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {location.team_name.charAt(0)}
                        </Avatar>
                        <Typography>{location.team_name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={500}>{location.location_desc}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={location.section_desc} 
                        size="small" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(location.status)}
                        <StatusChip
                          label={location.status}
                          color={statusColors[location.status as keyof typeof statusColors] || 'default'}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={location.status === 'Count Completed' ? "This assignment is completed" : "View details"}>
                        <span> {/* Wrap IconButton in span for tooltip to work when disabled */}
                          <IconButton
                            color="primary"
                            onClick={() =>
                              navigate(
                                `/counter-count/${location.location_id}/${location.sub_location_id}/${location.team_id}/${location.user_id}`
                              )
                            }
                            disabled={location.status !== 'In Progress'}
                          >
                            <Visibility />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </StyledTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {!loading && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Showing {filteredLocations.length} of {locations.length} assignments
        </Typography>
      )}
    </Box>
  );
};

export default CounterHome;