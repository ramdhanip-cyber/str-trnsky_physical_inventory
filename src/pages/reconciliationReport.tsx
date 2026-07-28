import React, { useState, useEffect } from 'react';
import { servicesAPI } from '../config/api';
import { 
  Snackbar, 
  Alert, 
  CircularProgress, 
  TextField, 
  Button, 
  Card, 
  CardHeader, 
  CardContent,
  Collapse,
  Autocomplete,
  Box,
  Typography,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface Location {
  location_id: number | string;
  location_desc: string;
}

const ReconciliationRecord: React.FC = () => {
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingLocs, setFetchingLocs] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  // Load locations on mount
  useEffect(() => {
    const loadLocations = async () => {
      setFetchingLocs(true);
      try {
        const response = await servicesAPI.getLocations();

        if (Array.isArray(response.data)) {
          setLocations(response.data);
        }
      } catch (error: any) {
        console.error("Error fetching locations:", error);
        setSnackbar({ open: true, message: "Failed to load location list", severity: 'error' });
      } finally {
        setFetchingLocs(false);
      }
    };

    loadLocations();
  }, []);

  const handleApiCall = async () => {
    if (!selectedLocation) {
      setSnackbar({ open: true, message: "Please select a Location", severity: 'error' });
      return;
    }
    
    setLoading(true);

    try {
      const response = await servicesAPI.getReconciliationReport({ location_desc: selectedLocation.location_desc });

      // We pass "locationName" as the key here
      navigate('/reports/reconciliation/view', { 
        state: { 
          reportData: response.data.data, 
          locationName: selectedLocation.location_desc 
        } 
      });
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Failed to generate report";
      setSnackbar({ open: true, message: `Error: ${errorMsg}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '32px 24px', maxWidth: '600px', margin: '0 auto' }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: '#eff6ff', color: '#2563eb', display: 'flex' }}>
            <AssessmentIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} color="#0f172a">
              Reconciliation Reports
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select a location to generate summary reports grouped by Form and Size
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Card sx={{ borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <CardHeader
          title="Reconciliation Report by Form and Size"
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: '#0f172a' }}
          onClick={() => setIsOpen(!isOpen)}
          action={
            <ExpandMoreIcon sx={{ 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', 
              transition: '0.3s',
              color: '#64748b'
            }} />
          }
          sx={{ 
            cursor: 'pointer', 
            bgcolor: '#f8fafc',
            py: 2,
            px: 2.5,
            borderBottom: isOpen ? '1px solid #e2e8f0' : 'none',
            '&:hover': { bgcolor: '#f1f5f9' }
          }}
        />

        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <CardContent sx={{ p: 3 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <Autocomplete
                options={locations}
                loading={fetchingLocs}
                getOptionLabel={(option) => `${option.location_desc} (${option.location_id})`}
                isOptionEqualToValue={(option, value) => option.location_id === value.location_id}
                value={selectedLocation}
                onChange={(_event, newValue) => setSelectedLocation(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search & Select Location"
                    variant="outlined"
                    size="medium"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: '#ffffff'
                      }
                    }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {fetchingLocs ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              <Button
                variant="contained"
                onClick={handleApiCall}
                disabled={loading || !selectedLocation}
                fullWidth
                endIcon={!loading && <PlayArrowIcon />}
                sx={{ 
                  height: '46px', 
                  fontWeight: 700, 
                  fontSize: '0.95rem',
                  borderRadius: 2,
                  bgcolor: '#0C2C48',
                  boxShadow: '0 4px 12px rgba(12, 44, 72, 0.25)',
                  '&:hover': {
                    bgcolor: '#163b5c',
                    boxShadow: '0 6px 16px rgba(12, 44, 72, 0.35)'
                  },
                  textTransform: 'none'
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Collapse>
      </Card>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </main>
  );
};

export default ReconciliationRecord;

