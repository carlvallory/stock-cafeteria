import { useState, useEffect, useCallback } from 'react';
import { getActiveProducts, createProduct, updateProduct, archiveProduct } from '../services/stockService';
import { validateProductName, validateProductUnit } from '../utils/validators';
import { useStore } from '../store/useStore';
import './ConfigPage.css';

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
        <div className="config-page">
            <div className="config-header">
                <button className="back-button" onClick={onBack}>
                    ← Volver
                </button>
                <h1>Configuración de Productos</h1>
            </div>

            {error && (
                <div className="error-message">{error}</div>
            )}

            <div className="products-section">
                <div className="section-header">
                    <h2>Productos Activos</h2>
                    <button
                        className="add-button"
                        onClick={() => {
                            setShowAddForm(true);
                            setEditingId(null);
                            setFormData({ name: '', unit: '' });
                            setError('');
                        }}
                    >
                        + Agregar Producto
                    </button>
                </div>

                {showAddForm && (
                    <div className="product-form">
                        <h3>Nuevo Producto</h3>
                        <div className="form-group">
                            <label>Nombre del Producto</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Café embotellado"
                                maxLength={50}
                            />
                        </div>
                        <div className="form-group">
                            <label>Unidad de Medida</label>
                            <input
                                type="text"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                placeholder="Ej: unidad, litro, kg"
                                maxLength={20}
                            />
                        </div>
                        <div className="form-actions">
                            <button className="btn-save" onClick={handleAdd}>
                                Guardar
                            </button>
                            <button className="btn-cancel" onClick={() => {
                                setShowAddForm(false);
                                setFormData({ name: '', unit: '' });
                                setError('');
                            }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                <div className="products-list">
                    {products.map(product => (
                        <div key={product.id} className="product-item">
                            {editingId === product.id ? (
                                <div className="product-form">
                                    <div className="form-group">
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            maxLength={50}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Unidad</label>
                                        <input
                                            type="text"
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            maxLength={20}
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button className="btn-save" onClick={() => handleUpdate(product.id)}>
                                            Guardar
                                        </button>
                                        <button className="btn-cancel" onClick={cancelEdit}>
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="product-info">
                                        <h3>{product.name}</h3>
                                        <p className="product-unit">{product.unit}</p>
                                        <p className="product-stock">Stock actual: {product.currentStock}</p>
                                    </div>
                                    <div className="product-actions">
                                        <button
                                            className="btn-edit"
                                            onClick={() => startEdit(product)}
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDelete(product.id)}
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {products.length === 0 && (
                    <div className="empty-state">
                        <p>No hay productos configurados.</p>
                        <p>Agrega tu primer producto usando el botón de arriba.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
