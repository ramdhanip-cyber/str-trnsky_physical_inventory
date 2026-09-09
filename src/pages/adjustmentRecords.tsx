import React, { useEffect, useMemo, useState } from 'react';
import { servicesAPI } from '../config/api';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Breadcrumbs,
  Link as MLink,
  Chip,
  TextField,
  InputAdornment,
  Grid,
  Avatar,
  Stack,
  Divider,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const BRAND_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';
const NAVY = '#0C2C48';
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
  'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
  'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
];
const getAvatarGradient = (seed: number | string) => {
  const n = typeof seed === 'number'
    ? seed
    : String(seed).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[Math.abs(n) % AVATAR_GRADIENTS.length];
};

const getRequestPriority = (row: ApprovalHeader) => {
  const status = String(row.status || '').trim().toLowerCase();
  const approvalStatus = String(row.approval_status || '').trim().toLowerCase();
  if (status === 'in progress' || approvalStatus === 'under approval') return 0;
  if (status === 'adjusting items') return 1;
  if (approvalStatus === 'approved' || status === 'approved') return 2;
  if (approvalStatus === 'rejected' || status === 'rejected') return 3;
  return 4;
};

interface ApprovalHeader {
  aprvl_id: number;
  location_id: number;
  request_type?: 'STANDARD' | 'NEW' | 'MIXED';
  location_desc?: string;
  branch?: string | null;
  warehouse?: string | null;
  adj_name: string;
  status: string;
  approval_status: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

type ApprovalRecordsPageProps = {
  requestType?: 'STANDARD' | 'NEW';
  detailBasePath?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

const ApprovalRecordsPageView: React.FC<ApprovalRecordsPageProps> = ({
  requestType = 'STANDARD',
  detailBasePath = '/adjustment-records',
  pageTitle = 'Adjustment Records',
  pageSubtitle = 'Review and open physical inventory adjustments submitted for approval',
  emptyTitle = 'No adjustment records yet',
  emptyDescription = 'Submitted adjustments will appear here once created.',
}) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ApprovalHeader[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const resp = await servicesAPI.getApprovalRecords(requestType);
      if (resp.data?.success) setRows(resp.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        String(r.aprvl_id),
        r.adj_name,
        r.location_desc,
        String(r.location_id),
        r.branch,
        r.warehouse,
        r.status,
        r.approval_status,
        r.created_by,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const underApproval = rows.filter((r) => (r.approval_status || '').toLowerCase() === 'under approval').length;
    const adjusting = rows.filter((r) => (r.status || '').toLowerCase() === 'adjusting items').length;
    return { total: rows.length, underApproval, adjusting };
  }, [rows]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in progress':
        return 'info';
      case 'adjusting items':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'approved':
        return 'success';
      default:
        return 'default';
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'under approval':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  const formatAdjustmentPrimaryLine = (r: ApprovalHeader) => {
    const locName = (r.location_desc || '').trim() || '—';
    const datePart = r.created_at
      ? new Date(r.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '—';
    return `${r.location_id}-${locName} | ${datePart}`;
  };

  const resolveBranchWarehouse = (r: ApprovalHeader) => {
    const branch = (r.branch || '').trim();
    const warehouse = (r.warehouse || '').trim();
    if (branch && warehouse) return { branch, warehouse };

    const raw = (r.adj_name || '').trim();
    if (!raw) return { branch: branch || '—', warehouse: warehouse || '—' };

    // Expected pattern: {branch}_{warehouse}_{locationDesc}_{yyyy-mm-dd}
    const parts = raw.split('_');
    const parsedBranch = parts[0]?.trim() || '';
    const parsedWarehouse = parts[1]?.trim() || '';

    return {
      branch: branch || parsedBranch || '—',
      warehouse: warehouse || parsedWarehouse || '—',
    };
  };

  const groupedByLocation = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      locationId: number;
      locationName: string;
      branch: string;
      warehouse: string;
      rows: ApprovalHeader[];
    }>();

    filtered.forEach((row) => {
      const resolved = resolveBranchWarehouse(row);
      const locationName = (row.location_desc || '').trim() || 'Unknown Location';
      const key = `${row.location_id}::${locationName}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          locationId: row.location_id,
          locationName,
          branch: resolved.branch,
          warehouse: resolved.warehouse,
          rows: [],
        });
      }

      groups.get(key)?.rows.push(row);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        rows: [...group.rows].sort((a, b) => {
          const priorityDiff = getRequestPriority(a) - getRequestPriority(b);
          if (priorityDiff !== 0) return priorityDiff;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }),
      }))
      .sort((a, b) => {
        const byLocation = a.locationName.localeCompare(b.locationName);
        return byLocation !== 0 ? byLocation : a.locationId - b.locationId;
      });
  }, [filtered]);

  const statCards = [
    { label: 'Total Records', value: stats.total, icon: <ListAltOutlinedIcon />, gradient: BRAND_GRADIENT },
    { label: 'Under Approval', value: stats.underApproval, icon: <PendingActionsOutlinedIcon />, gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
    { label: 'Adjusting Items', value: stats.adjusting, icon: <AssignmentTurnedInOutlinedIcon />, gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  ];

  const heroButtonSx = {
    bgcolor: 'rgba(255,255,255,0.15)',
    color: 'white',
    borderRadius: '12px',
    px: 2.5,
    py: 1,
    textTransform: 'none' as const,
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.25)',
    boxShadow: 'none',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)', boxShadow: 'none' },
    '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' },
  };

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }} separator="›">
        <MLink
          underline="hover"
          color="inherit"
          onClick={() => navigate('/dashboard')}
          sx={{ cursor: 'pointer', fontWeight: 500 }}
        >
          Dashboard
        </MLink>
        <Typography color="text.primary" fontWeight={600}>
          {pageTitle}
        </Typography>
      </Breadcrumbs>

      {/* Hero Header */}
      <Box
        sx={{
          background: BRAND_GRADIENT,
          borderRadius: '20px',
          p: { xs: 2.5, md: 3 },
          mb: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(12,44,72,0.35)',
        }}
      >
        <Box sx={{ position: 'absolute', top: -60, right: -40, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <ListAltOutlinedIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                {pageTitle}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                {pageSubtitle}
              </Typography>
            </Box>
          </Box>
          <Button
            startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <RefreshIcon />}
            onClick={load}
            disabled={loading}
            sx={heroButtonSx}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats strip */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                transition: 'all 0.3s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                  {stat.label}
                </Typography>
              </Box>
              <Avatar sx={{ width: 52, height: 52, background: stat.gradient, boxShadow: '0 6px 16px rgba(0,0,0,0.15)', flexShrink: 0 }}>
                {stat.icon}
              </Avatar>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid rgba(0,0,0,0.06)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: NAVY }}>
            Requests by Location
          </Typography>
          <TextField
            size="small"
            placeholder="Search by ID, location, branch, warehouse, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 340 }, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
            <CircularProgress sx={{ color: NAVY }} />
            <Typography variant="body2" color="text.secondary">Loading adjustment records…</Typography>
          </Box>
        ) : groupedByLocation.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(NAVY, 0.06), color: NAVY, mx: 'auto', mb: 2 }}>
              <ListAltOutlinedIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY }} gutterBottom>
              {rows.length === 0 ? emptyTitle : 'No matches for your search'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {rows.length === 0
                ? emptyDescription
                : 'Try a different keyword or clear the search.'}
            </Typography>
            {rows.length > 0 && (
              <Button size="small" onClick={() => setSearch('')} sx={{ mt: 1.5, textTransform: 'none' }}>
                Clear search
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container spacing={2.5}>
              {groupedByLocation.map((group) => (
                <Grid item xs={12} md={6} xl={4} key={group.key}>
                  <Paper
                    elevation={0}
                    sx={{
                      height: '100%',
                      borderRadius: '18px',
                      border: '1px solid rgba(12,44,72,0.08)',
                      boxShadow: '0 10px 26px rgba(12,44,72,0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        background: BRAND_GRADIENT,
                        color: 'white',
                        px: 2.5,
                        py: 2,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)' }}>
                          {String(group.locationName || group.locationId).trim().charAt(0).toUpperCase() || 'L'}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            {group.locationId} - {group.locationName}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.86, mt: 0.25 }}>
                            Branch: {group.branch} | Warehouse: {group.warehouse}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Box sx={{ px: 2.5, py: 2 }}>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                        <Chip size="small" label={`${group.rows.length} request${group.rows.length === 1 ? '' : 's'}`} sx={{ fontWeight: 700 }} />
                        <Chip
                          size="small"
                          color="warning"
                          variant="outlined"
                          label={`${group.rows.filter((row) => (row.approval_status || '').toLowerCase() === 'under approval').length} under approval`}
                        />
                      </Stack>

                      <Stack
                        spacing={1.5}
                        sx={{
                          maxHeight: group.rows.length > 2 ? 270 : 'none',
                          overflowY: group.rows.length > 2 ? 'auto' : 'visible',
                          pr: group.rows.length > 2 ? 0.5 : 0,
                        }}
                      >
                        {group.rows.map((row, index) => (
                          <React.Fragment key={row.aprvl_id}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: 1.5,
                              }}
                            >
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                                  <Avatar
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: getAvatarGradient(row.aprvl_id),
                                    }}
                                  >
                                    #{row.aprvl_id}
                                  </Avatar>
                                  <Typography fontWeight={700} sx={{ color: NAVY }}>
                                    {formatAdjustmentPrimaryLine(row)}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 0.75 }}>
                                  <Chip label={row.status} color={getStatusColor(row.status)} size="small" sx={{ fontWeight: 600 }} />
                                  <Chip label={row.approval_status} color={getApprovalStatusColor(row.approval_status)} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                  Created by {row.created_by || '—'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                                  {formatDate(row.created_at)}
                                </Typography>
                              </Box>

                              <Button
                                variant="contained"
                                size="small"
                                endIcon={<ArrowForwardIosIcon sx={{ fontSize: 12 }} />}
                                onClick={() => navigate(`${detailBasePath}/${row.aprvl_id}`)}
                                sx={{
                                  borderRadius: '10px',
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  boxShadow: 'none',
                                  background: BRAND_GRADIENT,
                                  minWidth: 88,
                                  '&:hover': { boxShadow: '0 6px 16px rgba(12,44,72,0.3)', background: BRAND_GRADIENT },
                                }}
                              >
                                Open
                              </Button>
                            </Box>
                            {index < group.rows.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </Stack>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

const AdjustmentRecordsPage: React.FC = () => (
  <ApprovalRecordsPageView />
);

export const NewAdjustmentRecordsPage: React.FC = () => (
  <ApprovalRecordsPageView
    requestType="NEW"
    detailBasePath="/new-adjustment-records"
    pageTitle="New Item Approval Records"
    pageSubtitle="Review and open NEW item adjustments submitted for separate approval"
    emptyTitle="No NEW item approval records yet"
    emptyDescription="Submitted NEW item adjustments will appear here once created."
  />
);

export default AdjustmentRecordsPage;
