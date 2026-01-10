import { useState, useEffect } from 'react';
import { incrementStock, decrementStock } from '../services/stockService';
import { getStockLevel } from '../services/alertService';
import './ProductCard.css';

export default function ProductCard({ product, onUpdate }) {
    const [stockLevel, setStockLevel] = useState('good');
    const [isUpdating, setIsUpdating] = useState(false);

    // Cargar nivel de stock al montar
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

    function getStockIndicator() {
        switch (stockLevel) {
            case 'low':
                return '🔴';
            case 'medium':
                return '🟡';
            case 'good':
                return '🟢';
            default:
                return '⚪';
        }
    }

    return (
        <div className="product-card">
            <div className="product-header">
                <h3 className="product-name">{product.name}</h3>
                <span className="stock-indicator">{getStockIndicator()}</span>
            </div>

            <div className="stock-controls">
                <button
                    className="stock-button decrement"
                    onClick={handleDecrement}
                    disabled={isUpdating || product.currentStock === 0}
                    aria-label="Decrementar stock"
                >
                    -1
                </button>

                <div className="stock-display">
                    <span className="stock-value">{product.currentStock}</span>
                    <span className="stock-unit">{product.unit}</span>
                </div>

                <button
                    className="stock-button increment"
                    onClick={handleIncrement}
                    disabled={isUpdating}
                    aria-label="Incrementar stock"
                >
                    +1
                </button>
            </div>

            <button
                className="adjust-button"
                onClick={() => onUpdate?.(product)}
                disabled={isUpdating}
            >
                Ajustar
            </button>
        </div>
    );
}
