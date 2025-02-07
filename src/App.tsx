import { createTheme } from "@mui/material";
import { ThemeProvider } from "@emotion/react";
import Navigations from "./components/Navigations";
import { Typography } from "@mui/material";

const theme = createTheme({
  palette: {
    primary: {
      main: "#0C2C48",
    },
    secondary: {
      main: "#fff",
    },
    text: {
      primary: "rgba(60, 72, 88, 1)",
      secondary: "rgba(132, 146, 166, 1)",
      disabled: "rgba(60, 72, 88, 0.38)",
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Navigations>
        <Typography sx={{ marginBottom: 2 }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Rhoncus
          dolor purus non enim praesent elementum facilisis leo vel. Risus at
          ultrices mi tempus imperdiet. Semper risus in hendrerit gravida rutrum
          quisque non tellus. Convallis convallis tellus id interdum velit
          laoreet id donec ultrices. Odio morbi quis commodo odio aenean sed
          adipiscing. Amet nisl suscipit adipiscing bibendum est ultricies
          integer quis. Cursus euismod quis viverra nibh cras. Metus vulputate
          eu scelerisque felis imperdiet proin fermentum leo. Mauris commodo
          quis imperdiet massa tincidunt. Cras tincidunt lobortis feugiat
          vivamus at augue. At augue eget arcu dictum varius duis at consectetur
          lorem. Velit sed ullamcorper morbi tincidunt. Lorem donec massa sapien
          faucibus et molestie ac.
        </Typography>
      </Navigations>
    </ThemeProvider>
  );
}

export default App;
