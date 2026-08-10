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
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BarChartIcon from '@mui/icons-material/BarChart';
import GridViewIcon from '@mui/icons-material/GridView';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Location {
  location_id: number | string;
  location_desc: string;
}

const ReportCard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  buttonBg: string;
  buttonHover: string;
  buttonShadow: string;
  buttonLabel: string;
  locations: Location[];
  fetchingLocs: boolean;
  selectedLocation: Location | null;
  onLocationChange: (val: Location | null) => void;
  loading: boolean;
  onGenerate: () => void;
}> = ({
  icon, iconBg, iconColor, badge, badgeBg, badgeColor,
  title, subtitle, accentColor, gradientFrom, gradientTo,
  buttonHover, buttonShadow, buttonLabel,
  locations, fetchingLocs, selectedLocation, onLocationChange, loading, onGenerate
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1.5px solid ${hovered ? accentColor + '60' : '#e2e8f0'}`,
        boxShadow: hovered
          ? `0 16px 40px ${accentColor}15, 0 4px 16px rgba(0,0,0,0.06)`
          : '0 4px 16px rgba(0,0,0,0.03)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        background: '#ffffff',
        position: 'relative',
      }}
    >
      {/* Top gradient stripe */}
      <Box sx={{
        height: '4px',
        background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
        borderRadius: '16px 16px 0 0',
      }} />

      {/* Card Body */}
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
            <Box sx={{
              width: 44, height: 44,
              borderRadius: '12px',
              bgcolor: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${iconColor}20`,
              flexShrink: 0
            }}>
              {icon}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.2, fontSize: '0.975rem' }}>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block', lineHeight: 1.35 }}>
                {subtitle}
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: '0.7rem !important', color: `${badgeColor} !important` }} />}
            label={badge}
            size="small"
            sx={{
              bgcolor: badgeBg,
              color: badgeColor,
              fontWeight: 700,
              fontSize: '0.675rem',
              borderRadius: '6px',
              border: `1px solid ${badgeColor}30`,
              flexShrink: 0,
              height: 22
            }}
          />
        </Box>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Divider */}
        <Box sx={{ height: '1px', bgcolor: '#f1f5f9', mb: 2 }} />

        {/* Location selector */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
            <LocationOnIcon sx={{ fontSize: '0.8rem', color: '#94a3b8' }} />
            <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.675rem' }}>
              Select Location
            </Typography>
          </Box>
          <Autocomplete
            options={locations}
            loading={fetchingLocs}
            getOptionLabel={(option) => `${option.location_desc} (${option.location_id})`}
            isOptionEqualToValue={(option, value) => option.location_id === value.location_id}
            value={selectedLocation}
            onChange={(_event, newValue) => onLocationChange(newValue)}
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
                  '& .MuiInputLabel-root': { display: 'none' }
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
          onClick={onGenerate}
          disabled={loading || !selectedLocation}
          fullWidth
          endIcon={!loading && <ArrowForwardIcon />}
          sx={{
            height: '44px',
            fontWeight: 700,
            fontSize: '0.875rem',
            borderRadius: '10px',
            background: loading || !selectedLocation
              ? undefined
              : `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
            boxShadow: loading || !selectedLocation ? 'none' : buttonShadow,
            '&:hover': {
              background: `linear-gradient(135deg, ${buttonHover}, ${gradientTo})`,
              boxShadow: `0 6px 16px ${accentColor}35`,
              transform: 'translateY(-1px)'
            },
            '&:active': { transform: 'translateY(0)' },
            textTransform: 'none',
            letterSpacing: '0.02em',
            transition: 'all 0.2s ease',
          }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : buttonLabel}
        </Button>
      </Box>
    </Box>
  );
};

const ReconciliationRecord: React.FC = () => {
  const navigate = useNavigate();

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedLocationByAll, setSelectedLocationByAll] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingByAll, setLoadingByAll] = useState(false);
  const [fetchingLocs, setFetchingLocs] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
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

  const handleApiCall = async () => {
    if (!selectedLocation) {
      setSnackbar({ open: true, message: 'Please select a Location', severity: 'error' });
      return;
    }
    setLoading(true);
    try {
      const response = await servicesAPI.getReconciliationReport({ location_desc: selectedLocation.location_desc });
      navigate('/reports/reconciliation/view', {
        state: { reportData: response.data.data, locationName: selectedLocation.location_desc }
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to generate report';
      setSnackbar({ open: true, message: `Error: ${errorMsg}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApiCallByAll = async () => {
    if (!selectedLocationByAll) {
      setSnackbar({ open: true, message: 'Please select a Location', severity: 'error' });
      return;
    }
    setLoadingByAll(true);
    try {
      const response = await servicesAPI.getReconciliationReportByAll({ location_desc: selectedLocationByAll.location_desc });
      navigate('/reports/reconciliation/viewbyall', {
        state: { reportData: response.data.data, locationName: selectedLocationByAll.location_desc }
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to generate report';
      setSnackbar({ open: true, message: `Error: ${errorMsg}`, severity: 'error' });
    } finally {
      setLoadingByAll(false);
    }
  };

  return (
    <Box sx={{
      minHeight: 'calc(100vh - 112px)',
      bgcolor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      px: 3,
      pt: 3,
      pb: 2,
      boxSizing: 'border-box'
    }}>
      <Box sx={{ width: '100%', maxWidth: 980 }}>

        {/* ── Hero Header ── */}
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          {/* Icon ring */}
          <Box sx={{
            width: 58, height: 58,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0C2C48, #1e40af)',
            boxShadow: '0 10px 24px rgba(12,44,72,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
            mb: 1.75,
            position: 'relative',
          }}>
            <BarChartIcon sx={{ color: '#ffffff', fontSize: 28 }} />
            {/* sparkle dot */}
            <Box sx={{
              position: 'absolute', top: -3, right: -3,
              width: 16, height: 16,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #fcd34d)',
              boxShadow: '0 3px 8px rgba(245,158,11,0.4)',
              border: '2px solid #ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AutoAwesomeIcon sx={{ fontSize: 8, color: '#ffffff' }} />
            </Box>
          </Box>

          <Typography variant="h5" fontWeight={900} color="#0f172a" sx={{ letterSpacing: '-0.03em', mb: 0.75 }}>
            Reconciliation Reports
          </Typography>
          <Typography variant="body2" color="#64748b" sx={{ maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
            Select a location to generate a summary or detailed inventory reconciliation report.
          </Typography>


        </Box>

        {/* ── Cards side by side ── */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5, alignItems: 'stretch' }}>

          {/* Card 1 */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ReportCard
              icon={<BarChartIcon sx={{ fontSize: 24 }} />}
              iconBg="#eff6ff"
              iconColor="#2563eb"
              badge="Standard"
              badgeBg="#eff6ff"
              badgeColor="#2563eb"
              title="Report by Form & Size"
              subtitle="Summarized inventory report aggregated by product Form and Size"
              accentColor="#2563eb"
              gradientFrom="#0C2C48"
              gradientTo="#1e40af"
              buttonBg="#0C2C48"
              buttonHover="#0a2340"
              buttonShadow="0 6px 18px rgba(12,44,72,0.2)"
              buttonLabel="Generate Report"
              locations={locations}
              fetchingLocs={fetchingLocs}
              selectedLocation={selectedLocation}
              onLocationChange={setSelectedLocation}
              loading={loading}
              onGenerate={handleApiCall}
            />
          </Box>

          {/* Vertical/Horizontal divider */}
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'row', md: 'column' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.25,
            flexShrink: 0
          }}>
            <Box sx={{ flex: 1, width: { xs: '100%', md: '1.5px' }, height: { xs: '1.5px', md: '100%' }, bgcolor: '#cbd5e1', borderRadius: 1 }} />
            <Box sx={{
              px: 1.25, py: 0.5,
              borderRadius: '999px',
              border: '1.5px solid #cbd5e1',
              bgcolor: '#ffffff',
              color: '#64748b',
              fontSize: '0.675rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}>OR</Box>
            <Box sx={{ flex: 1, width: { xs: '100%', md: '1.5px' }, height: { xs: '1.5px', md: '100%' }, bgcolor: '#cbd5e1', borderRadius: 1 }} />
          </Box>

          {/* Card 2 */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ReportCard
              icon={<GridViewIcon sx={{ fontSize: 24 }} />}
              iconBg="#f0f9ff"
              iconColor="#0284c7"
              badge="Detailed"
              badgeBg="#f0f9ff"
              badgeColor="#0284c7"
              title="Report by All Fields"
              subtitle="Full breakdown by Form, Grade, Size, Finish, Ext. Finish, Width, Length & Location"
              accentColor="#0284c7"
              gradientFrom="#0284c7"
              gradientTo="#0C2C48"
              buttonBg="#0284c7"
              buttonHover="#0369a1"
              buttonShadow="0 6px 18px rgba(2,132,199,0.2)"
              buttonLabel="Generate Detailed Report"
              locations={locations}
              fetchingLocs={fetchingLocs}
              selectedLocation={selectedLocationByAll}
              onLocationChange={setSelectedLocationByAll}
              loading={loadingByAll}
              onGenerate={handleApiCallByAll}
            />
          </Box>

        </Box>

        {/* Footer note */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.725rem' }}>
            Data is pulled live from the ERP system and physical count transactions.
          </Typography>
        </Box>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReconciliationRecord;
