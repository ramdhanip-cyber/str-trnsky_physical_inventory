import { useState, useEffect } from "react";
import { createTheme, ThemeProvider } from "@mui/material";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom"; // Navigate, useLocation
import { SnackbarProvider } from 'notistack';
import Navigations from "./components/Navigations";
import LoginPage from "./pages/login";
import Dashboard from "./pages/dashboard";
import UserManagement from "./pages/userManagement";
import LocationManagement from "./pages/locationManagement";
import AddTeam from "./pages/teams";
// import AddTeam from "./pages/teams_sky";
import CounterPage from "./pages/counter";
import AssignedPage from "./pages/submitController";
import AssignedChecker from "./pages/assigned-checkers";
import CounterHome from "./pages/counterHome";
import CheckerHome from "./pages/checkerHome";
import ItemsPage from "./pages/items";
import { AuthProvider } from './context/AuthContext';
// import CountReviewPage from "./pages/counterReviewPage_SKY";
import CountReviewPage from "./pages/counterReviewPage";
import CheckReviewPage from "./pages/checkerReviewPage_improved";
import Checker from './pages/checker';
import CheckerLogs from './pages/checkerLogs';
import ReconciliationRecords from './pages/reconciliationRecords';
import ReconciliationPage from './pages/reconciliation';
import AdjustmentPage from './pages/adjustment';
// import Checker from './pages/checker_sku';
// import CheckerHomeSky from "./pages/checkerHome_sky";

// Define Theme
const theme = createTheme({
  palette: {
    primary: { main: "#0C2C48" },
    secondary: { main: "#fff" },
    text: {
      primary: "rgba(60, 72, 88, 1)",
      secondary: "rgba(132, 146, 166, 1)",
      disabled: "rgba(60, 72, 88, 0.38)",
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));

  // Dynamic base URL logic
  const getBaseURL = () => {
    console.log("baseURL");
    const baseUrl = window.location.pathname.split('/star-inventory/')[0] || '';
    return baseUrl + '/star-inventory';
  };
  
  const baseURL = getBaseURL();
  console.log("baseURL", baseURL);

  // Handle Login Success
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Get user role for role-based routing
  const getUserRole = () => {
    return localStorage.getItem('Selected Role') || '';
  };

  // Get default route based on user role
  const getDefaultRoute = () => {
    const role = getUserRole();
    switch(role) {
      case 'Controller':
        return '/dashboard';
      case 'Counter':
        return '/counter';
      case 'Checker':
        return '/checker';
      default:
        return '/dashboard';
    }
  };

  return (
    <SnackbarProvider 
      maxSnack={3} 
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      autoHideDuration={3000}
    >
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <Router basename={baseURL}>
            {isAuthenticated ? (
              // If authenticated, show the navigation
              <Navigations>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/locations" element={<LocationManagement />} />
                  <Route path="/items" element={<ItemsPage />} />
                  <Route path="/counter" element={<CounterHome />} />
                  <Route path="/checker" element={<CheckerHome />} />
                  <Route path="/counter-count/:location_id/:section_id/:team_id/:user_id" element={<CounterPage />} />
                  <Route path="/checker-count/:location_id/:section_id/:team_id/:user_id" element={<Checker />} />
                  <Route path="/checker-logs" element={<CheckerLogs />} />
                  <Route path="/count-review/:location_id" element={<CountReviewPage />} />
                  <Route path="/check-review/:location_id" element={<CheckReviewPage />} />
                  <Route path="/reconciliation/:location_id" element={<ReconciliationPage />} />
                  <Route path="/reconciliation-records/:locationId" element={<ReconciliationRecords />} />
                  <Route path="/adjustment" element={<AdjustmentPage />} />
                  {/* <Route path="/checker/12" element={<CheckerPage />} /> */}
                  <Route path="/assigned-counters" element={<AssignedPage />} />
                  <Route path="/assigned-checkers" element={<AssignedChecker />} />
                  <Route path="/teams" element={<AddTeam />} />
                  {/* If user tries to access login while authenticated, redirect based on role */}
                  <Route path="/login" element={<Navigate to={getDefaultRoute()} />} />
                  {/* Redirect to role-appropriate page for any other routes */}
                  <Route path="*" element={<Navigate to={getDefaultRoute()} />} />
                </Routes>
              </Navigations>
            ) : (
              // If not authenticated, show login page
              <Routes>
                <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                {/* Redirect to login page if not authenticated */}
                <Route path="*" element={<Navigate to="/login" />} />
              </Routes>
            )}
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </SnackbarProvider>
  );
}

export default App;
