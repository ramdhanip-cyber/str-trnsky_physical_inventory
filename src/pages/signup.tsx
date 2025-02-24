import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Alert, 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel 
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";

const Signup: React.FC = () => {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [roles, setRoles] = useState<{ role_id: number; role_desc: string }[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch roles from the API
    axios.get("http://localhost:5000/auth/roles")
      .then((res) => setRoles(res.data))
      .catch(() => setError("Failed to load roles"));
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (fullName.length < 3) {
      setError("Full Name must be at least 3 characters.");
      return;
    }
    if (username.length < 3 || password.length < 6) {
      setError("Username must be at least 3 characters and password at least 6.");
      return;
    }
    if (!role) {
      setError("Please select a role.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/auth/signup", { 
        full_name: fullName,
        username, 
        password, 
        role_id: role 
      });

      setMessage(res.data.message);
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setError("Signup failed. Try again.");
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, mt: 8, borderRadius: 2 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Sign Up
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

        <Box component="form" onSubmit={handleSignup} noValidate>
          <TextField
            fullWidth
            margin="normal"
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              {roles.map((r) => (
                <MenuItem key={r.role_id} value={r.role_id}>
                  {r.role_desc}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button 
            type="submit" 
            fullWidth 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2, mb: 2 }}
          >
            Sign Up
          </Button>
          <Grid container justifyContent="center">
            <Typography variant="body2">
              Already have an account?{" "}
              <Link to="/login" style={{ textDecoration: "none", color: "#0C2C48", fontWeight: "bold" }}>
                Login
              </Link>
            </Typography>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default Signup;
