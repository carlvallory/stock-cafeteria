import { useState, useEffect } from 'react';
import { openCafeteria, useYesterdayStock, getLastClosedWorkday } from '../services/workdayService';
import { formatDisplayDate, formatDisplayTime } from '../utils/dateHelpers';
import { getActiveProducts } from '../services/stockService';
import './OpeningPage.css';

export default function OpeningPage({ onOpen }) {
    const [products, setProducts] = useState([]);
    const [lastWorkday, setLastWorkday] = useState(null);
    const [isOpening, setIsOpening] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [prods, lastWd] = await Promise.all([
                getActiveProducts(),
                getLastClosedWorkday()
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
        setIsOpening(true);
        try {
            await openCafeteria();
            onOpen?.();
        } catch (error) {
            alert('Error al abrir cafetería: ' + error.message);
        } finally {
            setIsOpening(false);
        }
    }

    async function handleUseYesterdayStock() {
        setIsOpening(true);
        try {
            await useYesterdayStock();
            onOpen?.();
        } catch (error) {
            alert('Error al usar stock del día anterior: ' + error.message);
        } finally {
            setIsOpening(false);
        }
    }

    return (
        <div className="opening-page">
            <div className="opening-container">
                <h1>Abrir Cafetería</h1>
                <p className="subtitle">La cafetería está cerrada</p>

                <div className="current-stock-section">
                    <h2>Stock actual:</h2>
                    {loading ? (
                        <div className="stock-list">
                            <p style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                                Cargando productos...
                            </p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="stock-list">
                            <p style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                                No hay productos configurados
                            </p>
                        </div>
                    ) : (
                        <div className="stock-list">
                            {products.map(product => (
                                <div key={product.id} className="stock-item">
                                    <span className="stock-item-name">{product.name}</span>
                                    <span className="stock-item-value">{product.currentStock} {product.unit}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="actions-section">
                    <button
                        className="action-button primary"
                        onClick={handleOpenWithCurrentStock}
                        disabled={isOpening}
                    >
                        Abrir con Stock Actual
                    </button>

                    {lastWorkday && lastWorkday.closingStock && (
                        <button
                            className="action-button secondary"
                            onClick={handleUseYesterdayStock}
                            disabled={isOpening}
                        >
                            <div>Usar Stock del Día Anterior</div>
                            <div className="button-subtitle">
                                Cierre: {formatDisplayDate(lastWorkday.date)} - {formatDisplayTime(new Date(lastWorkday.closedAt).toTimeString().split(' ')[0])}
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
