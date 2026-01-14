import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Alert,
    useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { adjustStock, updateProduct } from '../services/stockService';
import { validateStock } from '../utils/validators';

export default function AdjustModal({ product, onClose, onUpdate }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [newStock, setNewStock] = useState(product?.currentStock || 0);
    const [productName, setProductName] = useState(product?.name || '');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!product) return null;

    const difference = newStock - product.currentStock;

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!productName || productName.trim().length < 3) {
            setError('El nombre debe tener al menos 3 caracteres');
            return;
        }

        const validation = validateStock(newStock);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        setIsSubmitting(true);
        try {
            if (productName.trim() !== product.name) {
                await updateProduct(product.id, {
                    name: productName.trim()
                });
            }

            await adjustStock(product.id, validation.value, notes);
            if (onUpdate) onUpdate();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={fullScreen}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle>Ajustar Producto</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {error && <Alert severity="error">{error}</Alert>}

                        <TextField
                            label="Nombre del Producto"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            fullWidth
                            required
                            inputProps={{ minLength: 3, maxLength: 100 }}
                        />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body1">
                                Stock actual: <strong>{product.currentStock}</strong>
                            </Typography>
                        </Box>

                        <TextField
                            label="Nuevo Stock"
                            type="number"
                            value={String(newStock)}
                            onChange={(e) => setNewStock(Number(e.target.value))}
                            fullWidth
                            required
                            autoFocus
                            inputProps={{ min: 0, max: 9999 }}
                        />

                        {difference !== 0 && (
                            <Typography
                                variant="body2"
                                color={difference > 0 ? 'success.main' : 'error.main'}
                                sx={{ fontWeight: 'bold' }}
                            >
                                Diferencia: {difference > 0 ? '+' : ''}{difference} unidades
                            </Typography>
                        )}

                        <TextField
                            label="Notas (opcional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            multiline
                            rows={3}
                            fullWidth
                            placeholder="Ej: Reposición de almacén"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
