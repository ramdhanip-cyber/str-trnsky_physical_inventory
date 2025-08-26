import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress, Alert, Button,
  Chip
} from '@mui/material';
import { Refresh, Add, Edit, CheckCircle } from '@mui/icons-material';
import { servicesAPI } from '../config/api';

interface CheckerLog {
  log_id: number;
  activity_type: 'new_line_added' | 'transaction_modified' | 'transaction_verified';
  transaction_id: number;
  tag_id: string;
  activity_description: string;
  created_at: string;
  location_desc: string;
  section_desc: string;
  team_name: string;
  checker_name: string;
}

const CheckerLogs: React.FC = () => {
  const [logs, setLogs] = useState<CheckerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const selectedRole = localStorage.getItem('Selected Role');
      
      const response = await servicesAPI.getCheckerActivityLogs({
        'x-selected-role': selectedRole || ''
      });
      const result = response.data;
      
      if (result.success) {
        setLogs(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch logs');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'new_line_added': return 'success';
      case 'transaction_modified': return 'warning';
      case 'transaction_verified': return 'info';
      default: return 'default';
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'new_line_added': return <Add fontSize="small" />;
      case 'transaction_modified': return <Edit fontSize="small" />;
      case 'transaction_verified': return <CheckCircle fontSize="small" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error} <Button onClick={fetchLogs}>Retry</Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Checker Activity Logs
        </Typography>
        <Button variant="contained" startIcon={<Refresh />} onClick={fetchLogs}>
          Refresh
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Activity</TableCell>
              <TableCell>Tag ID</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Section</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Checker</TableCell>
              <TableCell>Date & Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.log_id} hover>
                <TableCell>
                  <Chip
                    icon={getActivityTypeIcon(log.activity_type) || undefined}
                    label={log.activity_type.replace(/_/g, ' ').toUpperCase()}
                    color={getActivityTypeColor(log.activity_type) as 'success' | 'warning' | 'info' | 'default'}
                    size="small"
                    variant="filled"
                  />
                </TableCell>
                <TableCell>{log.tag_id}</TableCell>
                <TableCell>{log.activity_description}</TableCell>
                <TableCell>{log.location_desc}</TableCell>
                <TableCell>{log.section_desc}</TableCell>
                <TableCell>{log.team_name}</TableCell>
                <TableCell>{log.checker_name}</TableCell>
                <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {logs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="textSecondary">
            No logs found
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CheckerLogs; 