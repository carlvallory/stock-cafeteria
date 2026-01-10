import { db, MovementTypes } from './db';
import { getDateDaysAgo } from '../utils/dateHelpers';
import { countOperatingDays } from './workdayService';

// Obtener consumo por producto en un rango de fechas
export async function getConsumption(productId, startDate, endDate) {
    const movements = await db.movements
        .where('[productId+date]')
        .between([productId, startDate], [productId, endDate], true, true)
        .toArray();

    // Sumar solo ventas (cantidad negativa)
    const totalSales = movements
        .filter(m => m.type === MovementTypes.SALE)
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

    return totalSales;
}

// Calcular promedio diario
export async function getDailyAverage(productId, days = 30) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = getDateDaysAgo(days);

    const totalConsumption = await getConsumption(productId, startDate, endDate);

    // Contar días con jornadas cerradas (días reales de operación)
    const workdays = await countOperatingDays(startDate, endDate);

    if (workdays === 0) return 0;

    return totalConsumption / workdays;
}

// Calcular promedio semanal
export async function getWeeklyAverage(productId, weeks = 4) {
    const dailyAvg = await getDailyAverage(productId, weeks * 7);
    return dailyAvg * 7;
}

// Calcular promedio mensual
export async function getMonthlyAverage(productId, months = 3) {
    const dailyAvg = await getDailyAverage(productId, months * 30);
    return dailyAvg * 30;
}

// Obtener estadísticas completas de un producto
export async function getProductStats(productId) {
    const [daily, weekly, monthly] = await Promise.all([
        getDailyAverage(productId, 30),
        getWeeklyAverage(productId, 4),
        getMonthlyAverage(productId, 3)
    ]);

    return {
        daily: parseFloat(daily.toFixed(2)),
        weekly: parseFloat(weekly.toFixed(2)),
        monthly: parseFloat(monthly.toFixed(2))
    };
}

// Obtener estadísticas de todos los productos
export async function getAllProductsStats() {
    const products = await db.products
        .where('isActive')
        .equals(1)
        .toArray();

    const stats = await Promise.all(
        products.map(async (product) => {
            const productStats = await getProductStats(product.id);
            return {
                productId: product.id,
                productName: product.name,
                currentStock: product.currentStock,
                ...productStats
            };
        })
    );

    return stats;
}

// Obtener top productos más vendidos
export async function getTopSellingProducts(limit = 3, days = 30) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = getDateDaysAgo(days);

    const products = await db.products
        .where('isActive')
        .equals(1)
        .toArray();

    const salesData = await Promise.all(
        products.map(async (product) => {
            const consumption = await getConsumption(product.id, startDate, endDate);
            return {
                productId: product.id,
                productName: product.name,
                totalSales: consumption
            };
        })
    );

    // Ordenar por ventas descendente
    return salesData
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, limit);
}

// Obtener consumo diario de un producto en los últimos N días
export async function getDailyConsumptionHistory(productId, days = 7) {
    const history = [];

    for (let i = 0; i < days; i++) {
        const date = getDateDaysAgo(i);
        const consumption = await getConsumption(productId, date, date);
        history.push({
            date,
            consumption
        });
    }

    return history.reverse(); // Más antiguo primero
}
