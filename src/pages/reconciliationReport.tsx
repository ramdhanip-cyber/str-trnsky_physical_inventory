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
  Autocomplete
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Location {
  location_id: number | string;
  location_desc: string;
}

const ReconciliationRecord: React.FC = () => {
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
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
    <main style={{ padding: '20px' }}>
      <Card sx={{ maxWidth: 450, boxShadow: 3 }}>
        <CardHeader
          title="Reconciliation Report by Form and Size"
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
          onClick={() => setIsOpen(!isOpen)}
          action={
            <ExpandMoreIcon sx={{ 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', 
              transition: '0.3s' 
            }} />
          }
          sx={{ 
            cursor: 'pointer', 
            bgcolor: '#f8fafc',
            '&:hover': { bgcolor: '#f1f5f9' }
          }}
        />

        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <CardContent sx={{ borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
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
                    label="Search Location"
                    variant="outlined"
                    size="small"
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
                sx={{ height: '40px', fontWeight: 'bold' }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'GENERATE REPORT'}
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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </main>
  );
};

export default ReconciliationRecord;

