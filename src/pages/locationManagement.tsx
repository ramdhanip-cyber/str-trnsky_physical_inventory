import React, { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse, IconButton, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp, Delete, PersonAdd } from "@mui/icons-material";
import axios from "axios";

interface Location {
  location_id: number;
  location_desc: string;
  warehouse: string;
}

interface SubLocation {
  sub_location_id: number;
  sub_location_desc: string;
  location_id: number;
}

interface User {
    user_id: number;
    user_name: string;
}

const API_URL = "http://localhost:5000/services/";
const LOC_API_URL = "http://localhost:5000/services/locations";
const SUB_API_URL = "http://localhost:5000/services/sub-locations";
const USERS_API_URL = "http://localhost:5000/services/users";  // API to get users
const ASSIGN_USER_API = "http://localhost:5000/services/assign-user"; // API to assign users

const LocationManagement: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocationDesc, setNewLocationDesc] = useState<string>("");
  const [newWarehouse, setNewWarehouse] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>({});
  const [subLocations, setSubLocations] = useState<{ [key: number]: SubLocation[] }>({});
  const [subLocationCounts, setSubLocationCounts] = useState<{ [key: number]: number }>({});  // Tracks the count for each location
  const [subLocationCount, setSubLocationCount] = useState<number>(1);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [openAssignDialog, setOpenAssignDialog] = useState<boolean>(false);
  const [selectedSubLocation, setSelectedSubLocation] = useState<SubLocation | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | "">("");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data } = await axios.get<Location[]>(LOC_API_URL);
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations", error);
    }
  };

  const fetchSubLocations = async (locationId: number) => {
    try {
      const { data } = await axios.get<SubLocation[]>(`${API_URL}/${locationId}/sub-locations`);
      setSubLocations((prev) => ({ ...prev, [locationId]: data }));
      setSubLocationCounts((prev) => ({ ...prev, [locationId]: data.length }));  // Update count
    } catch (error) {
      console.error("Error fetching sub-locations", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get<User[]>(USERS_API_URL);
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users", error);
    }
  };

  const assignUserToSubLocation = async () => {
    if (!selectedUser || !selectedSubLocation) return;
    try {
      await axios.post(ASSIGN_USER_API, {
        user_id: selectedUser,
        sub_location_id: selectedSubLocation.sub_location_id,
        location_id: selectedLocation.location_id
      });
      setOpenAssignDialog(false);
      setSelectedUser("");
      setSelectedSubLocation(null);
    } catch (error) {
      console.error("Error assigning user", error);
    }
  };

  const addLocation = async () => {
    if (!newLocationDesc || !newWarehouse) return;
    try {
      await axios.post(LOC_API_URL, { location_desc: newLocationDesc, warehouse: newWarehouse });
      setNewLocationDesc("");
      setNewWarehouse("");
      setOpenDialog(false);
      fetchLocations();
    } catch (error) {
      console.error("Error adding location", error);
    }
  };

  const deleteLocation = async (locationId: number) => {
    try {
      await axios.delete(`${LOC_API_URL}/${locationId}`);
      fetchLocations();
    } catch (error) {
      console.error("Error deleting location", error);
    }
  };

  const createSubLocations = async (location: Location) => {
    try {
      // Fetch existing sub-locations to determine the highest sub-location number
      const currentSubLocations = subLocations[location.location_id] || [];
      const highestNumber = currentSubLocations
        .map((sub) => {
          const match = sub.sub_location_desc.match(/(\d+)$/); // Get the number from the description
          return match ? parseInt(match[1], 10) : 0;
        })
        .reduce((max, num) => Math.max(max, num), 0);
  
      const subLocationNames = Array.from({ length: subLocationCount }, (_, i) => {
        const nextNumber = highestNumber + i + 1; // Increment from the highest existing number
        return `${location.location_desc}-${nextNumber}`;
      });
  
      // Create new sub-locations
      await Promise.all(subLocationNames.map((name) => axios.post(SUB_API_URL, { location_id: location.location_id, sub_location_desc: name })));
      fetchSubLocations(location.location_id);
    } catch (error) {
      console.error("Error creating sub-locations", error);
    }
  };

  const deleteSubLocation = async (subLocationId: number, locationId: number) => {
    try {
      await axios.delete(`${SUB_API_URL}/${subLocationId}`);
      fetchSubLocations(locationId);
    } catch (error) {
      console.error("Error deleting sub-location", error);
    }
  };

  return (
    <div>
      <h2>Location Management</h2>
      <Button variant="contained" onClick={() => setOpenDialog(true)}>Add Location</Button>

      {/* Assign User Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)}>
        <DialogTitle>Assign User</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select User</InputLabel>
            <Select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value as number)}
            >
              {users.map((user) => (
                <MenuItem key={user.user_id} value={user.user_id}>
                  {user.user_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={assignUserToSubLocation} color="primary" variant="contained">
            Assign
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Location Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add New Location</DialogTitle>
        <DialogContent>
          <TextField
            label="Location Description"
            value={newLocationDesc}
            onChange={(e) => setNewLocationDesc(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Warehouse Name"
            value={newWarehouse}
            onChange={(e) => setNewWarehouse(e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={addLocation} color="primary" variant="contained">
            Add Location
          </Button>
        </DialogActions>
      </Dialog>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.map((location) => (
              <>
                <TableRow key={location.location_id}>
                  <TableCell>
                    <IconButton onClick={() => {
                      setExpandedRows((prev) => ({ ...prev, [location.location_id]: !prev[location.location_id] }));
                      if (!subLocations[location.location_id]) fetchSubLocations(location.location_id);
                    }}>
                      {expandedRows[location.location_id] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{location.location_desc}</TableCell>
                  <TableCell>{location.warehouse}</TableCell>
                  <TableCell>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <Button
                        onClick={() => deleteLocation(location.location_id)}
                        startIcon={<Delete />}
                        color="error"
                        style={{ marginRight: "10px" }}
                        >
                        Delete
                        </Button>

                        <TextField
                        type="number"
                        value={subLocationCount}
                        onChange={(e) => setSubLocationCount(Number(e.target.value))}
                        style={{ width: "60px", marginRight: "10px" }}
                        label="Sub-Locations"
                        inputProps={{ min: 1 }}
                        />

                        <Button
                        onClick={() => createSubLocations(location)}
                        variant="contained"
                        style={{ marginRight: "10px" }}
                        >
                        Add Sub-Locations
                        </Button>
                    </div>
                    </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
                    <Collapse in={expandedRows[location.location_id]} timeout="auto" unmountOnExit>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Sub-Location Name</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(subLocations[location.location_id] || []).map((sub) => (
                            <TableRow key={sub.sub_location_id}>
                              <TableCell>{sub.sub_location_desc}</TableCell>
                              <TableCell>
                              <Button
                                  startIcon={<PersonAdd />}
                                  color="primary"
                                  onClick={() => {
                                    setSelectedSubLocation(sub);
                                    setSelectedLocation(location);
                                    fetchUsers();
                                    setOpenAssignDialog(true);
                                  }}
                                >
                                  Assign User
                                </Button>
                                <Button onClick={() => deleteSubLocation(sub.sub_location_id, location.location_id)} startIcon={<Delete />} color="error">
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default LocationManagement;
