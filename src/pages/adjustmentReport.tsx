import React, { useState, useEffect } from 'react';
import { servicesAPI } from '../config/api';
import {
  Snackbar,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Autocomplete,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import TuneIcon from '@mui/icons-material/Tune';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Location {
  location_id: number | string;
  location_desc: string;
}

const AdjustmentReport: React.FC = () => {
  const navigate = useNavigate();

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingLocs, setFetchingLocs] = useState(false);
  const [hovered, setHovered] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  useEffect(() => {
    const loadLocations = async () => {
      setFetchingLocs(true);
      try {
        const response = await servicesAPI.getLocations();
        if (Array.isArray(response.data)) setLocations(response.data);
      } catch (error: any) {
        console.error('Error fetching locations:', error);
        setSnackbar({ open: true, message: 'Failed to load location list', severity: 'error' });
      } finally {
        setFetchingLocs(false);
      }
    };
    loadLocations();
  }, []);

  const handleGenerate = async () => {
    if (!selectedLocation) {
      setSnackbar({ open: true, message: 'Please select a Location', severity: 'error' });
      return;
    }
    setLoading(true);
    try {
      const response = await servicesAPI.getPreAdjustmentReport({
        location_id: selectedLocation.location_id,
      });
      navigate('/reports/adjustment/view', {
        state: { reportData: response.data.data, locationName: selectedLocation.location_desc, locationId: selectedLocation.location_id },
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to generate adjustment report';
      setSnackbar({ open: true, message: `Error: ${errorMsg}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const accentColor = '#2563eb';
  const gradientFrom = '#2563eb';
  const gradientTo = '#1e3a8a';

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 112px)',
        bgcolor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        px: 3,
        pt: 3,
        pb: 2,
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 520 }}>

        {/* ── Hero Header ── */}
        <Box
          sx={{
            textAlign: 'center',
            mb: 3,
            p: 3,
            borderRadius: '20px',
            background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              bgcolor: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 1.5,
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)',
            }}
          >
            <TuneIcon sx={{ fontSize: 30, color: '#ffffff' }} />
          </Box>

          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: '13px !important', color: '#60a5fa !important' }} />}
            label="INVENTORY ADJUSTMENTS"
            size="small"
            sx={{
              mb: 1,
              bgcolor: 'rgba(255,255,255,0.15)',
              color: '#dbeafe',
              fontWeight: 700,
              fontSize: '0.68rem',
              letterSpacing: '0.08em',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          />

          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ letterSpacing: '-0.02em', mb: 0.5, textShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
          >
            Pre-Adjustment Report
          </Typography>

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', maxWidth: 360, mx: 'auto' }}>
            Select a location to view all items marked for physical inventory adjustment.
          </Typography>
        </Box>

        {/* ── Main Form Card ── */}
        <Box
          sx={{
            bgcolor: '#ffffff',
            borderRadius: '20px',
            p: 3,
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
          <Box>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}
            >
              Select Location
            </Typography>

            <Autocomplete
              options={locations}
              getOptionLabel={(opt) => opt.location_desc || ''}
              value={selectedLocation}
              onChange={(_, val) => setSelectedLocation(val)}
              loading={fetchingLocs}
              isOptionEqualToValue={(opt, val) => opt.location_id === val.location_id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={fetchingLocs ? 'Loading locations...' : 'Choose a location...'}
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <LocationOnIcon sx={{ color: accentColor, mr: 1, ml: 0.5, fontSize: 20 }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                    endAdornment: (
                      <>
                        {fetchingLocs ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      bgcolor: '#f8fafc',
                      fontSize: '0.95rem',
                      '&:hover fieldset': { borderColor: accentColor },
                      '&.Mui-focused fieldset': { borderColor: accentColor, borderWidth: '2px' },
                    },
                  }}
                />
              )}
            />
          </Box>

          <Button
            variant="contained"
            fullWidth
            onClick={handleGenerate}
            disabled={loading || !selectedLocation}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            sx={{
              py: 1.6,
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.95rem',
              textTransform: 'none',
              letterSpacing: '0.01em',
              background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
              boxShadow: hovered ? `0 8px 24px rgba(37, 99, 235, 0.4)` : `0 4px 14px rgba(37, 99, 235, 0.25)`,
              transition: 'all 0.2s ease-in-out',
              transform: hovered && !loading && selectedLocation ? 'translateY(-1px)' : 'none',
              '&.Mui-disabled': {
                background: '#e2e8f0',
                color: '#94a3b8',
                boxShadow: 'none',
              },
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={20} sx={{ color: '#ffffff' }} />
                <span>Generating Report...</span>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <span>Generate Adjustment Report</span>
                <ArrowForwardIcon sx={{ fontSize: 18 }} />
              </Box>
            )}
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: '10px', boxShadow: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdjustmentReport;
