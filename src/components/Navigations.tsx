import { useState } from "react";
import { Link } from "react-router-dom";

import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  IconButton,
  Collapse,
  Button,
} from "@mui/material";

import {
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
  Camera,
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
  Inventory
} from "@mui/icons-material";

const drawerWidth = 270;

export default function Navigations({
  children,
}: {
  children: React.ReactElement;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        >
          <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Typography variant="h6" noWrap component="div">
                Physical Inventory Report
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<Camera />}
              >
                Open Scanner
              </Button>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flex: 1,
                justifyContent: "flex-end",
              }}
            >
              <Typography>mamoor</Typography>
              <IconButton
                onClick={() => window.close()}
                sx={(theme) => ({
                  color: theme.palette.common.white,
                  backgroundColor: theme.palette.error.main,
                  ":hover": {
                    backgroundColor: theme.palette.error.dark,
                  },
                })}
              >
                <LogoutIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: "auto" }}>
            <List>
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/">
                  <ListItemIcon>
                    <Dashboard />
                  </ListItemIcon>
                  <ListItemText primary="Dashboard" />
                </ListItemButton>
              </ListItem>
              {/* <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <MailIcon />
                  </ListItemIcon>
                  <ListItemText primary="Starred" />
                </ListItemButton>
              </ListItem> */}
              {/* <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <MailIcon />
                  </ListItemIcon>
                  <ListItemText primary="Send email" />
                </ListItemButton>
              </ListItem> */}
              <ListItem disablePadding>
                <ListItemButton onClick={() => setOpen((p) => !p)}>
                  <ListItemIcon>
                    <Build />
                  </ListItemIcon>
                  <ListItemText primary="Configurations" />
                  {open ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              <Collapse in={open}>
                <List>
                  <ListItemButton component={Link} to="/users" sx={{ pl: 4 }}>
                    <ListItemIcon>
                      <GroupAdd />
                    </ListItemIcon>
                    <ListItemText primary="Users" />
                  </ListItemButton>
                  <ListItemButton component={Link} to="/locations" sx={{ pl: 4 }}>
                    <ListItemIcon>
                      <AddLocationAlt />
                    </ListItemIcon>
                    <ListItemText primary="Location" />
                  </ListItemButton>
                  <ListItemButton component={Link} to="/items" sx={{ pl: 4 }}>
                    <ListItemIcon>
                      <Category />
                    </ListItemIcon>
                    <ListItemText primary="Items" />
                  </ListItemButton>
                </List>
              </Collapse>
              <ListItem disablePadding>
                <ListItemButton onClick={() => setOpen((p) => !p)}>
                  <ListItemIcon>
                    <Reviews />
                  </ListItemIcon>
                  <ListItemText primary="Review" />
                  {open ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              <Collapse in={open}>
                <List>
                  <ListItemButton component={Link} to="/users" sx={{ pl: 4 }}>
                    <ListItemIcon>
                      <Engineering />
                    </ListItemIcon>
                    <ListItemText primary="Conuter" />
                  </ListItemButton>
                  <ListItemButton component={Link} to="/locations" sx={{ pl: 4 }}>
                    <ListItemIcon>
                      <Inventory />
                    </ListItemIcon>
                    <ListItemText primary="Checker" />
                  </ListItemButton>
                </List>
              </Collapse>
            </List>
            <Divider />
            <List>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <Book />
                  </ListItemIcon>
                  <ListItemText primary="User Logs" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <History />
                  </ListItemIcon>
                  <ListItemText primary="History" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <Settings />
                  </ListItemIcon>
                  <ListItemText primary="Settings" />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          {children}
        </Box>
      </Box>
    </>
  );
}
