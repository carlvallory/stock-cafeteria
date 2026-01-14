import { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    List,
    ListItem,
    ListItemText,
    Divider,
    CircularProgress,
} from '@mui/material';
import CoffeeIcon from '@mui/icons-material/LocalCafe';
import HistoryIcon from '@mui/icons-material/History';
import LockIcon from '@mui/icons-material/Lock';
import { useStore } from '../store/useStore';
import { openCafeteria, applyYesterdayStock, getLastClosedWorkday } from '../services/workdayService';
import { formatDisplayDate, formatDisplayTime } from '../utils/dateHelpers';
import { getActiveProducts } from '../services/stockService';

export default function OpeningPage({ onOpen }) {
    const [isOpening, setIsOpening] = useState(false);
    const [responsiblePerson, setResponsiblePerson] = useState('');
    const [lastWorkday, setLastWorkday] = useState(null);
    const [loadingLocal, setLoadingLocal] = useState(true);

    const {
        products,
        loadProducts,
        remoteLock
    } = useStore();

    // Cargar datos iniciales
    useEffect(() => {
        async function init() {
            setLoadingLocal(true);
            try {
                // 1. Sincronizar estado (si hay internet)
                if (navigator.onLine) {
                    const { syncService } = await import('../services/syncService');
                    await syncService.pullActiveWorkday();
                }

                // 2. Cargar último cierre para botón de historial
                const lastWd = await getLastClosedWorkday();
                setLastWorkday(lastWd);

                // 3. Recuperar nombre
                const lastPerson = localStorage.getItem('lastResponsiblePerson');
                if (lastPerson) setResponsiblePerson(lastPerson);

                // 4. Cargar productos si faltan
                if (!products || products.length === 0) {
                    await loadProducts();
                }
            } catch (e) {
                console.error("Error init OpeningPage:", e);
            } finally {
                setLoadingLocal(false);
            }
        }
        init();
    }, []);

    // Combinar loading
    const loading = loadingLocal;

    // Determinar si debemos bloquear la UI
    const isLocked = remoteLock?.isLocked;
    const lockedBy = remoteLock?.responsible || 'Otro usuario';

    async function handleOpenWithCurrentStock() {
        if (!responsiblePerson.trim()) {
            alert('Por favor ingresa el nombre de la persona responsable');
            return;
        }

        setIsOpening(true);
        try {
            await openCafeteria(responsiblePerson.trim());
            localStorage.setItem('lastResponsiblePerson', responsiblePerson.trim());
            const { useStore } = await import('../store/useStore');
            await useStore.getState().refreshAll();
            onOpen?.();
        } catch (error) {
            console.error('Error opening cafeteria:', error);
            alert('Error al abrir cafetería: ' + error.message);
        } finally {
            setIsOpening(false);
        }
    }

    async function handleUseYesterdayStock() {
        if (!responsiblePerson.trim()) {
            alert('Por favor ingresa el nombre de la persona responsable');
            return;
        }

        setIsOpening(true);
        try {
            await applyYesterdayStock(responsiblePerson.trim());
            localStorage.setItem('lastResponsiblePerson', responsiblePerson.trim());
            const { useStore } = await import('../store/useStore');
            await useStore.getState().refreshAll();
            onOpen?.();
        } catch (error) {
            console.error('Error using yesterday stock:', error);
            alert('Error al usar stock del día anterior: ' + error.message);
        } finally {
            setIsOpening(false);
        }
    }

    if (loading) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                    Cargando productos...
                </Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 2, sm: 2 }, width: '100%' }}>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: { xs: 2, sm: 4 }, width: '100%' }}>
                <Box textAlign="center" mb={3}>
                    <CoffeeIcon sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
                        Abrir Cafetería
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        La cafetería está cerrada
                    </Typography>
                </Box>

                {isLocked && (
                    <Box mb={3} sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, border: '1px solid #ffcdd2' }}>
                        <Typography variant="subtitle1" color="error" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                            <LockIcon /> CAJA BLOQUEADA
                        </Typography>
                        <Typography variant="body2" color="error.dark">
                            {lockedBy} tiene una sesión activa. Espera a que cierre para abrir.
                        </Typography>
                    </Box>
                )}

                <Box mb={3}>
                    <TextField
                        fullWidth
                        label="Persona responsable"
                        placeholder="Ingresa tu nombre"
                        value={responsiblePerson}
                        onChange={(e) => setResponsiblePerson(e.target.value)}
                        disabled={isOpening || isLocked}
                        autoFocus
                        required
                    />
                </Box>

                <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                        Stock actual:
                    </Typography>
                    {products.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                            No hay productos configurados
                        </Typography>
                    ) : (
                        <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                            <List dense>
                                {products.map((product, index) => (
                                    <div key={product.id}>
                                        <ListItem>
                                            <ListItemText
                                                primary={product.name}
                                                secondary={`${product.currentStock} ${product.unit}`}
                                            />
                                        </ListItem>
                                        {index < products.length - 1 && <Divider />}
                                    </div>
                                ))}
                            </List>
                        </Paper>
                    )}
                </Box>

                <Box display="flex" flexDirection="column" gap={2}>
                    <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        onClick={handleOpenWithCurrentStock}
                        disabled={isOpening || isLocked}
                        startIcon={isLocked ? <LockIcon /> : <CoffeeIcon />}
                        color={isLocked ? "inherit" : "primary"}
                    >
                        {isOpening ? 'Sincronizando...' : isLocked ? `Bloqueado por ${lockedBy}` : 'Sincronizar y Abrir'}
                    </Button>

                    {lastWorkday && lastWorkday.closingStock && (
                        <Button
                            variant="outlined"
                            size="large"
                            fullWidth
                            onClick={handleUseYesterdayStock}
                            disabled={isOpening || isLocked}
                            startIcon={isLocked ? <LockIcon /> : <HistoryIcon />}
                        >
                            <Box>
                                <div>Usar Último Stock Guardado</div>
                                <Typography variant="caption" display="block">
                                    Cierre: {formatDisplayDate(lastWorkday.date)} -{' '}
                                    {formatDisplayTime(new Date(lastWorkday.closedAt).toTimeString().split(' ')[0])}
                                </Typography>
                            </Box>
                        </Button>
                    )}
                </Box>
            </Paper>
        </Container>
    );
}
