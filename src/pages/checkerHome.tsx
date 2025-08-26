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
  Warning,
  PlayArrow,
  TaskAlt,
  VerifiedUser
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { servicesAPI } from '../config/api';

// Define the structure of your Check Data
interface CheckData {
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

const StatusChip = styled(Chip)(() => ({
  fontWeight: 600,
  textTransform: 'capitalize',
}));

const CheckerHome: React.FC = () => {
  const [checks, setChecks] = useState<CheckData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const navigate = useNavigate();
  const fullName = localStorage.getItem('full_name');

  const fetchChecks = async () => {
    try {
      const userId = localStorage.getItem("User ID");
      const response = await servicesAPI.getCheckerLocations(userId || '');
      
      setChecks(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChecks();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchChecks();
  };

  const filteredChecks = checks.filter(check =>
    Object.values(check).some(
      value => value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in progress':
        return <PlayArrow sx={{ color: '#FFA726' }} />; // Orange
      case 'count completed':
        return <TaskAlt sx={{ color: '#66BB6A' }} />; // Green
      case 'assigned checker':
        return <AssignmentInd sx={{ color: '#42A5F5' }} />; // Blue
      case 'check completed':
        return <VerifiedUser sx={{ color: '#66BB6A' }} />; // Green
      default:
        return <Warning sx={{ color: '#EF5350' }} />; // Red
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in progress':
        return {
          bgcolor: '#FFF3E0',
          color: '#E65100',
          borderColor: '#FFB74D'
        };
      case 'count completed':
        return {
          bgcolor: '#E8F5E9',
          color: '#2E7D32',
          borderColor: '#81C784'
        };
      case 'assigned checker':
        return {
          bgcolor: '#E3F2FD',
          color: '#1565C0',
          borderColor: '#64B5F6'
        };
      case 'check completed':
        return {
          bgcolor: '#E8F5E9',
          color: '#2E7D32',
          borderColor: '#81C784'
        };
      default:
        return {
          bgcolor: '#FFEBEE',
          color: '#C62828',
          borderColor: '#E57373'
        };
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
            Inventory Verification
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
            placeholder="Search verifications..."
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
              {filteredChecks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {searchTerm ? 'No matching verifications found' : 'No verifications available'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredChecks.map((check) => (
                  <StyledTableRow key={`${check.location_id}-${check.sub_location_id}`}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {check.team_name.charAt(0)}
                        </Avatar>
                        <Typography>{check.team_name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={500}>{check.location_desc}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={check.section_desc} 
                        size="small" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(check.status)}
                        <StatusChip
                          label={check.status}
                          sx={{
                            ...getStatusColor(check.status),
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            borderWidth: 1,
                            borderStyle: 'solid'
                          }}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={check.status !== 'Assigned Checker' ? 
                        "Only 'Assigned Checker' verifications can be processed" : 
                        "Verify inventory"}>
                        <span>
                          <IconButton
                            color="primary"
                            onClick={() =>
                              navigate(
                                `/checker-count/${check.location_id}/${check.sub_location_id}/${check.team_id}/${check.user_id}`
                              )
                            }
                            disabled={check.status !== 'Assigned Checker'}
                            sx={{
                              backgroundColor: check.status === 'Assigned Checker' ? 'primary.light' : 'action.disabledBackground',
                              '&:hover': {
                                backgroundColor: check.status === 'Assigned Checker' ? 'primary.main' : 'action.disabledBackground',
                              }
                            }}
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
          Showing {filteredChecks.length} of {checks.length} verifications
        </Typography>
      )}
    </Box>
  );
};

export default CheckerHome;