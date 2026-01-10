import { db, MovementTypes, WorkdayStatus } from './db';
import { getCurrentDate, getCurrentTime, getYesterdayDate } from '../utils/dateHelpers';
import { getActiveProducts } from './stockService';

// Verificar si hay una jornada abierta hoy
export async function isWorkdayOpen() {
    const today = getCurrentDate();
    const workday = await db.workdays
        .where('date')
        .equals(today)
        .first();

    return workday && workday.status === WorkdayStatus.OPEN;
}

// Obtener jornada actual
export async function getCurrentWorkday() {
    const today = getCurrentDate();
    return await db.workdays
        .where('date')
        .equals(today)
        .first();
}

// Abrir cafetería
export async function openCafeteria() {
    const today = getCurrentDate();

    // Verificar si ya está abierta
    const existingWorkday = await db.workdays
        .where('date')
        .equals(today)
        .first();

    if (existingWorkday && existingWorkday.status === WorkdayStatus.OPEN) {
        throw new Error('La cafetería ya está abierta hoy');
    }

    // Obtener stock actual de todos los productos
    const products = await getActiveProducts();
    const openingStock = {};

    products.forEach(p => {
        openingStock[p.id] = p.currentStock;
    });

    // Crear jornada
    const workdayId = await db.workdays.add({
        date: today,
        status: WorkdayStatus.OPEN,
        openingStock,
        openedAt: new Date()
    });

    // Registrar movimientos de apertura
    for (const product of products) {
        await db.movements.add({
            productId: product.id,
            date: today,
            time: getCurrentTime(),
            quantity: product.currentStock,
            type: MovementTypes.OPENING,
            notes: 'Apertura de jornada',
            createdAt: new Date()
        });
    }

    return workdayId;
}

// Cerrar cafetería
export async function closeCafeteria() {
    const today = getCurrentDate();

    const workday = await db.workdays
        .where('date')
        .equals(today)
        .first();

    if (!workday || workday.status === WorkdayStatus.CLOSED) {
        throw new Error('No hay jornada abierta para cerrar');
    }

    // Obtener stock actual
    const products = await getActiveProducts();
    const closingStock = {};

    products.forEach(p => {
        closingStock[p.id] = p.currentStock;
    });

    // Actualizar jornada
    await db.workdays.update(workday.id, {
        status: WorkdayStatus.CLOSED,
        closingStock,
        closedAt: new Date()
    });

    // Registrar movimientos de cierre
    for (const product of products) {
        await db.movements.add({
            productId: product.id,
            date: today,
            time: getCurrentTime(),
            quantity: product.currentStock,
            type: MovementTypes.CLOSING,
            notes: 'Cierre de jornada',
            createdAt: new Date()
        });
    }

    return workday.id;
}

// Usar stock del día anterior
export async function useYesterdayStock() {
    const yesterday = getYesterdayDate();
    const lastWorkday = await db.workdays
        .where('date')
        .equals(yesterday)
        .first();

    if (!lastWorkday || !lastWorkday.closingStock) {
        throw new Error('No hay stock del día anterior disponible');
    }

    // Actualizar stock actual con el del cierre anterior
    for (const [productId, stock] of Object.entries(lastWorkday.closingStock)) {
        await db.products.update(Number(productId), {
            currentStock: stock
        });
    }

    // Abrir con ese stock
    return await openCafeteria();
}

// Obtener última jornada cerrada
export async function getLastClosedWorkday() {
    return await db.workdays
        .where('status')
        .equals(WorkdayStatus.CLOSED)
        .reverse()
        .first();
}

// Obtener jornadas en un rango de fechas
export async function getWorkdaysInRange(startDate, endDate) {
    return await db.workdays
        .where('date')
        .between(startDate, endDate, true, true)
        .toArray();
}

// Obtener jornadas cerradas en un rango
export async function getClosedWorkdaysInRange(startDate, endDate) {
    return await db.workdays
        .where('date')
        .between(startDate, endDate, true, true)
        .and(w => w.status === WorkdayStatus.CLOSED)
        .toArray();
}

// Contar días operativos en un rango
export async function countOperatingDays(startDate, endDate) {
    return await db.workdays
        .where('date')
        .between(startDate, endDate, true, true)
        .and(w => w.status === WorkdayStatus.CLOSED)
        .count();
}
