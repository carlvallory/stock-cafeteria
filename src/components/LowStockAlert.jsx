import './LowStockAlert.css';

export default function LowStockAlert({ products }) {
    if (!products || products.length === 0) return null;

    return (
        <div className="low-stock-alert">
            <div className="alert-header">
                <span className="alert-icon">⚠️</span>
                <span className="alert-title">
                    {products.length} producto{products.length > 1 ? 's' : ''} con stock bajo
                </span>
            </div>
            <div className="alert-products">
                {products.map(product => (
                    <div key={product.id} className="alert-product-item">
                        <span className="alert-product-name">{product.name}</span>
                        <span className="alert-product-stock">
                            Stock: {product.currentStock} / Mínimo: {product.minimumStock}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
