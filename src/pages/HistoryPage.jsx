import { useState, useEffect } from 'react';
import { getClosedWorkdaysInRange } from '../services/workdayService';
import { getMovementsByDate } from '../services/stockService';
import { formatDisplayDate, formatDisplayTime, getCurrentDate, getDateDaysAgo } from '../utils/dateHelpers';
import { db } from '../services/db';
import {
    Container,
    Box,
    Typography,
    Button,
    IconButton,
    Grid,
    Card,
    CardContent,
    CardActionArea,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
    Chip,
    CircularProgress,
    useMediaQuery,
    Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
// import './HistoryPage.css';

export default function HistoryPage({ onBack }) {
    const [workdays, setWorkdays] = useState([]);
    const [filteredWorkdays, setFilteredWorkdays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkday, setSelectedWorkday] = useState(null);
    const [movements, setMovements] = useState([]);

    // Filtros
    const [startDate, setStartDate] = useState(getDateDaysAgo(30));
    const [endDate, setEndDate] = useState(getCurrentDate());
    const [responsibleFilter, setResponsibleFilter] = useState('');

    useEffect(() => {
        loadWorkdays();
    }, [startDate, endDate]);

    useEffect(() => {
        applyFilters();
    }, [workdays, responsibleFilter]);

    async function loadWorkdays() {
        setLoading(true);
        try {
            const data = await getClosedWorkdaysInRange(startDate, endDate);
            // Ordenar por fecha descendente (más reciente primero)
            const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setWorkdays(sorted);
        } catch (error) {
            console.error('Error loading workdays:', error);
            alert('Error al cargar historial: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    function applyFilters() {
        let filtered = [...workdays];

        if (responsibleFilter.trim()) {
            filtered = filtered.filter(wd =>
                wd.responsiblePerson?.toLowerCase().includes(responsibleFilter.toLowerCase())
            );
        }

        setFilteredWorkdays(filtered);
    }

    async function handleViewDetails(workday) {
        setSelectedWorkday(workday);
        try {
            const movs = await getMovementsByDate(workday.date);
            setMovements(movs);
        } catch (error) {
            console.error('Error loading movements:', error);
        }
    }

    async function handleExportCSV() {
        try {
            // Obtener todos los productos para los encabezados
            const allProducts = await db.products.toArray();

            // Construir encabezados base
            const headers = [
                'Fecha',
                'Responsable',
                'Hora Apertura',
                'Hora Cierre'
            ];

            // Agregar columnas por cada producto (Inicio y Fin)
            allProducts.forEach(p => {
                headers.push(`${p.name} (Inicio)`);
                headers.push(`${p.name} (Fin)`);
                headers.push(`${p.name} (Venta)`); // Opcional: calcular diferencia
            });

            const csvRows = [headers.join(',')];

            // Datos
            for (const wd of filteredWorkdays) {
                const row = [
                    wd.date,
                    wd.responsiblePerson || 'Sin especificar',
                    new Date(wd.openedAt).toLocaleTimeString('es'),
                    new Date(wd.closedAt).toLocaleTimeString('es')
                ];

                // Rellenar datos de productos
                for (const p of allProducts) {
                    const start = wd.openingStock?.[p.id] ?? 0;
                    const end = wd.closingStock?.[p.id] ?? 0;
                    const sales = start - end; // Cálculo simple de consumo/venta

                    row.push(start);
                    row.push(end);
                    row.push(sales);
                }

                csvRows.push(row.join(','));
            }

            // Descargar
            const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel compatibility
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `historial_detallado_${getCurrentDate()}.csv`;
            link.click();
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Error al exportar: ' + error.message);
        }
    }

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
            {/* Header */}
            <Box sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Container maxWidth="md" sx={{ px: { xs: 1, sm: 2 } }}>
                    <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={onBack} edge="start" color="primary">
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h6" component="h1" fontWeight="bold">
                                Historial
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="md" sx={{ px: { xs: 1, sm: 2 } }}>
                {/* Filters */}
                <Card sx={{ mb: 3 }} elevation={2}>
                    <CardContent>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                            <TextField
                                label="Desde"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                            <TextField
                                label="Hasta"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                            <TextField
                                label="Responsable"
                                placeholder="Filtrar por nombre..."
                                value={responsibleFilter}
                                onChange={(e) => setResponsibleFilter(e.target.value)}
                                fullWidth
                            />
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleExportCSV}
                                fullWidth
                                sx={{ height: 56 }}
                            >
                                Exportar
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Summary */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Mostrando {filteredWorkdays.length} jornada(s)
                </Typography>

                {/* Grid */}
                {filteredWorkdays.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography color="text.secondary">
                            No hay jornadas en el rango seleccionado
                        </Typography>
                    </Box>
                ) : (
                    <Grid container spacing={2}>
                        {filteredWorkdays.map(workday => (
                            <Grid item xs={12} sm={6} key={workday.id}>
                                <Card>
                                    <CardActionArea onClick={() => handleViewDetails(workday)}>
                                        <CardContent>
                                            <Stack spacing={1}>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <EventIcon color="primary" fontSize="small" />
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {formatDisplayDate(workday.date)}
                                                    </Typography>
                                                </Stack>

                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <PersonIcon color="action" fontSize="small" />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {workday.responsiblePerson || 'Sin especificar'}
                                                    </Typography>
                                                </Stack>

                                                <Divider />

                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                                    <AccessTimeIcon fontSize="small" color="action" />
                                                    <Typography variant="body2">
                                                        {formatDisplayTime(new Date(workday.openedAt).toTimeString().split(' ')[0])}
                                                        {' → '}
                                                        {formatDisplayTime(new Date(workday.closedAt).toTimeString().split(' ')[0])}
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        </CardContent>
                                    </CardActionArea>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Container>

            {/* Detail Dialog */}
            {selectedWorkday && (
                <Dialog
                    open={Boolean(selectedWorkday)}
                    onClose={() => setSelectedWorkday(null)}
                    fullScreen={fullScreen}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Detalle de Jornada
                        <Button onClick={() => setSelectedWorkday(null)}>Cerrar</Button>
                    </DialogTitle>
                    <Divider />
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Fecha</Typography>
                                <Typography variant="body1">{formatDisplayDate(selectedWorkday.date)}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Responsable</Typography>
                                <Typography variant="body1">{selectedWorkday.responsiblePerson || '-'}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Apertura</Typography>
                                <Typography variant="body1">{new Date(selectedWorkday.openedAt).toLocaleTimeString()}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Cierre</Typography>
                                <Typography variant="body1">{new Date(selectedWorkday.closedAt).toLocaleTimeString()}</Typography>
                            </Grid>
                        </Grid>

                        <Typography variant="h6" gutterBottom>Movimientos ({movements.length})</Typography>
                        <Stack spacing={1}>
                            {movements.length === 0 ? (
                                <Typography color="text.secondary">No hay movimientos registrados</Typography>
                            ) : (
                                movements.map((mov, idx) => (
                                    <Card key={idx} variant="outlined">
                                        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                            <Grid container alignItems="center">
                                                <Grid item xs={3}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {mov.time}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={3}>
                                                    <Chip
                                                        label={mov.type}
                                                        size="small"
                                                        color={mov.type === 'RESTOCK' ? 'success' : 'default'}
                                                        variant="outlined"
                                                    />
                                                </Grid>
                                                <Grid item xs={2} sx={{ textAlign: 'right' }}>
                                                    <Typography fontWeight="bold">
                                                        {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={4} sx={{ pl: 2 }}>
                                                    {mov.notes && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                                                            {mov.notes}
                                                        </Typography>
                                                    )}
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </Stack>
                    </DialogContent>
                </Dialog>
            )}
        </Box>
    );
}
