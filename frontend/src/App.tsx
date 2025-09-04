import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material'
import './App.css'

function App() {
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            Personal Library
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome
        </Typography>
        <Typography color="text.secondary">
          Frontend scaffold is ready. We’ll add features in later phases.
        </Typography>
      </Container>
    </Box>
  )
}

export default App
