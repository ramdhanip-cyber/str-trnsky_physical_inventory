import React, { useState, useEffect } from 'react';
import { servicesAPI } from '../config/api';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  Typography,
  Avatar,
  Chip,
  Stack,
  Divider,
  Tooltip,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';

const BRAND = '#0C2C48';
const BRAND_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';

interface User {
  user_id: number;
  full_name: string;
}

interface Role {
  role_id: number;
  role_desc: string;
}

interface TeamMember {
  user_id: number;
  role_id: number;
}

interface Team {
  team_id: number;
  team_name: string;
  tag_from: string;
  tag_to: string;
  members: TeamMember[];
}

interface EditTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onTeamUpdated: () => void;
  team: Team | null;
  users: User[];
  roles: Role[];
}

const EditTeamDialog: React.FC<EditTeamDialogProps> = ({
  open,
  onClose,
  onTeamUpdated,
  team,
  users,
  roles,
}) => {
  const [teamName, setTeamName] = useState('');
  const [userRoles, setUserRoles] = useState<{ userId: string; roleId: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (team) {
      setTeamName(team.team_name);
      const initialUserRoles = team.members.map((member) => ({
        userId: member.user_id.toString(),
        roleId: member.role_id.toString(),
      }));
      setUserRoles(initialUserRoles.length > 0 ? initialUserRoles : [{ userId: '', roleId: '' }]);
      setError('');
    }
  }, [team]);

  const handleAddUserRole = () => {
    setUserRoles([...userRoles, { userId: '', roleId: '' }]);
  };

  const handleRemoveUserRole = (index: number) => {
    const updatedUserRoles = userRoles.filter((_, i) => i !== index);
    setUserRoles(updatedUserRoles.length > 0 ? updatedUserRoles : [{ userId: '', roleId: '' }]);
  };

  const handleUserRoleChange = (index: number, key: 'userId' | 'roleId', value: string) => {
    const updatedUserRoles = [...userRoles];
    updatedUserRoles[index][key] = value;
    setUserRoles(updatedUserRoles);
  };

  const filledCount = userRoles.filter((ur) => ur.userId && ur.roleId).length;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!teamName) {
      setError('Team name is required');
      return;
    }

    const validUserRoles = userRoles.filter((ur) => ur.userId && ur.roleId);

    if (validUserRoles.length === 0) {
      setError('Please select at least one team member');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const teamData = {
        team_name: teamName,
        tag_from: team?.tag_from || '0',
        tag_to: team?.tag_to || '0',
        members: validUserRoles.map((ur) => ({
          user_id: parseInt(ur.userId),
          role_id: parseInt(ur.roleId),
        })),
      };

      const response = await servicesAPI.updateTeam(team?.team_id.toString() || '', teamData);

      if (response.data.success) {
        onTeamUpdated();
        onClose();
      }
    } catch (err: unknown) {
      console.error('Error updating team:', err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Failed to update team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!team) return null;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(12,44,72,0.2)',
        },
      }}
    >
      <DialogTitle
        sx={{
          background: BRAND_GRADIENT,
          color: '#fff',
          py: 2,
          px: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <EditIcon sx={{ fontSize: 20 }} />
        </Avatar>
        <Box flex={1} minWidth={0}>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            Edit Team
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
            Update name and members for this team
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={loading}
          size="small"
          sx={{
            color: '#fff',
            bgcolor: 'rgba(255,255,255,0.12)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 1,
              fontWeight: 700,
              color: alpha(BRAND, 0.55),
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            Team details
          </Typography>
          <TextField
            label="Team Name"
            fullWidth
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            size="small"
            sx={{ mb: 2.5 }}
          />

          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <PeopleIcon sx={{ color: BRAND, fontSize: 20 }} />
              <Typography fontWeight={700} sx={{ color: BRAND }}>
                Members
              </Typography>
            </Box>
            <Chip
              size="small"
              label={`${filledCount} assigned`}
              sx={{
                height: 24,
                fontWeight: 700,
                fontSize: '0.7rem',
                color: '#fff',
                background: BRAND_GRADIENT,
              }}
            />
          </Box>

          <Stack
            spacing={1.25}
            sx={{
              maxHeight: 320,
              overflowY: 'auto',
              pr: 0.5,
              mb: 1.5,
              '&::-webkit-scrollbar': { width: 5 },
              '&::-webkit-scrollbar-thumb': {
                background: alpha(BRAND, 0.25),
                borderRadius: 8,
              },
            }}
          >
            {userRoles.map((userRole, index) => {
              const selectedUser = users.find((u) => u.user_id.toString() === userRole.userId);
              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    p: 1.25,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(BRAND, 0.12)}`,
                    bgcolor: alpha(BRAND, 0.02),
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      background: selectedUser ? BRAND_GRADIENT : alpha(BRAND, 0.1),
                      color: selectedUser ? '#fff' : BRAND,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {selectedUser ? (
                      selectedUser.full_name
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    ) : (
                      <PersonIcon sx={{ fontSize: 16 }} />
                    )}
                  </Avatar>

                  <FormControl fullWidth size="small">
                    <InputLabel>User</InputLabel>
                    <Select
                      value={userRole.userId}
                      onChange={(e) => handleUserRoleChange(index, 'userId', e.target.value)}
                      input={<OutlinedInput label="User" />}
                      required
                    >
                      {users.map((user) => (
                        <MenuItem key={user.user_id} value={user.user_id.toString()}>
                          {user.full_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small" sx={{ maxWidth: 160 }}>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={userRole.roleId}
                      onChange={(e) => handleUserRoleChange(index, 'roleId', e.target.value)}
                      input={<OutlinedInput label="Role" />}
                      required
                    >
                      {roles.map((role) => (
                        <MenuItem key={role.role_id} value={role.role_id.toString()}>
                          {role.role_desc}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Tooltip title="Remove member">
                    <span>
                      <IconButton
                        onClick={() => handleRemoveUserRole(index)}
                        disabled={userRoles.length === 1}
                        size="small"
                        sx={{
                          color: 'error.main',
                          border: `1px solid ${alpha('#d32f2f', 0.25)}`,
                          borderRadius: 1.5,
                          '&:hover': { bgcolor: alpha('#d32f2f', 0.06) },
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              );
            })}
          </Stack>

          <Divider sx={{ mb: 1.5, borderColor: alpha(BRAND, 0.08) }} />

          <Button
            fullWidth
            onClick={handleAddUserRole}
            startIcon={<AddIcon />}
            variant="outlined"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: BRAND,
              borderColor: alpha(BRAND, 0.25),
              '&:hover': {
                borderColor: BRAND,
                bgcolor: alpha(BRAND, 0.04),
              },
            }}
          >
            Add member
          </Button>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            py: 2,
            gap: 1,
            borderTop: `1px solid ${alpha(BRAND, 0.08)}`,
          }}
        >
          <Button
            onClick={onClose}
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600, color: BRAND }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <EditIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              px: 2.5,
              background: BRAND_GRADIENT,
              boxShadow: 'none',
              '&:hover': {
                background: BRAND_GRADIENT,
                filter: 'brightness(1.05)',
                boxShadow: 'none',
              },
            }}
          >
            {loading ? 'Updating…' : 'Update Team'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditTeamDialog;
