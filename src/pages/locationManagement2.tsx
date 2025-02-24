import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Snackbar,
  Alert,
  Chip,
  IconButton,
  Box,
  Menu,
  MenuItem
} from "@mui/material";
import { RemoveCircleOutline, Delete, Add, MoreVert } from "@mui/icons-material";

interface Location {
  location_id: number;
  location_desc: string;
  warehouse: string;
}

interface SubLocation {
  sub_location_id: number;
  location_id: number;
  sub_location_desc: string;
}

const LocationManagement: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [subLocations, setSubLocations] = useState<{ [key: number]: SubLocation[] }>({});
  const [openSub, setOpenSub] = useState<boolean>(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [newSubLocations, setNewSubLocations] = useState<{ sub_location_desc: string; error?: string }[]>([]);
  const [alertOpen, setAlertOpen] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [openAddLocation, setOpenAddLocation] = useState<boolean>(false);
  const [newLocation, setNewLocation] = useState({ location_desc: "", warehouse: "" });
  const [numSubLocations, setNumSubLocations] = useState<number | "">(""); // State for number input
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSubLocation, setSelectedSubLocation] = useState<any>(null);

  type MenuAction = 'Assign User' | 'Assign Item' | 'Delete';

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const res = await axios.get<Location[]>("http://localhost:5000/services/locations");
    setLocations(res.data);
    res.data.forEach((location) => fetchSubLocations(location.location_id));
  };

  const fetchSubLocations = async (location_id: number) => {
    const res = await axios.get<SubLocation[]>(`http://localhost:5000/services/${location_id}/sub-locations`);
    setSubLocations((prev) => ({ ...prev, [location_id]: res.data }));
  };

  const handleAddLocation = async () => {
    if (!newLocation.location_desc || !newLocation.warehouse) {
      setAlertMessage("Please fill in all fields.");
      setAlertOpen(true);
      return;
    }
  
    try {
      await axios.post("http://localhost:5000/services/locations", newLocation);
      setOpenAddLocation(false);
      setNewLocation({ location_desc: "", warehouse: "" });
      fetchLocations(); // Refresh locations after adding a new one
    } catch (error) {
      setAlertMessage("Error adding new location.");
      setAlertOpen(true);
    }
  };

  const handleDeleteLocation = async (location_id: number) => {
    try {
      await axios.delete(`http://localhost:5000/services/locations/${location_id}`);
      fetchLocations();
    } catch (error) {
      setAlertMessage("Error deleting location.");
      setAlertOpen(true);
    }
  };

  const handleDeleteSubLocation = async (sub_location_id: number, location_id: number) => {
    try {
      await axios.delete(`http://localhost:5000/services/sub-locations/${sub_location_id}`);
      fetchSubLocations(location_id); // Refresh sub-locations after deletion
    } catch (error) {
      setAlertMessage("Error deleting sub-location.");
      setAlertOpen(true);
    }
  };

  const handleCreateSubLocations = async () => {
    if (!selectedLocationId) return;

    const uniqueNames = new Set();
    for (let sub of newSubLocations) {
      if (uniqueNames.has(sub.sub_location_desc)) {
        setAlertMessage("Duplicate sub-location names are not allowed.");
        setAlertOpen(true);
        return;
      }
      uniqueNames.add(sub.sub_location_desc);
    }

    for (let sub of newSubLocations) {
      await axios.post("http://localhost:5000/services/sub-locations", {
        location_id: selectedLocationId,
        sub_location_desc: sub.sub_location_desc,
      });
    }

    setOpenSub(false);
    fetchSubLocations(selectedLocationId);
  };

  const handleClickMenu = (event: React.MouseEvent<HTMLElement>, sub: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedSubLocation(sub);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedSubLocation(null);
  };

  const handleMenuAction = (action: MenuAction) => {
    switch (action) {
      case 'Assign User':
        assignUserToSubLocation();
        break;
      case 'Assign Item':
        assignItemToSubLocation();
        break;
      default:
        break;
    }
    handleCloseMenu();
  };

  const assignUserToSubLocation = () => {
    // Handle assigning a user to the selected sub-location
    console.log(`Assigning user to sub-location: ${selectedSubLocation.sub_location_desc}`);
    // Add your logic for assigning a user here
  };

  const assignItemToSubLocation = () => {
    // Handle assigning an item to the selected sub-location
    console.log(`Assigning item to sub-location: ${selectedSubLocation.sub_location_desc}`);
    // Add your logic for assigning an item here
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h4" gutterBottom>
            Location Management
        </Typography>
        <Button variant="contained" color="primary" onClick={() => setOpenAddLocation(true)}>
            + Add Location
        </Button>
      </div>

      <Dialog open={openAddLocation} onClose={() => setOpenAddLocation(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Location</DialogTitle>
        <DialogContent>
            <TextField
            fullWidth
            label="Location Name"
            value={newLocation.location_desc}
            onChange={(e) => setNewLocation({ ...newLocation, location_desc: e.target.value })}
            style={{ marginBottom: 10 }}
            />
            <TextField
            fullWidth
            label="Warehouse"
            value={newLocation.warehouse}
            onChange={(e) => setNewLocation({ ...newLocation, warehouse: e.target.value })}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenAddLocation(false)}>Cancel</Button>
            <Button onClick={handleAddLocation} variant="contained" color="primary">
            Add
            </Button>
        </DialogActions>
        </Dialog>

      <Grid container spacing={3}>
        {locations.map((location) => (
          <Grid item xs={12} sm={6} md={4} key={location.location_id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">{location.location_desc}</Typography>
                  <IconButton onClick={() => handleDeleteLocation(location.location_id)} color="error">
                    <Delete />
                  </IconButton>
                </Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Warehouse: {location.warehouse}
                </Typography>

                <Button
                  variant="outlined"
                  onClick={() => {
                    setSelectedLocationId(location.location_id);
                    setNewSubLocations([{ sub_location_desc: "", error: "" }]);
                    setOpenSub(true);
                  }}
                  style={{ marginTop: 10 }}
                >
                  Add Sub-Locations
                </Button>
              </CardContent>

              <Grid container spacing={1} style={{ padding: 10 }}>
                {(subLocations[location.location_id] || []).map((sub) => (
                  <Grid item key={sub.sub_location_id}>
                    <Chip
                      label={sub.sub_location_desc}
                      color="primary"
                      variant="outlined"
                      style={{
                        margin: 5,
                        borderRadius: 4, // Square edges (instead of rounded)
                        paddingRight: '40px', // Extra space for the 3 dots icon
                      }}
                      onClick={(event) => handleClickMenu(event, sub)} // Open menu on click
                    />
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl) && selectedSubLocation === sub}
                      onClose={handleCloseMenu}
                    >
                      <MenuItem onClick={() => handleMenuAction('Assign User')}>Assign User</MenuItem>
                      {/* <MenuItem onClick={() => handleMenuAction('Assign Item')}>Assign Item</MenuItem> */}
                      <MenuItem onClick={() => handleDeleteSubLocation(sub.sub_location_id, location.location_id)}>Delete</MenuItem>
                    </Menu>
                  </Grid>
                ))}
              </Grid>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add Sub-Location Dialog */}
      <Dialog open={openSub} onClose={() => setOpenSub(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Sub-Locations</DialogTitle>
        <DialogContent>
          {selectedLocationId && (
            <div style={{ marginBottom: 20 }}>
              <Typography variant="h6">
                Location: {locations.find((loc) => loc.location_id === selectedLocationId)?.location_desc}
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Warehouse: {locations.find((loc) => loc.location_id === selectedLocationId)?.warehouse}
              </Typography>
            </div>
          )}

          {/* Input for number of sub-locations */}
          <TextField
            fullWidth
            type="number"
            label="Number of Sub-Locations"
            value={numSubLocations}
            onChange={(e) => {
              let count = parseInt(e.target.value, 10);
              if (isNaN(count) || count < 1) return;
              
              let locationName = locations.find((loc) => loc.location_id === selectedLocationId)?.location_desc || "LOC";
              let generatedSubLocations = Array.from({ length: count }, (_, i) => ({
                sub_location_desc: `${locationName}-${i + 1}`,
                error: "",
              }));

              setNewSubLocations(generatedSubLocations);
              setNumSubLocations(count);
            }}
            style={{ marginBottom: 10 }}
          />

          {/* Display Generated Sub-Locations */}
          {newSubLocations.map((sub, index) => (
            <div key={index} style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              <TextField
                fullWidth
                label={`Sub-Location ${index + 1}`}
                value={sub.sub_location_desc}
                disabled
              />
            </div>
          ))}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenSub(false)}>Cancel</Button>
          <Button
            onClick={handleCreateSubLocations}
            variant="contained"
            color="primary"
            disabled={newSubLocations.length === 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Alert */}
      <Snackbar open={alertOpen} autoHideDuration={4000} onClose={() => setAlertOpen(false)}>
        <Alert onClose={() => setAlertOpen(false)} severity="warning" variant="filled">
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default LocationManagement;
