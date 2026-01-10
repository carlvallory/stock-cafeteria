import { db, MovementTypes } from './db';
import { getCurrentDate, getCurrentTime } from '../utils/dateHelpers';

// Incrementar stock (+1)
export async function incrementStock(productId) {
    const product = await db.products.get(productId);
    if (!product) throw new Error('Producto no encontrado');

    await db.products.update(productId, {
        currentStock: product.currentStock + 1
    });

    await db.movements.add({
        productId,
        date: getCurrentDate(),
        time: getCurrentTime(),
        quantity: 1,
        type: MovementTypes.RESTOCK,
        createdAt: new Date()
    });

    return product.currentStock + 1;
}

// Decrementar stock (-1)
export async function decrementStock(productId) {
    const product = await db.products.get(productId);
    if (!product) throw new Error('Producto no encontrado');

    const newStock = Math.max(0, product.currentStock - 1);

    await db.products.update(productId, {
        currentStock: newStock
    });

    await db.movements.add({
        productId,
        date: getCurrentDate(),
        time: getCurrentTime(),
        quantity: -1,
        type: MovementTypes.SALE,
        createdAt: new Date()
    });

    return newStock;
}

// Ajuste manual de stock
export async function adjustStock(productId, newStock, notes = '') {
    const product = await db.products.get(productId);
    if (!product) throw new Error('Producto no encontrado');

    const difference = newStock - product.currentStock;

    await db.products.update(productId, {
        currentStock: newStock
    });

    await db.movements.add({
        productId,
        date: getCurrentDate(),
        time: getCurrentTime(),
        quantity: difference,
        type: MovementTypes.ADJUSTMENT,
        notes,
        createdAt: new Date()
    });

    return newStock;
}

// Obtener todos los productos activos
export async function getActiveProducts() {
    // No podemos usar .where('isActive').equals(1) porque IndexedDB no soporta índices en este campo
    // En su lugar, obtenemos todos y filtramos en memoria
    const allProducts = await db.products.toArray();
    return allProducts.filter(p => p.isActive === 1);
}


// Obtener un producto por ID
export async function getProduct(productId) {
    return await db.products.get(productId);
}

// Crear nuevo producto
export async function createProduct(name, unit) {
    const id = await db.products.add({
        name,
        unit,
        currentStock: 0,
        isActive: 1,  // Usar número
        createdAt: new Date()
    });

    return id;
}

// Actualizar producto
export async function updateProduct(productId, updates) {
    await db.products.update(productId, updates);
}

// Archivar producto (soft delete)
export async function archiveProduct(productId) {
    await db.products.update(productId, { isActive: 0 });  // Usar número
}

// Obtener movimientos de un producto
export async function getProductMovements(productId, limit = 50) {
    return await db.movements
        .where('productId')
        .equals(productId)
        .reverse()
        .limit(limit)
        .toArray();
}

// Obtener todos los movimientos recientes
export async function getRecentMovements(limit = 50) {
    return await db.movements
        .orderBy('createdAt')
        .reverse()
        .limit(limit)
        .toArray();
}

// Obtener movimientos por fecha
export async function getMovementsByDate(date) {
    return await db.movements
        .where('date')
        .equals(date)
        .toArray();
}

// Obtener movimientos por tipo
export async function getMovementsByType(type, limit = 50) {
    return await db.movements
        .where('type')
        .equals(type)
        .reverse()
        .limit(limit)
        .toArray();
}
