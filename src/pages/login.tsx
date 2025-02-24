import React, { useState } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const theme = useTheme();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:5000/services/login", { userName, password });
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        navigate("/dashboard"); // Redirect use Navigation Hook instead of window
      }
    } catch (error: any) {
      setError(error.response?.data?.message || "An error occurred");
      setOpenSnackbar(true); // Show Snackbar if error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container justifyContent="center" alignItems="center" sx={{ height: "100vh" }}>
      <Paper sx={{ p: 4, maxWidth: 400, margin: "auto", mt: 8 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 3 }}>
          Login
        </Typography>
        <form onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: theme.spacing(2) }}>
          <TextField
            label="Username"
            variant="outlined"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
            fullWidth
            autoFocus
            helperText={userName ? "" : "Please enter your username."}
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            helperText={password ? "" : "Please enter your password."}
          />
          {error && (
            <Typography sx={{ color: "error.main", textAlign: "center", mt: 2 }}>
              {error}
            </Typography>
          )}
          <Button
            sx={{ mt: 2 }}
            variant="contained"
            color="primary"
            type="submit"
            fullWidth
            disabled={loading}
            startIcon={loading ? <CircularProgress size={24} /> : null}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </Paper>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" sx={{ width: "100%" }} onClose={() => setOpenSnackbar(false)}>
          {error}
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default LoginPage;
