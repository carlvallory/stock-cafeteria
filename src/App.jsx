import { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import { initializeDefaultData } from './services/db';
import { useStore } from './store/useStore';
import StockPage from './pages/StockPage';
import OpeningPage from './pages/OpeningPage';
import theme from './theme';
import './App.css';

function App() {
  const { workdayOpen, checkWorkdayStatus } = useStore();
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    async function init() {
      // Evitar doble inicialización
      if (initialized.current) return;
      initialized.current = true;

      try {
        await initializeDefaultData();
        await checkWorkdayStatus();
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [checkWorkdayStatus]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" elevation={2}>
          <Toolbar>
            <LocalCafeIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="h1" fontWeight={600}>
              Control de Stock
            </Typography>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, bgcolor: 'background.default' }}>
          {workdayOpen ? (
            <StockPage />
          ) : (
            <OpeningPage onOpen={checkWorkdayStatus} />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
