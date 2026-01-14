import { db, MovementTypes, WorkdayStatus } from './db';
import { syncService } from './syncService';
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
    // 0. Chequeo de Concurrencia (Estricto)
    if (navigator.onLine) {
        let remoteWorkday = null;
        try {
            const response = await fetch('/api/workdays?status=open');
            if (response.ok) {
                remoteWorkday = await response.json();
            } else {
                // Si el servidor responde error (500), NO dejar pasar silenciosamente
                const text = await response.text();
                throw new Error(`Error del servidor verificando sesión: ${text}`);
            }
        } catch (error) {
            // Si es el error de "Ya existe...", lo relanzamos
            if (remoteWorkday) { // null check logic improved below
                // logic handled inside the try block usually, but let's restructure:
            }
            console.error("Check online falló:", error);
            // DECISIÓN DE DISEÑO: Si hay internet pero falla el servidor, ¿Bloqueamos o dejamos pasar?
            // El usuario se quejó de que "le dejó entrar". Así que vamos a ser más ESTRICTOS.
            // Solo permitimos "Modo Offline" si realmente es error de conexión (fetch fails), no 500.
            if (!error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
                // Es un error de API/Servidor -> BLOQUEAR y Avisar
                throw new Error(`⚠️ Error crítico de servidor: No se pudo verificar si hay otra caja abierta. Por seguridad, no se permite abrir. Intenta de nuevo o revisa tu conexión. (${error.message})`);
            }
            // Si es NetworkError, dejamos pasar (Offline real) warning
            console.warn('⚠️ Sin conexión real al servidor (NetworkError). Abriendo en modo Local.');
        }

        if (remoteWorkday) {
            throw new Error(`⛔ ¡ALERTA! Ya existe una jornada abierta por: ${remoteWorkday.responsible_person || 'Alguien'}. No puedes abrir dos veces.`);
        }
    }

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

    // 1. Sincronizar stock con la nube (Crucial para que Enzo vea lo que cerró Carlos)
    if (navigator.onLine) {
        try {
            console.log('☁️ Bajando stock actualizado del servidor antes de abrir...');
            await syncService.pullProducts();
        } catch (error) {
            console.warn('⚠️ No se pudo actualizar stock nube, usando local:', error);
        }
    }

    // 2. Obtener stock actual de todos los productos (ahora actualizado)
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
    const movements = [];
    for (const product of products) {
        movements.push({
            productId: product.id,
            date: today,
            time: getCurrentTime(),
            quantity: product.currentStock,
            type: MovementTypes.OPENING,
            notes: 'Apertura de jornada',
            createdAt: new Date()
        });
    }
    await db.movements.bulkAdd(movements);

    // Enqueue Sync
    await db.pending_sync.add({
        table: 'workdays',
        action: 'open',
        data: {
            action: 'open',
            date: today,
            responsiblePerson: responsiblePerson || 'Sin especificar',
            openingStock
        },
        createdAt: new Date()
    });

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
    const movements = [];
    for (const product of products) {
        movements.push({
            productId: product.id,
            date: today,
            time: getCurrentTime(),
            quantity: product.currentStock,
            type: MovementTypes.CLOSING,
            notes: 'Cierre de jornada',
            createdAt: new Date()
        });
    }
    await db.movements.bulkAdd(movements);

    // Enqueue Sync
    await db.pending_sync.add({
        table: 'workdays',
        action: 'close',
        data: {
            action: 'close',
            closingStock
        },
        createdAt: new Date()
    });

    return workday.id;
}

// Aplicar stock del día anterior
export async function applyYesterdayStock(responsiblePerson = '') {
    // 1. Sincronizar primero
    if (navigator.onLine) {
        try {
            await syncService.pullProducts();
        } catch (e) { console.warn('Sync failed', e); }
    }

    const lastWorkday = await getLastClosedWorkday();

    if (!lastWorkday || !lastWorkday.closingStock) {
        throw new Error('No hay stock del cierre anterior disponible');
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
