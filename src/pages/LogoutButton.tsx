import { Button } from "@mui/material";
import { authAPI } from "../config/api";
import { getLoginPath } from "../config/appPath";

const LogoutButton = () => {
  const handleLogout = async () => {
    await authAPI.logout();
    // Navigate to login page
    window.location.href = getLoginPath();
  };

  return <Button onClick={handleLogout} variant="outlined">Logout</Button>;
};

export default LogoutButton;
