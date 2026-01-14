import Dexie from 'dexie';

export const db = new Dexie('CafeteriaStockDB');

// Definir esquema de base de datos con índices compuestos desde el inicio
db.version(1).stores({
    // Tabla de productos
    products: '++id, name, unit, currentStock, isActive, createdAt',

    // Tabla de movimientos de stock con índices compuestos
    movements: '++id, productId, date, type, [productId+date], createdAt',

    // Tabla de jornadas (snapshots diarios)
    workdays: '++id, date, status, openedAt, closedAt',

    // Tabla de configuración
    settings: 'key, value, updatedAt'
});

// Versión 2: Agregar campo responsiblePerson a workdays
db.version(2).stores({
    products: '++id, name, unit, currentStock, isActive, createdAt',
    movements: '++id, productId, date, type, [productId+date], createdAt',
    workdays: '++id, date, status, openedAt, closedAt, responsiblePerson',
    settings: 'key, value, updatedAt'
});


// Inicializar datos por defecto
export async function initializeDefaultData() {
    const productCount = await db.products.count();

    // Solo inicializar si no hay productos
    if (productCount === 0) {
        await db.products.bulkAdd([
            {
                name: 'Café embotellado tipo A',
                unit: 'unidad',
                currentStock: 0,
                isActive: 1,  // Usar número en lugar de boolean
                createdAt: new Date()
            },
            {
                name: 'Café embotellado tipo B',
                unit: 'unidad',
                currentStock: 0,
                isActive: 1,
                createdAt: new Date()
            },
            {
                name: 'Jugo de naranja',
                unit: 'unidad',
                currentStock: 0,
                isActive: 1,
                createdAt: new Date()
            },
            {
                name: 'Cookie de chocolate',
                unit: 'unidad',
                currentStock: 0,
                isActive: 1,
                createdAt: new Date()
            },
            {
                name: 'Cookie con chips de chocolate',
                unit: 'unidad',
                currentStock: 0,
                isActive: 1,
                createdAt: new Date()
            }
        ]);
    }

    // Inicializar configuración por defecto
    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
        await db.settings.bulkAdd([
            {
                key: 'activeDaysPerWeek',
                value: 4,
                updatedAt: new Date()
            },
            {
                key: 'safetyMarginPercent',
                value: 30,
                updatedAt: new Date()
            },
            {
                key: 'lowStockAlerts',
                value: true,
                updatedAt: new Date()
            },
            {
                key: 'pinHash',
                value: null,
                updatedAt: new Date()
            }
        ]);
    }
}

// Exportar tipos para TypeScript (opcional, pero útil para documentación)
export const MovementTypes = {
    SALE: 'sale',
    RESTOCK: 'restock',
    ADJUSTMENT: 'adjustment',
    OPENING: 'opening',
    CLOSING: 'closing'
};

export const WorkdayStatus = {
    OPEN: 'open',
    CLOSED: 'closed'
};
