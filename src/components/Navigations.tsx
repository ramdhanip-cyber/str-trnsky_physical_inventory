import { useState, useEffect, type ElementType } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLoginPath } from "../config/appPath";
import { getDefaultRouteForRole, orderRoles, parseUserRoles } from "../config/roleUtils";
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
  Chip,
  Tooltip,
  styled,
  alpha,
} from "@mui/material";
import { keyframes } from "@mui/system";
import {
  Logout as LogoutIcon,
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
  AccountCircle,
  Storage,
  Security,
  Assessment,
  Description,
  ListAlt,
  Tune,
  Check,
  SwapHoriz,
  CorporateFare,
  PointOfSale,
  FactCheck,
  AutoAwesome,
  Inventory2,
} from "@mui/icons-material";
import type { Theme } from "@mui/material/styles";

const drawerWidth = 280;
const collapsedWidth = 84;

const SIDEBAR_GRADIENT = 'linear-gradient(180deg, #0C2C48 0%, #123a5e 55%, #0C2C48 100%)';

const fadeSlideIn = keyframes`
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
`;

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
    background: SIDEBAR_GRADIENT,
    color: '#fff',
    borderRight: 'none',
    boxShadow: '6px 0 30px rgba(12,44,72,0.35)',
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
  },
}));

const DrawerHeader = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  background: 'rgba(255,255,255,0.04)',
  borderBottom: '1px solid rgba(255,255,255,0.10)',
  minHeight: 72,
}));

const NavItem = styled(ListItemButton)<{ component?: ElementType; to?: string }>(() => ({
  margin: '4px 12px',
  borderRadius: 12,
  minHeight: 48,
  color: 'rgba(255,255,255,0.72)',
  position: 'relative',
  overflow: 'hidden',
  transition: 'background-color 0.25s ease, color 0.25s ease, transform 0.25s cubic-bezier(0.4,0,0.2,1)',
  '& .MuiListItemIcon-root': {
    color: 'rgba(255,255,255,0.7)',
    transition: 'transform 0.25s ease, color 0.25s ease',
  },
  '& .MuiListItemText-primary': {
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'font-weight 0.2s ease',
  },
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.09)',
    color: '#fff',
    transform: 'translateX(5px)',
    '& .MuiListItemIcon-root': { color: '#fff', transform: 'scale(1.12)' },
  },
  '&.Mui-selected': {
    backgroundColor: 'rgba(255,255,255,0.16)',
    color: '#fff',
    boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
    '& .MuiListItemIcon-root': { color: '#fff' },
    '& .MuiListItemText-primary': { fontWeight: 700 },
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '18%',
      height: '64%',
      width: 4,
      borderRadius: '0 4px 4px 0',
      background: 'linear-gradient(180deg, #7cc6ff 0%, #4f9bd6 100%)',
    },
  },
  '&.Mui-disabled': { opacity: 0.45 },
}));

