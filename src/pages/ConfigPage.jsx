import { useState, useEffect, useCallback } from 'react';
import { getActiveProducts, createProduct, updateProduct, archiveProduct } from '../services/stockService';
import { validateProductName, validateProductUnit } from '../utils/validators';
import { useStore } from '../store/useStore';
import {
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    TextField,
    Typography,
    Box,
    IconButton,
    Container,
    Paper
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
// import './ConfigPage.css'; // Removing custom CSS in favor of MUI

export default function ConfigPage({ onBack }) {
    console.log('🔧 ConfigPage loaded - version 2.0');
    const { products, loadProducts } = useStore();
    const [editingId, setEditingId] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', unit: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    async function handleAdd() {
        setError('');

        if (!validateProductName(formData.name)) {
            setError('El nombre debe tener entre 3 y 50 caracteres');
            return;
        }

        if (!validateProductUnit(formData.unit)) {
            setError('La unidad debe tener entre 2 y 20 caracteres');
            return;
        }

        try {
            await createProduct(formData.name, formData.unit);
            setFormData({ name: '', unit: '' });
            setShowAddForm(false);
            await loadProducts();
        } catch (err) {
            console.error('Error creating product:', err);
            setError('Error al crear producto: ' + err.message);
        }
    }

    async function handleUpdate(productId) {
        setError('');

        if (!validateProductName(formData.name)) {
            setError('El nombre debe tener entre 3 y 50 caracteres');
            return;
        }

        if (!validateProductUnit(formData.unit)) {
            setError('La unidad debe tener entre 2 y 20 caracteres');
            return;
        }

        try {
            await updateProduct(productId, {
                name: formData.name,
                unit: formData.unit
            });

            setEditingId(null);
            setFormData({ name: '', unit: '' });

            // Reload from store to sync globally
            await loadProducts();
        } catch (err) {
            console.error('Error updating product:', err);
            setError('Error al actualizar producto: ' + err.message);
        }
    }

    async function handleDelete(productId) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            await archiveProduct(productId);
            await loadProducts();
        } catch (err) {
            console.error('Error deleting product:', err);
            setError('Error al eliminar producto: ' + err.message);
        }
    }

    function startEdit(product) {
        setEditingId(product.id);
        setFormData({ name: product.name, unit: product.unit });
        setShowAddForm(false);
        setError('');
    }

    function cancelEdit() {
        setEditingId(null);
        setFormData({ name: '', unit: '' });
        setError('');
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
            {/* Header */}
            <Box sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Container maxWidth="md">
                    <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={onBack} edge="start" color="primary">
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h6" component="h1" fontWeight="bold">
                                Configuración de Productos
                            </Typography>
                        </Box>

                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setShowAddForm(true);
                                setEditingId(null);
                                setFormData({ name: '', unit: '' });
                                setError('');
                            }}
                            disabled={showAddForm}
                        >
                            Nuevo Producto
                        </Button>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="md">
                {error && (
                    <Paper
                        sx={{
                            p: 2,
                            mb: 3,
                            bgcolor: 'error.light',
                            color: 'error.contrastText'
                        }}
                    >
                        {error}
                    </Paper>
                )}

                {/* Add Form */}
                {showAddForm && (
                    <Card sx={{ mb: 4, overflow: 'visible' }} elevation={3}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Nuevo Producto</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={8}>
                                    <TextField
                                        label="Nombre del Producto"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Café embotellado"
                                        fullWidth
                                        variant="outlined"
                                        inputProps={{ maxLength: 50 }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Unidad"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="Ej: unidad"
                                        fullWidth
                                        variant="outlined"
                                        inputProps={{ maxLength: 20 }}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                            <Button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setFormData({ name: '', unit: '' });
                                    setError('');
                                }}
                                color="inherit"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleAdd}
                                variant="contained"
                            >
                                Guardar
                            </Button>
                        </CardActions>
                    </Card>
                )}

                {/* Products List */}
                <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
                    Productos Activos ({products.length})
                </Typography>

                {products.length === 0 && !showAddForm ? (
                    <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'background.paper', borderRadius: 2 }}>
                        <Typography variant="body1" color="text.secondary">
                            No hay productos configurados.
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Agrega tu primer producto usando el botón superior.
                        </Typography>
                    </Box>
                ) : (
                    <Grid container spacing={2}>
                        {products.map(product => (
                            <Grid item xs={12} sm={6} key={product.id}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        {editingId === product.id ? (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <TextField
                                                    label="Nombre"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    fullWidth
                                                    size="small"
                                                />
                                                <TextField
                                                    label="Unidad"
                                                    value={formData.unit}
                                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                    fullWidth
                                                    size="small"
                                                />
                                            </Box>
                                        ) : (
                                            <>
                                                <Typography variant="h6" component="div">
                                                    {product.name}
                                                </Typography>
                                                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                                                    Unidad: {product.unit}
                                                </Typography>
                                                <Typography variant="body2">
                                                    Stock actual: <strong>{product.currentStock}</strong>
                                                </Typography>
                                            </>
                                        )}
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                                        {editingId === product.id ? (
                                            <>
                                                <Button size="small" onClick={cancelEdit} color="inherit">
                                                    Cancelar
                                                </Button>
                                                <Button size="small" onClick={() => handleUpdate(product.id)} variant="contained">
                                                    Guardar
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    size="small"
                                                    startIcon={<EditIcon />}
                                                    onClick={() => startEdit(product)}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    size="small"
                                                    startIcon={<DeleteIcon />}
                                                    onClick={() => handleDelete(product.id)}
                                                    color="error"
                                                >
                                                    Eliminar
                                                </Button>
                                            </>
                                        )}
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Container>
        </Box>
    );
}
