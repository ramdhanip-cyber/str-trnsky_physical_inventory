import { createTheme } from "@mui/material";
import { ThemeProvider } from "@emotion/react";
import Navigations from "./components/Navigations";
import LoginPage from "./pages/login";
import Dashboard from "./pages/dashboard";
import { Typography } from "@mui/material";
import { AuthProvider, useAuth } from "./context/AuthContext";
import UserManagement from "./pages/userManagement";
import LocationManagement from "./pages/locationManagement";
import ItemsPage from "./pages/items";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import React from "react";

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

// Private Route Wrapper
const PrivateRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const { user } = useAuth();
  console.log("User in PrivateRoute:", user); // Debugging
  return user ? <>{element}</> : <Navigate to="/login" />;
};

// Layout Component (Conditionally Render Navigation)
const Layout: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const location = useLocation();
  const hideNav = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <>
      {!hideNav ? <Navigations>{children}</Navigations> : children}
    </>
  );
};

// Main App Component
// const App: React.FC = () => {
//   return (
//     <AuthProvider>
//       <ThemeProvider theme={theme}>
//         <Router>
//           <Layout>
//             <Routes>
//               {/* Public Route */}
//               <Route path="/login" element={<LoginPage />} />

//               {/* Protected Routes */}
//               <Route path="/dashboard" element={<PrivateRoute element={<Dashboard />} />} />
//               <Route path="/users" element={<PrivateRoute element={<UserManagement />} />} />
//               <Route path="/locations" element={<PrivateRoute element={<LocationManagement />} />} />
//               <Route path="/items" element={<PrivateRoute element={<ItemsPage />} />} />

//               {/* Redirect all unknown routes to login */}
//               <Route path="*" element={<Navigate to="/login" />} />
//             </Routes>
//           </Layout>
//         </Router>
//       </ThemeProvider>
//     </AuthProvider>
//   );
// };

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Navigations>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/locations" element={<LocationManagement />} />
            <Route path="/items" element={<ItemsPage />} />
          </Routes>
        </Navigations>
      </Router>
    </ThemeProvider>
  );
}


export default App;
