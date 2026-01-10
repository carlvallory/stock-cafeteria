import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import LowStockAlert from '../components/LowStockAlert';
import AdjustModal from '../components/AdjustModal';
import { closeCafeteria } from '../services/workdayService';
import { formatDisplayDate } from '../utils/dateHelpers';
import './StockPage.css';

export default function StockPage() {
    const { products, workdayOpen, lowStockAlerts, refreshAll } = useStore();
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
        if (!confirm('¿Cerrar la cafetería con el stock actual?')) return;

        setIsClosing(true);
        try {
            await closeCafeteria();
            await refreshAll();
        } catch (error) {
            alert('Error al cerrar cafetería: ' + error.message);
        } finally {
            setIsClosing(false);
        }
    }

    if (!workdayOpen) {
        return (
            <div className="stock-page">
                <div className="closed-message">
                    <h2>Cafetería Cerrada</h2>
                    <p>Por favor, abre la cafetería para comenzar a gestionar el stock.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="stock-page">
                <div className="closed-message">
                    <h2>Cargando...</h2>
                    <p>Cargando información de stock...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="stock-page">
            <div className="page-header">
                <div className="status-indicator open">
                    <span className="status-dot"></span>
                    <span className="status-text">Cafetería Abierta</span>
                </div>
                <div className="date-display">{formatDisplayDate(new Date().toISOString().split('T')[0])}</div>
            </div>

            {lowStockAlerts && lowStockAlerts.length > 0 && (
                <LowStockAlert products={lowStockAlerts} />
            )}

            <div className="products-list">
                {products && products.length > 0 ? (
                    products.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onUpdate={(prod) => {
                                if (prod) {
                                    setSelectedProduct(prod);
                                } else {
                                    refreshAll();
                                }
                            }}
                        />
                    ))
                ) : (
                    <div className="empty-state">
                        <p>No hay productos configurados.</p>
                        <p>Ve a Configuración para agregar productos.</p>
                    </div>
                )}
            </div>


            <div className="page-footer">
                <button
                    className="close-workday-button"
                    onClick={handleCloseWorkday}
                    disabled={isClosing}
                >
                    {isClosing ? 'Cerrando...' : 'Cerrar Cafetería'}
                </button>
            </div>

            {selectedProduct && (
                <AdjustModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onUpdate={() => {
                        setSelectedProduct(null);
                        refreshAll();
                    }}
                />
            )}
        </div>
    );
}
