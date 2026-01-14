import { db, MovementTypes, WorkdayStatus } from './db';
import { getCurrentDate, getCurrentTime, getYesterdayDate } from '../utils/dateHelpers';
import { getActiveProducts } from './stockService';

// Verificar si hay una jornada abierta (independiente de la fecha)
export async function isWorkdayOpen() {
    const activeWorkday = await db.workdays
        .where('status')
        .equals(WorkdayStatus.OPEN)
        .first();

    return !!activeWorkday;
}

// Obtener jornada actual (la que está abierta)
export async function getCurrentWorkday() {
    return await db.workdays
        .where('status')
        .equals(WorkdayStatus.OPEN)
        .first();
}

// Abrir cafetería
export async function openCafeteria(responsiblePerson = '') {
    const today = getCurrentDate();

    // Verificar si YA hay una jornada abierta (cualquiera)
    const existingWorkday = await getCurrentWorkday();

    if (existingWorkday) {
        throw new Error(`Ya hay una jornada abierta (Fecha: ${existingWorkday.date})`);
    }

    // Si existe una jornada cerrada del mismo día (reapertura tras error?), eliminarla o archivarla
    // En este diseño simple, asumimos que se puede tener múltiples cerradas, pero por limpieza
    // seguimos la lógica original de borrar duplicados de fecha exactos si se desea, 
    // pero mejor lo dejamos simple: solo una abierta a la vez.

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
        openedAt: new Date(),
        responsiblePerson: responsiblePerson || 'Sin especificar'
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

    // Buscar la jornada abierta (sin restringir explícitamente por fecha para ser más robusto)
    const workday = await db.workdays
        .where('status')
        .equals(WorkdayStatus.OPEN)
        .first();

    if (!workday) {
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

// Aplicar stock del día anterior
export async function applyYesterdayStock(responsiblePerson = '') {
    const lastWorkday = await getLastClosedWorkday();

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
    return await openCafeteria(responsiblePerson);
}

// Obtener última jornada cerrada (búsqueda robusta por ID)
export async function getLastClosedWorkday() {
    return await db.workdays
        .orderBy('id') // Ordenar cronológicamente por creación
        .reverse()
        .filter(w => w.status === WorkdayStatus.CLOSED)
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
