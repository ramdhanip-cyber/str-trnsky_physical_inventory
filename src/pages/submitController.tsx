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
  Button,
  Chip,
  Container,
  Stack,
  LinearProgress,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
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
  ArrowForward,
  Layers,
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

const BRAND = '#0C2C48';
const BRAND_MID = '#123a5e';
const BRAND_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';

/** Soft clay surface for skeuomorphic depth (matches navy theme) */
const SKEU_BG = '#e8eef4';
const SKEU_LIGHT = '#ffffff';
const SKEU_DARK = '#c5d0db';
const skeuRaised = (size = 7) =>
  `${size}px ${size}px ${size * 2}px ${SKEU_DARK}, -${size}px -${size}px ${size * 2}px ${SKEU_LIGHT}`;
const skeuInset = (size = 4) =>
  `inset ${size}px ${size}px ${size * 2}px ${SKEU_DARK}, inset -${size}px -${size}px ${size * 2}px ${SKEU_LIGHT}`;

const HeaderCard = styled(Paper)(() => ({
  padding: '24px 28px',
  borderRadius: 16,
  background: BRAND_GRADIENT,
  color: '#fff',
  border: 'none',
  boxShadow: '0 12px 40px rgba(12, 44, 72, 0.28)',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: -40,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    pointerEvents: 'none',
  },
}));

const StatCard = styled(Paper)(() => ({
  padding: '20px 22px',
  borderRadius: 18,
  background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
  border: 'none',
  boxShadow: skeuRaised(8),
  height: '100%',
  transition: 'box-shadow 0.18s ease, transform 0.18s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: skeuRaised(10),
  },
}));

const FilterBar = styled(Paper)(() => ({
  padding: '16px 20px',
  borderRadius: 18,
  border: 'none',
  background: `linear-gradient(145deg, ${SKEU_LIGHT} 0%, ${SKEU_BG} 100%)`,
  boxShadow: skeuRaised(8),
  marginBottom: 24,
}));

const FilterTrack = styled(Box)(() => ({
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  height: 40,
  padding: 4,
  gap: 4,
  borderRadius: 12,
  background: SKEU_BG,
  boxShadow: skeuInset(3),
  boxSizing: 'border-box',
  flexShrink: 0,
}));

const FilterSegment = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  appearance: 'none',
  margin: 0,
  height: 32,
  padding: '0 14px',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 700,
  fontSize: '0.8125rem',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  transition: 'box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease',
  ...(active
    ? {
        color: '#fff',
        background: BRAND_GRADIENT,
        boxShadow: `2px 2px 5px ${SKEU_DARK}, inset 0 1px 0 ${alpha('#fff', 0.2)}`,
      }
    : {
        color: BRAND,
        background: 'transparent',
        boxShadow: 'none',
        '&:hover': {
          background: alpha(BRAND, 0.06),
        },
      }),
}));

const SkeuIconWell = styled(Avatar)(() => ({
  width: 48,
  height: 48,
  boxShadow: skeuInset(3),
  background: SKEU_BG,
}));

const LocationCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 16,
  border: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
  boxShadow: 'none',
  overflow: 'hidden',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
  '&:hover': {
    transform: 'translateY(-3px)',
    borderColor: alpha(BRAND, 0.35),
    boxShadow: `0 14px 36px ${alpha(BRAND, 0.12)}`,
  },
}));

