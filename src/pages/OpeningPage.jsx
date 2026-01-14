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
import { openCafeteria, applyYesterdayStock, getLastClosedWorkday } from '../services/workdayService';
import { formatDisplayDate, formatDisplayTime } from '../utils/dateHelpers';
import { getActiveProducts } from '../services/stockService';

export default function OpeningPage({ onOpen }) {
    const [products, setProducts] = useState([]);
    const [lastWorkday, setLastWorkday] = useState(null);
    const [isOpening, setIsOpening] = useState(false);
    const [loading, setLoading] = useState(true);
    const [responsiblePerson, setResponsiblePerson] = useState('');

    useEffect(() => {
        loadData();
        const lastPerson = localStorage.getItem('lastResponsiblePerson');
        if (lastPerson) {
            setResponsiblePerson(lastPerson);
        }
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [prods, lastWd] = await Promise.all([
                getActiveProducts(),
                getLastClosedWorkday(),
            ]);
            setProducts(prods || []);
            setLastWorkday(lastWd);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error al cargar datos: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

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
        <Container maxWidth="sm" sx={{ mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 1, sm: 2 } }}>
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

                <Box mb={3}>
                    <TextField
                        fullWidth
                        label="Persona responsable"
                        placeholder="Ingresa tu nombre"
                        value={responsiblePerson}
                        onChange={(e) => setResponsiblePerson(e.target.value)}
                        disabled={isOpening}
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
                        disabled={isOpening}
                        startIcon={<CoffeeIcon />}
                    >
                        {isOpening ? 'Abriendo...' : 'Abrir con Stock Actual'}
                    </Button>

                    {lastWorkday && lastWorkday.closingStock && (
                        <Button
                            variant="outlined"
                            size="large"
                            fullWidth
                            onClick={handleUseYesterdayStock}
                            disabled={isOpening}
                            startIcon={<HistoryIcon />}
                        >
                            <Box>
                                <div>Usar Stock del Día Anterior</div>
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
