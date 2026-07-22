import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from "@mui/material";
import {
  TrendingUp,
  People,
  Inventory,
  LocationOn,
  Assignment,
  CheckCircle,
  Refresh,
  Timeline,
  BarChart,
  PieChart,
} from "@mui/icons-material";
import { servicesAPI } from "../config/api";
import { LineChart, Line, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

interface DashboardStats {
  total_transactions: number;
  total_counters: number;
  total_teams: number;
  total_locations: number;
  total_items_counted: number;
  total_checker_transactions: number;
  total_counter_transactions: number;
}

interface TrendData {
  date: string;
  transactions: number;
  items_counted: number;
}

interface TeamPerformance {
  team_name: string;
  transactions: number;
  items_counted: number;
  team_members: number;
}

interface CountTypeDistribution {
  count_type: string;
  count: number;
  total_items: number;
}

type PieSlice = { name: string; value: number };

interface RecentActivity {
  transaction_id: number;
  tag_id: number;
  count_type: string;
  qty: number;
  created_at: string;
  counter_name: string;
  team_name: string;
  location_desc: string;
  section_desc: string;
}

interface LocationStats {
  location_desc: string;
  transactions: number;
  items_counted: number;
  teams_working: number;
}

interface DashboardData {
  stats: DashboardStats;
  trends: TrendData[];
  teamPerformance: TeamPerformance[];
  countTypeDistribution: CountTypeDistribution[];
  recentActivity: RecentActivity[];
  locationStats: LocationStats[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}> = ({ title, value, icon, color, trend }) => {
  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${alpha(color, 0.3)}`,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: color, mt: 1 }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            {trend && (
              <Chip
                label={trend}
                size="small"
                icon={<TrendingUp />}
                sx={{
                  mt: 1,
                  backgroundColor: alpha(color, 0.1),
                  color: color,
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: alpha(color, 0.1),
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const theme = useTheme();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await servicesAPI.getDashboardAnalytics();
      if (response.data.success) {
        setData(response.data.data);
        setLastUpdated(new Date());
      } else {
        setError("Failed to fetch dashboard data");
      }
    } catch (err: unknown) {
      console.error("Error fetching dashboard data:", err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <IconButton onClick={fetchDashboardData} size="small">
            <Refresh />
          </IconButton>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!data) return null;

  const { stats, trends, teamPerformance, countTypeDistribution, recentActivity, locationStats } = data;
  const pieData: PieSlice[] = (countTypeDistribution || []).map((ct) => ({
    name: ct.count_type || 'Unknown',
    value: ct.count || 0,
  }));

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Dashboard Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
            {autoRefresh && (
              <Chip
                label="Auto-refresh: ON"
                size="small"
                sx={{ ml: 2, backgroundColor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}
              />
            )}
          </Typography>
        </Box>
        <Box>
          <Tooltip title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}>
            <IconButton
              onClick={() => setAutoRefresh(!autoRefresh)}
              sx={{
                backgroundColor: autoRefresh ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                mr: 1,
              }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          <IconButton onClick={fetchDashboardData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Transactions"
            value={stats.total_transactions || 0}
            icon={<Assignment sx={{ fontSize: 32, color: '#2196F3' }} />}
            color="#2196F3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Items Counted"
            value={stats.total_items_counted || 0}
            icon={<Inventory sx={{ fontSize: 32, color: '#4CAF50' }} />}
            color="#4CAF50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Teams"
            value={stats.total_teams || 0}
            icon={<People sx={{ fontSize: 32, color: '#FF9800' }} />}
            color="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Locations"
            value={stats.total_locations || 0}
            icon={<LocationOn sx={{ fontSize: 32, color: '#9C27B0' }} />}
            color="#9C27B0"
          />
        </Grid>
      </Grid>

      {/* Additional Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Counters"
            value={stats.total_counters || 0}
            icon={<CheckCircle sx={{ fontSize: 32, color: '#00BCD4' }} />}
            color="#00BCD4"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Counter Transactions"
            value={stats.total_counter_transactions || 0}
            icon={<Timeline sx={{ fontSize: 32, color: '#009688' }} />}
            color="#009688"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Checker Transactions"
            value={stats.total_checker_transactions || 0}
            icon={<CheckCircle sx={{ fontSize: 32, color: '#E91E63' }} />}
            color="#E91E63"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Daily Trends Chart */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              <TrendingUp sx={{ verticalAlign: 'middle', mr: 1 }} />
              Daily Activity Trends (Last 30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke={theme.palette.text.secondary}
                />
                <YAxis stroke={theme.palette.text.secondary} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                  }}
                  labelFormatter={(label) => `Date: ${formatDate(label)}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  name="Transactions"
                  stroke="#2196F3"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="items_counted"
                  name="Items Counted"
                  stroke="#4CAF50"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Count Type Distribution */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              <PieChart sx={{ verticalAlign: 'middle', mr: 1 }} />
              Count Type Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Team Performance and Location Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Team Performance */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              <BarChart sx={{ verticalAlign: 'middle', mr: 1 }} />
              Top Team Performance (Last 7 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={teamPerformance.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis
                  dataKey="team_name"
                  stroke={theme.palette.text.secondary}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke={theme.palette.text.secondary} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Bar dataKey="transactions" name="Transactions" fill="#2196F3" />
                <Bar dataKey="items_counted" name="Items Counted" fill="#4CAF50" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Location Stats */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              <LocationOn sx={{ verticalAlign: 'middle', mr: 1 }} />
              Location Performance
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={locationStats.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis type="number" stroke={theme.palette.text.secondary} />
                <YAxis
                  dataKey="location_desc"
                  type="category"
                  stroke={theme.palette.text.secondary}
                  width={120}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Bar dataKey="items_counted" name="Items Counted" fill="#9C27B0" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity Table */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          <Timeline sx={{ verticalAlign: 'middle', mr: 1 }} />
          Recent Activity
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Tag ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Counter</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Team</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Section</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentActivity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      No recent activity
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                recentActivity.map((activity) => (
                  <TableRow key={activity.transaction_id} hover>
                    <TableCell>{activity.tag_id}</TableCell>
                    <TableCell>{activity.counter_name}</TableCell>
                    <TableCell>
                      <Chip label={activity.team_name} size="small" />
                    </TableCell>
                    <TableCell>{activity.location_desc}</TableCell>
                    <TableCell>{activity.section_desc}</TableCell>
                    <TableCell>
                      <Chip
                        label={activity.count_type}
                        size="small"
                        sx={{
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{activity.qty}</TableCell>
                    <TableCell>{formatDateTime(activity.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Dashboard;