const AssignedPage = () => {
  const theme = useTheme();
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
      setLocationSummaries(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching location summary:', error);
      setLocationSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = (locationSummaries || []).filter((location) => {
    const searchMatch =
      !searchTerm ||
      (() => {
        const searchTermLower = searchTerm.toLowerCase();
        const fieldsToSearch = [
          location.location_id?.toString() ?? '',
          location.user_names ?? '',
          location.location_name ?? '',
          location.team_name ?? '',
        ];
        return fieldsToSearch.some((field) => field.toLowerCase().includes(searchTermLower));
      })();

    const statusMatch = statusFilter === 'all' || location.overall_status === statusFilter;
    return searchMatch && statusMatch;
  });

  const stats = {
    total: (locationSummaries || []).length,
    inProgress: (locationSummaries || []).filter((l) => l.overall_status === 'In Progress').length,
    countCompleted: (locationSummaries || []).filter((l) => l.overall_status === 'Count Completed').length,
  };

  const handleViewCountReview = (locationId: number) => {
    navigate(`/count-review/${locationId}`);
  };

  const getCompletedCount = (location: LocationSummary) =>
    location.count_completed + location.completed + location.assigned_checker;

  const getProgressPct = (location: LocationSummary) => {
    if (!location.total_sections) return 0;
    return Math.min(100, Math.round((getCompletedCount(location) / location.total_sections) * 100));
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const statusChipSx = (status: string) => {
    if (status === 'Count Completed') {
      return {
        bgcolor: alpha(theme.palette.success.main, 0.12),
        color: theme.palette.success.dark,
        border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
        fontWeight: 700,
      };
    }
    return {
      bgcolor: alpha(theme.palette.warning.main, 0.12),
      color: theme.palette.warning.dark,
      border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
      fontWeight: 700,
    };
  };

  const renderLocationCard = (location: LocationSummary) => {
    const progress = getProgressPct(location);
    const completed = getCompletedCount(location);

    return (
      <LocationCard>
        <Box
          sx={{
            height: 4,
            background:
              location.overall_status === 'Count Completed'
                ? theme.palette.success.main
                : BRAND_GRADIENT,
          }}
        />
        <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: alpha(BRAND, 0.1),
                color: BRAND,
                border: `1px solid ${alpha(BRAND, 0.15)}`,
              }}
            >
              <LocationOn />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 800, color: BRAND, lineHeight: 1.25, letterSpacing: '-0.01em' }}
                noWrap
                title={location.location_name || `Location #${location.location_id}`}
              >
                {location.location_name || `Location #${location.location_id}`}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                ID {location.location_id}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={location.overall_status}
              sx={statusChipSx(location.overall_status)}
            />
          </Box>

          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
              <People sx={{ fontSize: 18, color: alpha(BRAND, 0.45), mt: 0.2 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Team
                </Typography>
                <Typography variant="body2" fontWeight={600} noWrap title={location.team_name || 'No Team Assigned'}>
                  {location.team_name || 'No Team Assigned'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
              <Assignment sx={{ fontSize: 18, color: alpha(BRAND, 0.45), mt: 0.2 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Assigned to
                </Typography>
                <Typography variant="body2" fontWeight={600} noWrap title={location.user_names}>
                  {location.user_names || '—'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
              <Schedule sx={{ fontSize: 18, color: alpha(BRAND, 0.45), mt: 0.2 }} />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Assigned on
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatDate(location.assigned_at)}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Layers sx={{ fontSize: 16, color: alpha(BRAND, 0.45) }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Sections progress
                  </Typography>
                </Box>
                <Typography variant="caption" fontWeight={800} sx={{ color: BRAND }}>
                  {completed}/{location.total_sections} · {progress}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 99,
                  bgcolor: alpha(BRAND, 0.08),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 99,
                    background:
                      location.overall_status === 'Count Completed'
                        ? theme.palette.success.main
                        : BRAND_GRADIENT,
                  },
                }}
              />
            </Box>

            {location.competed_at && (
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <CheckCircle sx={{ fontSize: 18, color: theme.palette.success.main }} />
                <Typography variant="body2" color="text.secondary">
                  Completed {formatDate(location.competed_at)}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>

        <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
          <Button
            variant="contained"
            fullWidth
            endIcon={<ArrowForward />}
            onClick={() => handleViewCountReview(location.location_id)}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              py: 1.15,
              boxShadow: 'none',
              bgcolor: BRAND,
              '&:hover': { bgcolor: BRAND_MID, boxShadow: `0 8px 20px ${alpha(BRAND, 0.28)}` },
            }}
          >
            View Counts
          </Button>
        </CardActions>
      </LocationCard>
    );
  };

  const renderLocationRow = (location: LocationSummary) => {
    const progress = getProgressPct(location);
    const completed = getCompletedCount(location);

    return (
      <Paper
        key={location.location_id}
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            borderColor: alpha(BRAND, 0.35),
            boxShadow: `0 8px 24px ${alpha(BRAND, 0.08)}`,
          },
        }}
      >
        <Avatar sx={{ bgcolor: alpha(BRAND, 0.1), color: BRAND }}>
          <LocationOn />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: BRAND, lineHeight: 1.2 }}>
            {location.location_name || `Location #${location.location_id}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {location.team_name || 'No team'} · {location.user_names || '—'}
          </Typography>
        </Box>
        <Chip size="small" label={location.overall_status} sx={statusChipSx(location.overall_status)} />
        <Box sx={{ width: 140 }}>
          <Typography variant="caption" fontWeight={700} sx={{ color: BRAND }}>
            {completed}/{location.total_sections} ({progress}%)
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              mt: 0.5,
              height: 6,
              borderRadius: 99,
              bgcolor: alpha(BRAND, 0.08),
              '& .MuiLinearProgress-bar': { borderRadius: 99, background: BRAND_GRADIENT },
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120 }}>
          {formatDate(location.assigned_at)}
        </Typography>
        <Button
          variant="contained"
          size="small"
          endIcon={<ArrowForward />}
          onClick={() => handleViewCountReview(location.location_id)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            boxShadow: 'none',
            bgcolor: BRAND,
            '&:hover': { bgcolor: BRAND_MID },
          }}
        >
          View Counts
        </Button>
      </Paper>
    );
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 112px)',
        bgcolor: SKEU_BG,
        py: { xs: 2.5, md: 3.5 },
      }}
    >
      <Container maxWidth="xl">
        <HeaderCard sx={{ mb: 3 }}>
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: 'rgba(255,255,255,0.16)',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              >
                <Assignment />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  Reconciliations
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.88, mt: 0.35 }}>
                  Review assigned counter locations and open count reconciliation
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Refresh data">
              <IconButton
                onClick={fetchAssignedLocations}
                disabled={loading}
                sx={{
                  color: 'inherit',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
                  borderRadius: 2.5,
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </HeaderCard>

        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{
                      color: BRAND,
                      lineHeight: 1.1,
                      textShadow: '1px 1px 0 rgba(255,255,255,0.8)',
                    }}
                  >
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: alpha(BRAND, 0.55), fontWeight: 700 }}>
                    Total locations
                  </Typography>
                </Box>
                <SkeuIconWell sx={{ color: BRAND }}>
                  <LocationOn />
                </SkeuIconWell>
              </Box>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{
                      color: theme.palette.warning.dark,
                      lineHeight: 1.1,
                      textShadow: '1px 1px 0 rgba(255,255,255,0.8)',
                    }}
                  >
                    {stats.inProgress}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: alpha(BRAND, 0.55), fontWeight: 700 }}>
                    In progress
                  </Typography>
                </Box>
                <SkeuIconWell sx={{ color: theme.palette.warning.dark }}>
                  <Pending />
                </SkeuIconWell>
              </Box>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{
                      color: theme.palette.success.dark,
                      lineHeight: 1.1,
                      textShadow: '1px 1px 0 rgba(255,255,255,0.8)',
                    }}
                  >
                    {stats.countCompleted}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: alpha(BRAND, 0.55), fontWeight: 700 }}>
                    Count completed
                  </Typography>
                </Box>
                <SkeuIconWell sx={{ color: theme.palette.success.dark }}>
                  <CheckCircle />
                </SkeuIconWell>
              </Box>
            </StatCard>
          </Grid>
        </Grid>

        <FilterBar>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              minHeight: 40,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 1.5,
                flex: 1,
                minWidth: 0,
              }}
            >
              <TextField
                size="small"
                variant="outlined"
                placeholder="Search locations, teams, or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  flex: 1,
                  minWidth: { sm: 240 },
                  maxWidth: 440,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: alpha(BRAND, 0.5) }} />
                    </InputAdornment>
                  ),
                  sx: {
                    height: 40,
                    borderRadius: 3,
                    background: SKEU_BG,
                    boxShadow: skeuInset(4),
                    '& fieldset': { border: 'none' },
                    '&.Mui-focused': {
                      boxShadow: `${skeuInset(4)}, 0 0 0 2px ${alpha(BRAND, 0.18)}`,
                    },
                  },
                }}
              />

              <FilterTrack>
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'In Progress', label: 'In Progress' },
                    { key: 'Count Completed', label: 'Count Completed' },
                  ] as const
                ).map((status) => (
                  <FilterSegment
                    key={status.key}
                    type="button"
                    active={statusFilter === status.key}
                    onClick={() => setStatusFilter(status.key)}
                  >
                    {status.label}
                  </FilterSegment>
                ))}
              </FilterTrack>
            </Box>

            <Box
              sx={{
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: { xs: 'flex-end', md: 'center' },
                flexShrink: 0,
                height: 40,
                px: '4px',
                gap: '4px',
                boxSizing: 'border-box',
                borderRadius: '12px',
                background: SKEU_BG,
                boxShadow: skeuInset(3),
              }}
            >
              <Tooltip title="Grid view">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('grid')}
                  sx={{
                    borderRadius: 1.5,
                    width: 32,
                    height: 32,
                    p: 0,
                    transition: 'box-shadow 0.15s ease',
                    ...(viewMode === 'grid'
                      ? {
                          color: '#fff',
                          background: BRAND_GRADIENT,
                          boxShadow: `2px 2px 5px ${SKEU_DARK}, inset 0 1px 0 ${alpha('#fff', 0.2)}`,
                          '&:hover': { background: BRAND_GRADIENT },
                        }
                      : {
                          color: BRAND,
                          background: 'transparent',
                          boxShadow: 'none',
                          '&:hover': { background: alpha(BRAND, 0.06) },
                        }),
                  }}
                >
                  <Dashboard fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="List view">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('list')}
                  sx={{
                    borderRadius: 1.5,
                    width: 32,
                    height: 32,
                    p: 0,
                    transition: 'box-shadow 0.15s ease',
                    ...(viewMode === 'list'
                      ? {
                          color: '#fff',
                          background: BRAND_GRADIENT,
                          boxShadow: `2px 2px 5px ${SKEU_DARK}, inset 0 1px 0 ${alpha('#fff', 0.2)}`,
                          '&:hover': { background: BRAND_GRADIENT },
                        }
                      : {
                          color: BRAND,
                          background: 'transparent',
                          boxShadow: 'none',
                          '&:hover': { background: alpha(BRAND, 0.06) },
                        }),
                  }}
                >
                  <ViewList fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </FilterBar>

        {!loading && filteredData.length > 0 && (
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 2 }}>
            Showing {filteredData.length} of {stats.total} location{stats.total === 1 ? '' : 's'}
          </Typography>
        )}

        {loading ? (
          <Paper
            elevation={0}
            sx={{
              p: 8,
              textAlign: 'center',
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
            }}
          >
            <CircularProgress size={48} sx={{ color: BRAND }} />
            <Typography variant="h6" fontWeight={700} sx={{ mt: 2.5, color: BRAND }}>
              Loading locations
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Fetching assigned counter locations…
            </Typography>
          </Paper>
        ) : filteredData.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
            }}
          >
            <Avatar
              sx={{
                width: 72,
                height: 72,
                mx: 'auto',
                mb: 2,
                bgcolor: alpha(BRAND, 0.08),
                color: BRAND,
              }}
            >
              <LocationOn sx={{ fontSize: 36 }} />
            </Avatar>
            <Typography variant="h6" fontWeight={800} sx={{ color: BRAND }} gutterBottom>
              No locations found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto', mb: 2.5 }}>
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or status filter.'
                : 'No inventory locations have been assigned yet.'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchAssignedLocations}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                boxShadow: 'none',
                bgcolor: BRAND,
                '&:hover': { bgcolor: BRAND_MID },
              }}
            >
              Refresh
            </Button>
          </Paper>
        ) : viewMode === 'grid' ? (
          <Grid container spacing={2.5}>
            {filteredData.map((location) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={location.location_id}>
                {renderLocationCard(location)}
              </Grid>
            ))}
          </Grid>
        ) : (
          <Stack spacing={1.5}>{filteredData.map((location) => renderLocationRow(location))}</Stack>
        )}
      </Container>
    </Box>
  );
};

export default AssignedPage;
