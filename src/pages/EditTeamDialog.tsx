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
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EditIcon from '@mui/icons-material/Edit';


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
  roles 
}) => {
  const [teamName, setTeamName] = useState('');
  const [tagRange, setTagRange] = useState({ from: '', to: '' });
  const [userRoles, setUserRoles] = useState<{userId: string, roleId: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form with team data
  useEffect(() => {
    if (team) {
      setTeamName(team.team_name);
      setTagRange({ from: team.tag_from, to: team.tag_to });
      
      // Map team members to userRoles format
      const initialUserRoles = team.members.map(member => ({
        userId: member.user_id.toString(),
        roleId: member.role_id.toString()
      }));
      
      // Ensure at least one empty user role if no members
      setUserRoles(initialUserRoles.length > 0 ? initialUserRoles : [{ userId: '', roleId: '' }]);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!teamName || !tagRange.from || !tagRange.to) {
      setError('Please fill all required fields');
      return;
    }

    // Filter out empty user-role combinations and validate at least one user is selected
    const validUserRoles = userRoles.filter(ur => ur.userId && ur.roleId);
    
    if (validUserRoles.length === 0) {
      setError('Please select at least one team member');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const teamData = {
        team_name: teamName,
        tag_from: tagRange.from,
        tag_to: tagRange.to,
        members: validUserRoles.map(ur => ({
          user_id: parseInt(ur.userId),
          role_id: parseInt(ur.roleId)
        }))
      };

      console.log('=== FRONTEND DEBUG ===');
      console.log('Original team members:', team?.members);
      console.log('All userRoles (including empty):', userRoles);
      console.log('Valid userRoles (filtered):', validUserRoles);
      console.log('Sending team update data:', teamData);
      console.log('=== END FRONTEND DEBUG ===');

      const response = await servicesAPI.updateTeam(team?.team_id.toString() || '', teamData);
      
      if (response.data.success) {
        // Show success message with changes if available
        const changes = response.data.changes;
        if (changes) {
          const changeMessage = [];
          if (changes.added > 0) changeMessage.push(`${changes.added} member(s) added`);
          if (changes.removed > 0) changeMessage.push(`${changes.removed} member(s) removed`);
          
          if (changeMessage.length > 0) {
            console.log(`Team updated: ${changeMessage.join(', ')}`);
          }
        }
        
        onTeamUpdated(); // Refresh team list
        onClose(); // Close dialog
      }
    } catch (error: any) {
      console.error("Error updating team:", error);
      
      // Handle specific error messages from the server
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to update team. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!team) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditIcon color="primary" />
        Edit Team
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Team Name"
            fullWidth
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            margin="normal"
          />

          {userRoles.map((userRole, index) => (
            <Box display="flex" alignItems="center" gap={2} mt={2} key={index}>
              <FormControl fullWidth>
                <InputLabel>Select User</InputLabel>
                <Select
                  value={userRole.userId}
                  onChange={(e) => handleUserRoleChange(index, 'userId', e.target.value)}
                  input={<OutlinedInput label="Select User" />}
                  required
                >
                  {users.map((user) => (
                    <MenuItem key={user.user_id} value={user.user_id.toString()}>
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
                  required
                >
                  {roles.map((role) => (
                    <MenuItem key={role.role_id} value={role.role_id.toString()}>
                      {role.role_desc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <IconButton 
                onClick={() => handleRemoveUserRole(index)} 
                color="error" 
                disabled={userRoles.length === 1}
              >
                <RemoveIcon />
              </IconButton>
            </Box>
          ))}

          <Box display="flex" justifyContent="flex-end" mt={2}>
            <IconButton onClick={handleAddUserRole} color="primary">
              <AddIcon />
            </IconButton>
          </Box>

          <Box display="flex" gap={2} mt={2}>
            <TextField
              label="Tag From"
              fullWidth
              value={tagRange.from}
              onChange={(e) => setTagRange({ ...tagRange, from: e.target.value })}
              required
            />
            <TextField
              label="Tag To"
              fullWidth
              value={tagRange.to}
              onChange={(e) => setTagRange({ ...tagRange, to: e.target.value })}
              required
            />
          </Box>

          <DialogActions sx={{ mt: 3 }}>
            <Button onClick={onClose} color="secondary" disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              color="primary" 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Updating...' : 'Update Team'}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTeamDialog;