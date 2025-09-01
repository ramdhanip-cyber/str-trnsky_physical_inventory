import React, { useState, useEffect } from 'react';
import { servicesAPI } from '../config/api';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, 
  Select, MenuItem, OutlinedInput, Box, IconButton, Alert, Typography, Paper, 
  Tooltip, Stack, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { User, Role } from './teams';

interface UserRole {
  userId: string;
  roleId: string;
}

interface TagRange {
  from: string;
  to: string;
}

interface Team {
  team_id: number;
  team_name: string;
  tag_from: string;
  tag_to: string;
  current_tag?: string;
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
  const [tagRange, setTagRange] = useState<TagRange>({ from: '', to: '' });
  const [userRoles, setUserRoles] = useState<UserRole[]>([{ userId: '', roleId: '' }]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tagRangeWarning, setTagRangeWarning] = useState<string>('');

  // Fetch the last used tag when dialog opens
  useEffect(() => {
    if (open) {
      const fetchLastTag = async () => {
        try {
          const response = await servicesAPI.getTeams();
          const teams = response.data;
          setTeams(teams);
          
          if (teams && teams.length > 0) {
            const highestTag = Math.max(...teams.map((team: Team) => parseInt(team.tag_to) || 0));
            setTagRange(prev => ({ ...prev, from: (highestTag + 1).toString() }));
          } else {
            setTagRange(prev => ({ ...prev, from: '1' }));
          }
        } catch (error) {
          console.error('Error fetching last tag:', error);
        }
      };

      fetchLastTag();
    }
  }, [open]);

  // Validate tag range whenever it changes
  useEffect(() => {
    if (tagRange.from) {
      const fromTag = parseInt(tagRange.from);
      const overlappingTeam = teams.find(team => {
        const teamFromTag = parseInt(team.tag_from);
        const teamToTag = parseInt(team.tag_to);
        return fromTag >= teamFromTag && fromTag <= teamToTag;
      });

      if (overlappingTeam) {
        setTagRangeWarning(`Warning: Tag ${fromTag} falls within team "${overlappingTeam.team_name}" range (${overlappingTeam.tag_from}-${overlappingTeam.tag_to})`);
      } else {
        setTagRangeWarning('');
      }
    }
  }, [tagRange.from, teams]);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (tagRangeWarning) {
      if (!window.confirm('There is a tag range overlap warning. Do you want to proceed anyway?')) {
        return;
      }
    }

    const teamData = {
      teamName,
      tagRange,
      userRoles,
    };

    try {
      const response = await servicesAPI.createTeam(teamData);
      if (response.data.success) {
        alert("Team created successfully!");
        await onTeamCreated();
        onClose();
        setTeamName('');
        setTagRange({ from: '', to: '' });
        setUserRoles([{ userId: '', roleId: '' }]);
        setTagRangeWarning('');
      } else {
        console.error("Error creating team");
      }
    } catch (error: any) {
      console.error("Error submitting team:", error);
      
      // Handle specific error messages from the server
      if (error.response?.data?.message) {
        alert(`Error creating team: ${error.response.data.message}`);
      } else {
        alert('Failed to create team. Please try again.');
      }
    }
  };

  return (
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
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
              <LocalOfferIcon fontSize="small" />
              Tag Range Assignment
              <Tooltip title="Specify the range of tags this team will be responsible for">
                <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Typography>
            
            <Box display="flex" gap={2} mt={2}>
              <TextField
                label="Tag From"
                fullWidth
                value={tagRange.from}
                onChange={(e) => setTagRange({ ...tagRange, from: e.target.value })}
                required
                error={!!tagRangeWarning}
                type="number"
                InputProps={{
                  inputProps: { min: 1 }
                }}
              />
              <TextField
                label="Tag To"
                fullWidth
                value={tagRange.to}
                onChange={(e) => setTagRange({ ...tagRange, to: e.target.value })}
                required
                type="number"
                InputProps={{
                  inputProps: { min: parseInt(tagRange.from) || 1 }
                }}
              />
            </Box>

            {tagRangeWarning && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {tagRangeWarning}
              </Alert>
            )}
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
  );
};

export default AddTeamDialog;
