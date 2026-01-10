import { db } from './db';
import { getDailyAverage } from './statsService';

// Obtener configuración
export async function getSettings() {
    const settings = await db.settings.toArray();
    const config = {};

    settings.forEach(setting => {
        config[setting.key] = setting.value;
    });

    return config;
}

// Actualizar configuración
export async function updateSetting(key, value) {
    const existing = await db.settings.get(key);

    if (existing) {
        await db.settings.update(key, {
            value,
            updatedAt: new Date()
        });
    } else {
        await db.settings.add({
            key,
            value,
            updatedAt: new Date()
        });
    }
}

// Calcular stock mínimo recomendado
export async function calculateMinimumStock(productId) {
    const settings = await getSettings();
    const activeDaysPerWeek = settings.activeDaysPerWeek || 4;
    const safetyMarginPercent = settings.safetyMarginPercent || 30;

    // Promedio diario basado en últimos 30 días
    const dailyAverage = await getDailyAverage(productId, 30);

    // Stock base = promedio diario × días activos por semana
    const baseStock = dailyAverage * activeDaysPerWeek;

    // Agregar margen de seguridad
    const safetyMargin = baseStock * (safetyMarginPercent / 100);
    const minimumStock = Math.ceil(baseStock + safetyMargin);

    return {
        minimumStock,
        dailyAverage: parseFloat(dailyAverage.toFixed(2)),
        baseStock: parseFloat(baseStock.toFixed(2)),
        safetyMargin: parseFloat(safetyMargin.toFixed(2))
    };
}

// Verificar si un producto tiene stock bajo
export async function isLowStock(productId) {
    const product = await db.products.get(productId);
    if (!product) return false;

    const { minimumStock } = await calculateMinimumStock(productId);

    return product.currentStock < minimumStock;
}

// Obtener nivel de stock (low, medium, good)
export async function getStockLevel(productId) {
    const product = await db.products.get(productId);
    if (!product) return 'unknown';

    const { minimumStock } = await calculateMinimumStock(productId);

    if (product.currentStock < minimumStock) {
        return 'low';
    } else if (product.currentStock < minimumStock * 1.2) {
        return 'medium';
    } else {
        return 'good';
    }
}

// Obtener todos los productos con stock bajo
export async function getLowStockProducts() {
    const products = await db.products
        .where('isActive')
        .equals(1)
        .toArray();

    const lowStockProducts = [];

    for (const product of products) {
        const { minimumStock, dailyAverage } = await calculateMinimumStock(product.id);

        if (product.currentStock < minimumStock) {
            lowStockProducts.push({
                ...product,
                minimumStock,
                dailyAverage,
                deficit: minimumStock - product.currentStock
            });
        }
    }

    return lowStockProducts;
}

// Verificar y guardar alertas de stock bajo
export async function checkAndNotifyLowStock() {
    const lowStockProducts = await getLowStockProducts();

    if (lowStockProducts.length > 0) {
        // Guardar alerta en settings para mostrar en UI
        await updateSetting('lastLowStockAlert', {
            timestamp: new Date(),
            products: lowStockProducts.map(p => ({
                id: p.id,
                name: p.name,
                currentStock: p.currentStock,
                minimumStock: p.minimumStock
            }))
        });

        // TODO: Implementar push notification cuando esté disponible
        // if ('Notification' in window && Notification.permission === 'granted') {
        //   new Notification('Stock Bajo', {
        //     body: `${lowStockProducts.length} producto(s) con stock bajo`,
        //     icon: '/icons/icon-192.png'
        //   });
        // }
    }

    return lowStockProducts;
}

// Solicitar permiso para notificaciones (preparación futura)
export async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        await updateSetting('notificationPermission', permission);
        return permission === 'granted';
    }
    return false;
}
