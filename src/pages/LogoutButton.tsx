import { Button } from "@mui/material";
import { authAPI } from "../config/api";

const LogoutButton = () => {
  const handleLogout = async () => {
    await authAPI.logout();
    // Navigate to login page with base URL
    const getBaseURL = () => {
      const baseUrl = window.location.pathname.split('/star-inventory/')[0] || '';
      return baseUrl + '/star-inventory';
    };
    const baseURL = getBaseURL();
    window.location.href = `${baseURL}/login`; // Using window.location to force a full page reload
  };

  return <Button onClick={handleLogout} variant="outlined">Logout</Button>;
};

export default LogoutButton;
