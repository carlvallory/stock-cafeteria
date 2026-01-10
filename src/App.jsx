import { useState, useEffect, useRef } from 'react';
import { initializeDefaultData } from './services/db';
import { useStore } from './store/useStore';
import StockPage from './pages/StockPage';
import OpeningPage from './pages/OpeningPage';
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
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="app-icon">☕</span>
          Control de Stock
        </h1>
      </header>

      <main className="app-main">
        {workdayOpen ? (
          <StockPage />
        ) : (
          <OpeningPage onOpen={checkWorkdayStatus} />
        )}
      </main>
    </div>
  );
}

export default App;
