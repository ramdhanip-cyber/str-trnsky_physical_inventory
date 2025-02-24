import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputLabel,
  FormControl,
  Snackbar,
  Alert,
} from "@mui/material";

interface User {
  user_id: number;
  user_name: string;
  full_name: string;
  role_id?: number;
  role_desc?: string;
}

interface Role {
  role_id: number;
  role_desc: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const [newUser, setNewUser] = useState({
    user_name: "",
    full_name: "",
    password: "",
    role_id: "",
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get<User[]>("http://localhost:5000/services/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get<Role[]>("http://localhost:5000/services/roles");
      setRoles(res.data);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const handleCreateUser = async () => {
    try {
      await axios.post("http://localhost:5000/services/create", newUser);
      setSnackbarMessage("User created successfully!");
      setSnackbarSeverity("success");
      fetchUsers();
      setOpen(false);
    } catch (error: any) {
      setSnackbarMessage(error.response?.data?.message || "An error occurred while creating the user.");
      setSnackbarSeverity("error");
    } finally {
      setSnackbarOpen(true);
    }
  };

  const handleAssignRole = async (userId: number, roleId: number) => {
    try {
      await axios.post("http://localhost:5000/services/assign-role", {
        user_id: userId,
        role_id: roleId,
      });
      setSnackbarMessage("Role assigned successfully!");
      setSnackbarSeverity("success");
      fetchUsers();
    } catch (error: any) {
      setSnackbarMessage(error.response?.data?.message || "Failed to assign role.");
      setSnackbarSeverity("error");
    } finally {
      setSnackbarOpen(true);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await axios.delete(`http://localhost:5000/services/users/${userId}`);
      setSnackbarMessage("User deleted successfully!");
      setSnackbarSeverity("success");
      fetchUsers();
    } catch (error: any) {
      setSnackbarMessage(error.response?.data?.message || "Failed to delete user.");
      setSnackbarSeverity("error");
    } finally {
      setSnackbarOpen(true);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(search.toLowerCase()) &&
      (roleFilter ? user.role_id?.toString() === roleFilter : true)
  );

  return (
    <div>
      <h2>User Management</h2>

      <Grid container spacing={2} alignItems="center" justifyContent="space-between">
        <Grid item xs={6}>
          <TextField
            label="Search by Name"
            variant="outlined"
            fullWidth
            onChange={(e) => setSearch(e.target.value)}
          />
        </Grid>
        <Grid item xs={4}>
          <FormControl fullWidth>
            <InputLabel>Filter by Role</InputLabel>
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {roles.map((role) => (
                <MenuItem key={role.role_id} value={role.role_id.toString()}>
                  {role.role_desc}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={2} textAlign="right">
          <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
            Add User
          </Button>
        </Grid>
      </Grid>

      <TableContainer component={Paper} style={{ marginTop: 20 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Full Name</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Assign Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.user_name}</TableCell>
                <TableCell>{user.role_desc || "No Role"}</TableCell>
                <TableCell>
                  <Select
                    value={user.role_id || ""}
                    onChange={(e) => handleAssignRole(user.user_id, Number(e.target.value))}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.role_id} value={role.role_id}>
                        {role.role_desc}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Button variant="contained" color="secondary" onClick={() => handleDeleteUser(user.user_id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            onChange={(e) => setNewUser({ ...newUser, user_name: e.target.value })}
          />
          <TextField
            fullWidth
            label="Full Name"
            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          <FormControl fullWidth style={{ marginTop: 16 }}>
            <InputLabel>Role</InputLabel>
            <Select value={newUser.role_id} onChange={(e) => setNewUser({ ...newUser, role_id: e.target.value })}>
              {roles.map((role) => (
                <MenuItem key={role.role_id} value={role.role_id}>
                  {role.role_desc}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default UserManagement;
