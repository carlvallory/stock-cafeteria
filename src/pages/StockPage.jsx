import { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Box,
    Typography,
    IconButton,
    Chip,
    Button,
    CircularProgress,
    Tooltip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Grid,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import LowStockAlert from '../components/LowStockAlert';
import AdjustModal from '../components/AdjustModal';
import ConfigPage from './ConfigPage';
import HistoryPage from './HistoryPage';
import { closeCafeteria } from '../services/workdayService';
import { formatDisplayDate } from '../utils/dateHelpers';

export default function StockPage() {
    const [showConfig, setShowConfig] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const { products, workdayOpen, currentWorkday, lowStockAlerts, refreshAll } = useStore();
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            await refreshAll();
            setLoading(false);
        }
        load();
    }, [refreshAll]);

    async function handleCloseWorkday() {
        setIsClosing(true);
        try {
            await closeCafeteria();
            setShowCloseDialog(false);
            await refreshAll();
        } catch (error) {
            console.error('Error closing cafeteria:', error);
            alert('Error al cerrar cafetería: ' + error.message);
            setShowCloseDialog(false);
        } finally {
            setIsClosing(false);
        }
    }

    const handleConfigBack = useCallback(() => {
        setShowConfig(false);
        refreshAll();
    }, [refreshAll]);

    const handleHistoryBack = useCallback(() => {
        setShowHistory(false);
        refreshAll();
    }, [refreshAll]);

    if (!workdayOpen) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>
                    Cafetería Cerrada
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Por favor, abre la cafetería para comenzar a gestionar el stock.
                </Typography>
            </Container>
        );
    }

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                    Cargando información de stock...
                </Typography>
            </Container>
        );
    }

    if (showConfig) {
        return <ConfigPage onBack={handleConfigBack} />;
    }

    if (showHistory) {
        return <HistoryPage onBack={handleHistoryBack} />;
    }

    return (
        <Container maxWidth="md" sx={{ py: 3 }}>
            {/* Header con estado y acciones */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                    pb: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        label="Cafetería Abierta"
                        color="success"
                        icon={<Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', ml: 1 }} />}
                    />
                    {currentWorkday && currentWorkday.responsiblePerson && (
                        <Chip
                            icon={<PersonIcon />}
                            label={currentWorkday.responsiblePerson}
                            variant="outlined"
                            color="primary"
                        />
                    )}
                </Stack>

                <Stack direction="row" spacing={1}>
                    <Tooltip title="Historial">
                        <IconButton onClick={() => setShowHistory(true)} color="primary">
                            <HistoryIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Configuración">
                        <IconButton onClick={() => setShowConfig(true)} color="primary">
                            <SettingsIcon />
                        </IconButton>
                    </Tooltip>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                        {formatDisplayDate(new Date().toISOString().split('T')[0])}
                    </Typography>
                </Stack>
            </Box>

            {/* Alertas de stock bajo */}
            {lowStockAlerts && lowStockAlerts.length > 0 && (
                <Box mb={3}>
                    <LowStockAlert alerts={lowStockAlerts} />
                </Box>
            )}

            {/* Lista de productos */}
            <Box mb={3}>
                {products.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <Typography variant="body1" color="text.secondary">
                            No hay productos activos
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => setShowConfig(true)}
                            sx={{ mt: 2 }}
                        >
                            Configurar Productos
                        </Button>
                    </Box>
                ) : (
                    <Grid container spacing={2}>
                        {products.map((product) => (
                            <Grid item xs={12} sm={6} md={4} key={product.id}>
                                <ProductCard
                                    product={product}
                                    onUpdate={(prod) => {
                                        if (prod) {
                                            setSelectedProduct(prod);
                                        } else {
                                            refreshAll();
                                        }
                                    }}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            {/* Botón de cerrar cafetería */}
            <Box
                sx={{
                    position: 'sticky',
                    bottom: 0,
                    bgcolor: 'background.default',
                    pt: 2,
                    pb: 2,
                }}
            >
                <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    size="large"
                    onClick={() => {
                        console.log('🔴 BUTTON CLICKED - setShowCloseDialog(true)');
                        setShowCloseDialog(true);
                    }}
                    disabled={isClosing}
                    startIcon={<CloseIcon />}
                >
                    {isClosing ? 'Cerrando...' : 'Cerrar Cafetería'}
                </Button>
            </Box>

            {/* Dialog de confirmación de cierre */}
            <Dialog
                open={showCloseDialog}
                onClose={() => {
                    console.log('🔴 Dialog onClose called');
                    setShowCloseDialog(false);
                }}
                aria-labelledby="close-dialog-title"
            >
                <DialogTitle id="close-dialog-title">
                    Cerrar Cafetería
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que deseas cerrar la cafetería con el stock actual?
                        Esta acción guardará el estado actual del stock.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        console.log('🔴 Cancelar button clicked');
                        setShowCloseDialog(false);
                    }} color="inherit">
                        Cancelar
                    </Button>
                    <Button onClick={() => {
                        console.log('🔴 Cerrar button clicked - calling handleCloseWorkday');
                        handleCloseWorkday();
                    }} variant="contained" color="error" autoFocus>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de ajuste */}
            {selectedProduct && (
                <AdjustModal
                    product={selectedProduct}
                    onClose={() => {
                        setSelectedProduct(null);
                        refreshAll();
                    }}
                />
            )}
        </Container>
    );
}
