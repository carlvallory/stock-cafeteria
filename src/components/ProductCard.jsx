import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    IconButton,
    Button,
    Box,
    Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import TuneIcon from '@mui/icons-material/Tune';
import { incrementStock, decrementStock } from '../services/stockService';
import { getStockLevel } from '../services/alertService';

export default function ProductCard({ product, onUpdate }) {
    const [stockLevel, setStockLevel] = useState('good');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        loadStockLevel();
    }, [product.id]);

    async function loadStockLevel() {
        const level = await getStockLevel(product.id);
        setStockLevel(level);
    }

    async function handleIncrement() {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            await incrementStock(product.id);
            await loadStockLevel();
            onUpdate?.();
        } catch (error) {
            console.error('Error incrementing stock:', error);
            alert('Error al incrementar stock');
        } finally {
            setIsUpdating(false);
        }
    }

    async function handleDecrement() {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            await decrementStock(product.id);
            await loadStockLevel();
            onUpdate?.();
        } catch (error) {
            console.error('Error decrementing stock:', error);
            alert('Error al decrementar stock');
        } finally {
            setIsUpdating(false);
        }
    }

    function getStockColor() {
        switch (stockLevel) {
            case 'low':
                return 'error';
            case 'medium':
                return 'warning';
            case 'good':
                return 'success';
            default:
                return 'default';
        }
    }

    return (
        <Card
            sx={{
                mb: 2,
                transition: 'all 0.2s',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                },
            }}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="h3" fontWeight={600}>
                        {product.name}
                    </Typography>
                    <Chip
                        label={stockLevel === 'low' ? 'Bajo' : stockLevel === 'medium' ? 'Medio' : 'OK'}
                        color={getStockColor()}
                        size="small"
                    />
                </Box>

                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={2}
                    mb={2}
                >
                    <IconButton
                        color="warning"
                        onClick={handleDecrement}
                        disabled={isUpdating || product.currentStock === 0}
                        aria-label="Decrementar stock"
                        sx={{
                            bgcolor: 'warning.main',
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'warning.dark',
                            },
                            '&:disabled': {
                                bgcolor: 'action.disabledBackground',
                            },
                        }}
                    >
                        <RemoveIcon />
                    </IconButton>

                    <Box textAlign="center" flex={1}>
                        <Typography variant="h4" component="div" fontWeight={700}>
                            {product.currentStock}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {product.unit}
                        </Typography>
                    </Box>

                    <IconButton
                        color="success"
                        onClick={handleIncrement}
                        disabled={isUpdating}
                        aria-label="Incrementar stock"
                        sx={{
                            bgcolor: 'success.main',
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'success.dark',
                            },
                        }}
                    >
                        <AddIcon />
                    </IconButton>
                </Box>

                <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<TuneIcon />}
                    onClick={() => onUpdate?.(product)}
                    disabled={isUpdating}
                >
                    Ajustar
                </Button>
            </CardContent>
        </Card>
    );
}
