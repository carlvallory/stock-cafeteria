import { useState } from 'react';
import { adjustStock } from '../services/stockService';
import { validateStock } from '../utils/validators';
import './AdjustModal.css';

export default function AdjustModal({ product, onClose, onUpdate }) {
    const [newStock, setNewStock] = useState(product?.currentStock || 0);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!product) return null;

    const difference = newStock - product.currentStock;

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        const validation = validateStock(newStock);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        setIsSubmitting(true);
        try {
            await adjustStock(product.id, validation.value, notes);
            onUpdate?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Ajustar Stock</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Cerrar">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Producto:</label>
                            <div className="product-info">{product.name}</div>
                        </div>

                        <div className="form-group">
                            <label>Stock actual:</label>
                            <div className="current-stock">{product.currentStock}</div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="newStock">Nuevo stock:</label>
                            <input
                                id="newStock"
                                type="number"
                                value={newStock}
                                onChange={(e) => setNewStock(Number(e.target.value))}
                                min="0"
                                max="9999"
                                required
                                autoFocus
                            />
                        </div>

                        {difference !== 0 && (
                            <div className={`difference ${difference > 0 ? 'positive' : 'negative'}`}>
                                Diferencia: {difference > 0 ? '+' : ''}{difference} unidades
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="notes">Notas (opcional):</label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ej: Reposición de almacén"
                                rows="3"
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="button-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
