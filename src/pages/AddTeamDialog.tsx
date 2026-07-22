import React, { useState } from 'react';
import { servicesAPI } from '../config/api';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, 
  Select, MenuItem, OutlinedInput, Box, IconButton, Alert, Typography, Paper, 
  Tooltip, Stack, Chip, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { User, Role } from './teams';

interface UserRole {
  userId: string;
  roleId: string;
}

interface AddTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onTeamCreated: () => Promise<void>;
  users: User[];
  roles: Role[];
}

const AddTeamDialog: React.FC<AddTeamDialogProps> = ({ open, onClose, onTeamCreated, users, roles }) => {
  const [teamName, setTeamName] = useState('');
  const [userRoles, setUserRoles] = useState<UserRole[]>([{ userId: '', roleId: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddUserRole = () => {
    setUserRoles([...userRoles, { userId: '', roleId: '' }]);
  };

  const handleRemoveUserRole = (index: number) => {
    const updatedUserRoles = userRoles.filter((_, i) => i !== index);
    setUserRoles(updatedUserRoles);
  };

  const handleUserRoleChange = (index: number, key: keyof UserRole, value: string) => {
    const updatedUserRoles = [...userRoles];
    updatedUserRoles[index][key] = value;
    setUserRoles(updatedUserRoles);
  };

  const validateForm = (): boolean => {
    // Reset error
    setError(null);

    // Check if team name is empty
    if (!teamName.trim()) {
      setError('Team name is required');
      return false;
    }

    // Check if at least one user role is properly filled
    const hasValidUserRole = userRoles.some(ur => ur.userId && ur.roleId);
    if (!hasValidUserRole) {
      setError('At least one team member with a role is required');
      return false;
    }

    // Check for incomplete user role pairs
    const hasIncompleteUserRole = userRoles.some(ur => (!ur.userId && ur.roleId) || (ur.userId && !ur.roleId));
    if (hasIncompleteUserRole) {
      setError('Please complete both user and role selection for all team members');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    const teamData = {
      teamName,
      tagRange: { from: 0, to: 0 }, // Default value set to 0 since Tag Range is removed from UI
      userRoles: userRoles.filter(ur => ur.userId && ur.roleId), // Only send complete user-role pairs
    };

    try {
      const response = await servicesAPI.createTeam(teamData);
      if (response.data.success) {
        setSuccessMessage('Team created successfully!');
        await onTeamCreated();
        onClose();
        setTeamName('');
        setUserRoles([{ userId: '', roleId: '' }]);
        setError(null);
      } else {
        setError("Error creating team");
      }
    } catch (error: unknown) {
      console.error("Error submitting team:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data
        ? String(error.response.data.message)
        : 'Failed to create team. Please try again.';
      setError(errorMessage);
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'primary.main',
          color: 'white'
        }}>
          <GroupAddIcon />
          <Typography variant="h6" component="span">
            Create New Team
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                <GroupAddIcon fontSize="small" />
                Team Information
              </Typography>
              <TextField
                label="Team Name"
                fullWidth
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                sx={{ mt: 2 }}
                placeholder="Enter team name"
              />
            </Paper>

            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                  <GroupAddIcon fontSize="small" />
                  Team Members
                  <Tooltip title="Add team members and assign their roles">
                    <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                  </Tooltip>
                </Typography>
                <Tooltip title="Add Team Member">
                  <IconButton onClick={handleAddUserRole} color="primary" size="small">
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <Stack spacing={2}>
                {userRoles.map((userRole, index) => (
                  <Paper 
                    key={index} 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      border: '1px solid', 
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2 
                    }}
                  >
                    <Chip 
                      label={`Member ${index + 1}`} 
                      size="small" 
                      sx={{ minWidth: 80 }}
                    />
                    <FormControl fullWidth>
                      <InputLabel>Select User</InputLabel>
                      <Select
                        value={userRole.userId}
                        onChange={(e) => handleUserRoleChange(index, 'userId', e.target.value)}
                        input={<OutlinedInput label="Select User" />}
                        size="small"
                      >
                        {users.map((user) => (
                          <MenuItem key={user.user_id} value={user.user_id}>
                            {user.full_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Select Role</InputLabel>
                      <Select
                        value={userRole.roleId}
                        onChange={(e) => handleUserRoleChange(index, 'roleId', e.target.value)}
                        input={<OutlinedInput label="Select Role" />}
                        size="small"
                      >
                        {roles.map((role) => (
                          <MenuItem key={role.role_id} value={role.role_id}>
                            {role.role_desc}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Tooltip title="Remove Member">
                      <span>
                        <IconButton 
                          onClick={() => handleRemoveUserRole(index)} 
                          color="error" 
                          disabled={userRoles.length === 1}
                          size="small"
                        >
                          <RemoveIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </form>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={onClose} 
            color="inherit" 
            variant="outlined"
            startIcon={<RemoveIcon />}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            color="primary" 
            variant="contained"
            startIcon={<GroupAddIcon />}
          >
            Create Team
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSuccessMessage(null)} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AddTeamDialog;