const CategoryDivider = styled(Divider)(() => ({
  margin: '12px 20px',
  borderColor: 'rgba(255,255,255,0.10)',
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
    minWidth: 220,
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

const CategoryLabel = styled(Typography)(() => ({
  fontSize: '0.68rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.45)',
  padding: '16px 24px 8px',
  letterSpacing: '1.2px',
}));

const menuItems = {
  Reconciler: [
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
        { text: "Stock Available", icon: <Storage />, path: "/stock-available" },
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
    },
    {
      text: "Reports",
      icon: <Assessment />,
      path: null,
      subItems: [
        { text: "Reconciliation", icon: <Description />, path: "/reports/reconciliation" },
        { text: "Adjustment", icon: <Tune />, path: "/reports/adjustment" },
        { text: "Count", icon: <ListAlt />, path: "/reports/count" },
        { text: "Custom", icon: <Assessment />, path: "/reports/custom" }
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
  theme?: Theme;
}

const ToggleButton = styled(IconButton)<ToggleButtonProps>(({ theme }) => ({
  position: 'fixed',
  bottom: 24,
  left: 20,
  width: 40,
  height: 40,
  color: '#fff',
  background: 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)',
  boxShadow: '0 6px 18px rgba(12,44,72,0.4)',
  zIndex: theme.zIndex.drawer + 2,
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #123a5e 0%, #2670a8 100%)',
    transform: 'scale(1.12)',
    boxShadow: '0 8px 22px rgba(12,44,72,0.5)',
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
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const fullName = localStorage.getItem('full_name');

  const loadUserRoles = () => {
    setUserRoles(orderRoles(parseUserRoles()));
  };

  useEffect(() => {
    loadUserRoles();
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
    loadUserRoles();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'Reconciler':
        return <CorporateFare fontSize="small" sx={{ color: 'primary.main' }} />;
      case 'Counter':
        return <PointOfSale fontSize="small" sx={{ color: 'secondary.main' }} />;
      case 'Checker':
        return <FactCheck fontSize="small" sx={{ color: 'info.main' }} />;
      default:
        return <AccountCircle fontSize="small" />;
    }
  };

  const handleRoleSwitch = (newRole: string) => {
    if (newRole === role) {
      handleMenuClose();
      return;
    }

    localStorage.setItem('Selected Role', newRole);
    setRole(newRole);
    handleMenuClose();
    navigate(getDefaultRouteForRole(newRole));
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

      // Navigate to login page
      window.location.href = getLoginPath();
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
        const isClickable = Boolean(item.path);

        return (
          <Tooltip
            key={item.text}
            title={collapsed ? item.text : ''}
            placement="right"
            arrow
          >
            <NavItem
              {...(isClickable ? { component: Link, to: item.path as string } : {})}
              disabled={!isClickable}
              selected={isActive(item.path)}
              sx={{
                justifyContent: collapsed ? 'center' : 'initial',
                px: collapsed ? 1.5 : 2,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: collapsed ? 'auto' : 2.5,
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.text} />}
            </NavItem>
          </Tooltip>
        );
      }

      const submenuOpen = Boolean(openSubmenus[item.text]);
      const hasActiveChild = item.subItems.some((sub) => isActive(sub.path));

      return (
        <Box key={item.text}>
          <Tooltip title={collapsed ? item.text : ''} placement="right" arrow>
            <NavItem
              onClick={() => {
                if (collapsed) {
                  setCollapsed(false);
                  setOpenSubmenus((prev) => ({ ...prev, [item.text]: true }));
                } else {
                  handleSubmenuToggle(item.text);
                }
              }}
              selected={collapsed && hasActiveChild}
              sx={{
                justifyContent: collapsed ? 'center' : 'initial',
                px: collapsed ? 1.5 : 2,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: collapsed ? 'auto' : 2.5,
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <>
                  <ListItemText primary={item.text} />
                  <ExpandMore
                    sx={{
                      color: 'rgba(255,255,255,0.55)',
                      transition: 'transform 0.3s ease',
                      transform: submenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </>
              )}
            </NavItem>
          </Tooltip>
          <Collapse in={submenuOpen && !collapsed} timeout={300} unmountOnExit>
            <List component="div" disablePadding sx={{ position: 'relative' }}>
              {/* connecting rail */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 30,
                  top: 6,
                  bottom: 6,
                  width: '2px',
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 2,
                }}
              />
              {item.subItems.map((subItem, index) => (
                <NavItem
                  key={subItem.text}
                  component={Link}
                  to={subItem.path}
                  selected={isActive(subItem.path)}
                  sx={{
                    pl: 4,
                    py: 0.75,
                    minHeight: 40,
                    animation: `${fadeSlideIn} 0.3s ease both`,
                    animationDelay: `${index * 0.04}s`,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: 2,
                      justifyContent: 'center',
                      '& svg': { fontSize: '1.15rem' },
                    }}
                  >
                    {subItem.icon}
                  </ListItemIcon>
                  <ListItemText primary={subItem.text} />
                </NavItem>
              ))}
            </List>
          </Collapse>
        </Box>
      );
    });
  };

  const drawer = (
    <>
      <DrawerHeader sx={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
          <ModernAvatar
            sx={{
              bgcolor: 'rgba(255,255,255,0.14)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.28)',
              border: '2px solid rgba(255,255,255,0.28)',
              color: '#fff',
              backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 100%)',
            }}
          >
            <Box sx={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Inventory2 sx={{ fontSize: 20, opacity: 0.95 }} />
              <AutoAwesome
                sx={{
                  fontSize: 11,
                  position: 'absolute',
                  top: -3,
                  right: -4,
                  color: '#FFD54F',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
                }}
              />
            </Box>
          </ModernAvatar>
          {!collapsed && (
            <Box sx={{ animation: `${fadeSlideIn} 0.4s ease` }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.2px' }}>
                Star Inventory
              </Typography>
              <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.55)' }}>
                by Star Software
              </Typography>
            </Box>
          )}
        </Box>
        {!collapsed && (
          <IconButton onClick={toggleCollapse} sx={{ color: 'rgba(255,255,255,0.85)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.12)' } }}>
            <ChevronLeft />
          </IconButton>
        )}
      </DrawerHeader>

      <Box sx={{ overflowX: 'hidden', overflowY: 'auto', py: 1.5, flex: 1,
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 3 },
        '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
      }}>
        {/* Only show Reconciler section if role is Reconciler */}
        {role === 'Reconciler' && (
          <Box key="Reconciler">
            {!collapsed && <CategoryLabel>Reconciler</CategoryLabel>}
            <List disablePadding>
              {renderMenuItems(menuItems.Reconciler)}
            </List>
            <CategoryDivider />
          </Box>
        )}
        {/* Always show Common section */}
        <Box key="Common">
          {!collapsed && <CategoryLabel>Common</CategoryLabel>}
          <List disablePadding>
            {renderMenuItems(menuItems.Common)}
          </List>
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
            <Chip
              icon={<Security sx={{ fontSize: 18 }} />}
              label={role || 'Reconciler'}
              variant="outlined"
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                borderColor: theme => alpha(theme.palette.primary.main, 0.4),
                color: 'primary.main',
                backgroundColor: theme => alpha(theme.palette.primary.main, 0.08),
              }}
            />
            <Chip
              label="SANDBOX"
              size="small"
              sx={(theme) => ({
                borderRadius: 1.5,
                fontWeight: 700,
                fontSize: '0.7rem',
                backgroundColor: alpha(theme.palette.warning.main, 0.15),
                color: theme.palette.warning.dark,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              })}
            />
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
                {userRoles.length > 1 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ px: 2, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <SwapHoriz sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0.4 }}>
                        SWITCH ROLE
                      </Typography>
                    </Box>
                    {userRoles.map((roleOption) => (
                      <MenuItem
                        key={roleOption}
                        onClick={() => handleRoleSwitch(roleOption)}
                        selected={roleOption === role}
                        sx={{
                          justifyContent: 'space-between',
                          fontWeight: roleOption === role ? 600 : 400,
                          bgcolor: roleOption === role
                            ? (theme) => alpha(theme.palette.primary.main, 0.08)
                            : 'transparent',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {getRoleIcon(roleOption)}
                          <Typography variant="body2">{roleOption}</Typography>
                        </Box>
                        {roleOption === role && (
                          <Check fontSize="small" color="primary" />
                        )}
                      </MenuItem>
                    ))}
                  </>
                )}
                <Divider sx={{ my: 1 }} />
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
