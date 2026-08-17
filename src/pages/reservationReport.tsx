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
import BookmarkIcon from '@mui/icons-material/Bookmark';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Location {
  location_id: number | string;
  location_desc: string;
}

const ReservationReport: React.FC = () => {
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
      const response = await servicesAPI.getStoredReservationReport({
        location_desc: selectedLocation.location_desc,
      });
      navigate('/reports/reservation/view', {
        state: { reportData: response.data.data, locationName: selectedLocation.location_desc },
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to generate reservation report';
      setSnackbar({ open: true, message: `Error: ${errorMsg}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const accentColor = '#7c3aed';
  const gradientFrom = '#7c3aed';
  const gradientTo = '#4c1d95';

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
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 58, height: 58,
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
              boxShadow: `0 10px 24px ${accentColor}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
              mb: 1.75,
              position: 'relative',
            }}
          >
            <BookmarkIcon sx={{ color: '#ffffff', fontSize: 28 }} />
            <Box
              sx={{
                position: 'absolute', top: -3, right: -3,
                width: 16, height: 16,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #fcd34d)',
                boxShadow: '0 3px 8px rgba(245,158,11,0.4)',
                border: '2px solid #ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 8, color: '#ffffff' }} />
            </Box>
          </Box>

          <Typography
            variant="h5"
            fontWeight={900}
            color="#0f172a"
            sx={{ letterSpacing: '-0.03em', mb: 0.75 }}
          >
            Reservation Report
          </Typography>
          <Typography
            variant="body2"
            color="#64748b"
            sx={{ maxWidth: 400, margin: '0 auto', lineHeight: 1.5 }}
          >
            Select a location to view all reservations stored during reconciliation,
            by tag number and reference.
          </Typography>
        </Box>

        {/* ── Card ── */}
        <Box
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          sx={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: `1.5px solid ${hovered ? accentColor + '60' : '#e2e8f0'}`,
            boxShadow: hovered
              ? `0 16px 40px ${accentColor}15, 0 4px 16px rgba(0,0,0,0.06)`
              : '0 4px 16px rgba(0,0,0,0.03)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
            background: '#ffffff',
          }}
        >
          {/* Top gradient stripe */}
          <Box
            sx={{
              height: '4px',
              background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
            }}
          />

          <Box sx={{ p: 3 }}>
            {/* Header row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Box
                  sx={{
                    width: 44, height: 44,
                    borderRadius: '12px',
                    bgcolor: '#f5f3ff',
                    color: accentColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${accentColor}20`,
                    flexShrink: 0,
                  }}
                >
                  <BookmarkIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    color="#0f172a"
                    sx={{ lineHeight: 1.2, fontSize: '0.975rem' }}
                  >
                    Generate Report
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.25, display: 'block', lineHeight: 1.35 }}
                  >
                    View all reservations stored during reconciliation, by tag number and reference
                  </Typography>
                </Box>
              </Box>
              <Chip
                icon={<AutoAwesomeIcon sx={{ fontSize: '0.7rem !important', color: `${accentColor} !important` }} />}
                label="Reservations"
                size="small"
                sx={{
                  bgcolor: '#f5f3ff',
                  color: accentColor,
                  fontWeight: 700,
                  fontSize: '0.675rem',
                  borderRadius: '6px',
                  border: `1px solid ${accentColor}30`,
                  flexShrink: 0,
                  height: 22,
                }}
              />
            </Box>

            {/* Divider */}
            <Box sx={{ height: '1px', bgcolor: '#f1f5f9', mb: 2.5 }} />

            {/* Location selector */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                <LocationOnIcon sx={{ fontSize: '0.8rem', color: '#94a3b8' }} />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="#64748b"
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.675rem' }}
                >
                  Select Location
                </Typography>
              </Box>
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
                    placeholder="Search & select a location..."
                    variant="outlined"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        bgcolor: '#f8fafc',
                        fontSize: '0.85rem',
                        '& fieldset': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
                        '&:hover fieldset': { borderColor: accentColor + '80' },
                        '&.Mui-focused fieldset': { borderColor: accentColor, borderWidth: '2px' },
                        '&.Mui-focused': { bgcolor: '#ffffff' },
                      },
                      '& .MuiInputLabel-root': { display: 'none' },
                    }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {fetchingLocs ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Box>

            {/* Generate Button */}
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={loading || !selectedLocation}
              fullWidth
              endIcon={!loading && <ArrowForwardIcon />}
              sx={{
                height: '44px',
                fontWeight: 700,
                fontSize: '0.875rem',
                borderRadius: '10px',
                background:
                  loading || !selectedLocation
                    ? undefined
                    : `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                boxShadow: loading || !selectedLocation ? 'none' : `0 6px 18px ${accentColor}33`,
                '&:hover': {
                  background: `linear-gradient(135deg, #6d28d9, ${gradientTo})`,
                  boxShadow: `0 6px 16px ${accentColor}35`,
                  transform: 'translateY(-1px)',
                },
                '&:active': { transform: 'translateY(0)' },
                textTransform: 'none',
                letterSpacing: '0.02em',
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Generate Reservation Report'}
            </Button>
          </Box>
        </Box>

        {/* Footer note */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.725rem' }}>
            Data is pulled live from the ERP system and physical count transactions.
          </Typography>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReservationReport;
