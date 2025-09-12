import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  IconButton,
  Collapse,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Avatar,
  Menu,
  MenuItem,
  styled,
  alpha,
} from "@mui/material";
import {
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
  Dashboard,
  GroupAdd,
  AddLocationAlt,
  Category,
  Build,
  History,
  Settings,
  Book,
  Reviews,
  Engineering,
  Inventory,
  Groups2,
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
  AccountCircle
} from "@mui/icons-material";

const drawerWidth = 280;
const collapsedWidth = 80;


const ModernAvatar = styled(Avatar)(({ theme }) => ({
  width: 40,
  height: 40,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: theme.palette.primary.main,
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
  }
}));

const ModernDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    backgroundColor: theme.palette.background.default,
    borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: '4px 0 8px rgba(0, 0, 0, 0.05)',
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
  },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  backgroundColor: alpha(theme.palette.primary.main, 0.03),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  minHeight: 64,
}));

const AppHeader = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  boxShadow: 'none',
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backdropFilter: 'blur(8px)',
  zIndex: theme.zIndex.drawer + 1,
}));

const UserMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 12,
    marginTop: theme.spacing(1),
    minWidth: 180,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    '& .MuiMenu-list': {
      padding: theme.spacing(1),
    },
    '& .MuiMenuItem-root': {
      borderRadius: 8,
      padding: theme.spacing(1, 2),
      gap: theme.spacing(1.5),
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
      },
    },
  },
}));

const CategoryLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: theme.palette.text.secondary,
  padding: theme.spacing(2, 3, 1),
  letterSpacing: '0.5px',
}));

const menuItems = {
  Controller: [
    {
      text: "Dashboard",
      icon: <Dashboard />,
      path: "/dashboard",
      subItems: []
    },
    {
      text: "Configurations",
      icon: <Build />,
      path: null,
      subItems: [
        { text: "Users", icon: <GroupAdd />, path: "/users" },
        { text: "Inventory", icon: <AddLocationAlt />, path: "/locations" },
        { text: "Analyse Inventory", icon: <Category />, path: "/items" },
        { text: "Teams", icon: <Groups2 />, path: "/teams" }
      ]
    },
    {
      text: "Review",
      icon: <Reviews />,
      path: null,
      subItems: [
        { text: "Counter", icon: <Engineering />, path: "/assigned-counters" },
        { text: "Checker", icon: <Inventory />, path: "/assigned-checkers" },
        { text: "Checker Logs", icon: <Book />, path: "/checker-logs" }
      ]
    }
  ],
  Common: [
    {
      text: "User Logs",
      icon: <Book />,
      path: "/logs",
      subItems: []
    },
    {
      text: "History",
      icon: <History />,
      path: "/history",
      subItems: []
    },
    {
      text: "Settings",
      icon: <Settings />,
      path: "/settings",
      subItems: []
    }
  ]
};

interface NavigationItem {
  text: string;
  icon: React.ReactNode;
  path: string | null;
  subItems: Array<{
    text: string;
    icon: React.ReactNode;
    path: string;
  }>;
}

interface NavigationProps {
  children: React.ReactElement;
}

interface ToggleButtonProps {
  theme?: any;
}

const ToggleButton = styled(IconButton)<ToggleButtonProps>(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  left: 20,
  backgroundColor: theme.palette.background.paper,
  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
  zIndex: theme.zIndex.drawer + 2,
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    transform: 'scale(1.1)',
  },
}));

