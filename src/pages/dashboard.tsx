import React from "react";
import { Box, Grid, Paper, Typography, Card, CardContent } from "@mui/material";
// import { useAuth } from "../context/AuthContext";

const Dashboard: React.FC = () => {

    // const { user } = useAuth();


  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
        {/* Dashboard Overview, Welcome, {user?.username}! */}
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3}>
        {[
          { title: "Total Users", value: "1,245", color: "#2196F3" },
          { title: "Total Count", value: "8,530", color: "#4CAF50" },
          { title: "Errors Recorded", value: "34", color: "#FFC107" },
          { title: "Rechecks", value: "7", color: "#F44336" },
        ].map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ backgroundColor: item.color, color: "white" }}>
              <CardContent>
                <Typography variant="h6">{item.title}</Typography>
                <Typography variant="h4">{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section (Placeholder) */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="h6" color="textSecondary">
              Chart / Analytics Placeholder
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="h6" color="textSecondary">
              Quick Insights
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity Table */}
      <Box sx={{ mt: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Typography variant="body2" color="textSecondary">
            No recent activity available.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;