export default function ModernNavigation({ children }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const { logout } = useAuth();
  const [role, setRole] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();

  const fullName = localStorage.getItem('full_name');

  useEffect(() => {
    const storedRole = localStorage.getItem('Selected Role');
    if (storedRole) {
      setRole(storedRole);
    }
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const handleSubmenuToggle = (text: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [text]: !prev[text]
    }));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const confirmLogout = async () => {
    try {
      // Clear all auth-related localStorage items
      localStorage.removeItem('token');
      localStorage.removeItem('full_name');
      localStorage.removeItem('User ID');
      localStorage.removeItem('User Roles');
      localStorage.removeItem('Selected Role');
      localStorage.removeItem('isAuthenticated');

      // Call the context logout
      await logout();
      
      // Close the dialog
      setOpenLogoutDialog(false);
      
      // Navigate to login page with base URL
      const getBaseURL = () => {
        const baseUrl = window.location.pathname.split('/star-inventory/')[0] || '';
        return baseUrl + '/star-inventory';
      };
      const baseURL = getBaseURL();
      window.location.href = `${baseURL}/login`; // Using window.location to force a full page reload
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const cancelLogout = () => {
    setOpenLogoutDialog(false);
  };

  const isActive = (path: string | null) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const renderMenuItems = (items: NavigationItem[]) => {
    return items.map((item) => {
      if (item.subItems.length === 0) {
        return (
          <ListItemButton
            key={item.text}
            component={Link}
            to={item.path || ''}
            selected={isActive(item.path)}
            sx={{
              minHeight: 48,
              justifyContent: collapsed ? 'center' : 'initial',
              px: 2.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: collapsed ? 'auto' : 3,
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!collapsed && <ListItemText primary={item.text} />}
          </ListItemButton>
        );
      }

      return (
        <Box key={item.text}>
          <ListItemButton
            onClick={() => handleSubmenuToggle(item.text)}
            sx={{
              minHeight: 48,
              justifyContent: collapsed ? 'center' : 'initial',
              px: 2.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: collapsed ? 'auto' : 3,
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!collapsed && (
              <>
                <ListItemText primary={item.text} />
                {openSubmenus[item.text] ? <ExpandLess /> : <ExpandMore />}
              </>
            )}
          </ListItemButton>
          <Collapse in={openSubmenus[item.text]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.subItems.map((subItem) => (
                <ListItemButton
                  key={subItem.text}
                  component={Link}
                  to={subItem.path}
                  selected={isActive(subItem.path)}
                  sx={{
                    pl: collapsed ? 2.5 : 4,
                    py: 1,
                    minHeight: 36,
                    justifyContent: collapsed ? 'center' : 'initial',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: collapsed ? 'auto' : 3,
                      justifyContent: 'center',
                    }}
                  >
                    {subItem.icon}
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={subItem.text} />}
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </Box>
      );
    });
  };

  const drawer = (
    <>
      <DrawerHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ModernAvatar src="/logo.png" alt="Logo" />
          {!collapsed && (
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              Inventory Count
            </Typography>
          )}
        </Box>
        <IconButton onClick={toggleCollapse}>
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </DrawerHeader>

      <Box sx={{ overflow: 'auto', py: 2 }}>
        {/* Only show Controller section if role is Controller */}
        {role === 'Controller' && (
          <Box key="Controller">
            {!collapsed && <CategoryLabel>Controller</CategoryLabel>}
            <List disablePadding>
              {renderMenuItems(menuItems.Controller)}
            </List>
            {!collapsed && <Divider sx={{ my: 2, opacity: 0.1 }} />}
          </Box>
        )}
        {/* Always show Common section */}
        <Box key="Common">
          {!collapsed && <CategoryLabel>Common</CategoryLabel>}
          <List disablePadding>
            {renderMenuItems(menuItems.Common)}
          </List>
          {!collapsed && <Divider sx={{ my: 2, opacity: 0.1 }} />}
        </Box>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppHeader
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${collapsed ? collapsedWidth : drawerWidth}px)` },
          ml: { sm: `${collapsed ? collapsedWidth : drawerWidth}px` },
          transition: theme => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box>
              <IconButton onClick={handleMenuOpen}>
                <ModernAvatar>
                  {fullName?.charAt(0).toUpperCase() || 'U'}
                </ModernAvatar>
              </IconButton>
              <UserMenu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {role}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                  <AccountCircle />
                  Profile
                </MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); setOpenLogoutDialog(true); }}>
                  <LogoutIcon />
                  Logout
                </MenuItem>
              </UserMenu>
            </Box>
          </Box>
        </Toolbar>
      </AppHeader>

      <ModernDrawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: collapsed ? collapsedWidth : drawerWidth,
            transition: theme => theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {drawer}
      </ModernDrawer>

      <ModernDrawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth },
        }}
      >
        {drawer}
      </ModernDrawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${collapsed ? collapsedWidth : drawerWidth}px)` },
          ml: { sm: `${collapsed ? collapsedWidth : drawerWidth}px` },
          transition: theme => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar />
        {children}
      </Box>

      <ToggleButton
        onClick={toggleCollapse}
        sx={{
          display: { xs: 'none', sm: 'flex' },
          left: collapsed ? collapsedWidth + 20 : drawerWidth + 20,
          transition: theme => theme.transitions.create('left', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </ToggleButton>

      <Dialog
        open={openLogoutDialog}
        onClose={cancelLogout}
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1
          }
        }}
      >
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to logout?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelLogout} color="inherit">Cancel</Button>
          <Button onClick={confirmLogout} variant="contained" color="primary">
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}