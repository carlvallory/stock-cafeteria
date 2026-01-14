import { db } from './db';

const API_Base = '/api';

export const syncService = {
    // 1. Subir cambios pendientes (PUSH)
    pushChanges: async () => {
        if (!navigator.onLine) return; // No intentar si no hay internet

        const pendingItems = await db.pending_sync.toArray();
        if (pendingItems.length === 0) return;

        // Ordenar por prioridad de dependencias:
        // 1. Products (padres)
        // 2. Settings / Workdays
        // 3. Movements (hijos de products)
        // Dentro de cada grupo, respetar orden cronológico
        pendingItems.sort((a, b) => {
            const tableOrder = { 'products': 1, 'settings': 2, 'workdays': 3, 'movements': 4 };
            const orderA = tableOrder[a.table] || 99;
            const orderB = tableOrder[b.table] || 99;

            if (orderA !== orderB) return orderA - orderB;
            return a.id - b.id; // Cronológico si es la misma tabla
        });

        console.log(`📡 Sincronizando ${pendingItems.length} cambios pendientes...`);

        for (const item of pendingItems) {
            try {
                // Mapear tabla local a endpoint de API
                let endpoint = '';
                switch (item.table) {
                    case 'products': endpoint = '/products'; break;
                    case 'movements': endpoint = '/movements'; break;
                    case 'workdays': endpoint = '/workdays'; break;
                    case 'settings': endpoint = '/settings'; break;
                    default: throw new Error(`Tabla desconocida: ${item.table}`);
                }

                const response = await fetch(`${API_Base}${endpoint}`, {
                    method: 'POST', // Siempre POST para simplificar en este diseño
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item.data)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Error API (${response.status}): ${errorText}`);
                }

                // Si tuvo éxito, borrar de la cola
                await db.pending_sync.delete(item.id);

            } catch (error) {
                console.error('❌ Error sincronizando item:', item, error);

                // Estrategia de recuperación de errores:
                // Si es un error de integridad referencial (FK), significa que el ID local no coincide con el remoto.
                // Esto pasa a veces en la primera sincronización si hubo datos creados offline antes de tener IDs reales.
                // En este caso, eliminamos la tarea para no atascar la cola.
                if (error.message.includes('foreign key constraint') || error.message.includes('violates foreign key')) {
                    console.warn('🗑️ Eliminando item corrupto por error de FK (ID incorrecto):', item);
                    await db.pending_sync.delete(item.id);
                }

                // Si intentamos cerrar y da 404, es que ya estaba cerrado (o nunca se abrió).
                // Asumimos éxito para no bloquear la cola.
                if (item.action === 'close' && error.message.includes('404')) {
                    console.warn('⚠️ La jornada ya estaba cerrada en servidor (404). Marcando como completado.', item);
                    await db.pending_sync.delete(item.id);
                }
                // Si es otro error (red, server), se mantiene en la cola para reintentar.
            }
        }
    },

    // 2. Bajar cambios del servidor (PULL)
    // Estrategia simple: Bajar todo y actualizar local si es más reciente
    // Para V1, nos enfocamos en que lo PUSH funcione bien. 
    // El PULL complejo requiere manejo de conflictos timestamps.
    // Por ahora, haremos un PULL básico de productos al abrir la app o manualmente.
    pullProducts: async () => {
        if (!navigator.onLine) return;

        try {
            const response = await fetch(`${API_Base}/products`);
            if (!response.ok) throw new Error('Error fetching products');
            const serverProducts = await response.json();

            // Actualizar localmente
            // Nota: Esto sobrescribe cambios locales si no se han subido.
            // Idealmente PUSH debe correr antes de PULL.
            await db.transaction('rw', db.products, async () => {
                for (const sp of serverProducts) {
                    const local = await db.products.where('name').equals(sp.name).first();
                    if (local) {
                        await db.products.update(local.id, {
                            currentStock: sp.current_stock, // Mapeo de snake_case a camelCase si es necesario
                            unit: sp.unit,
                            isActive: sp.is_active
                        });
                    } else {
                        // Nuevo producto del servidor
                        await db.products.add({
                            name: sp.name,
                            unit: sp.unit,
                            currentStock: sp.current_stock,
                            isActive: sp.is_active,
                            createdAt: new Date(sp.created_at)
                        });
                    }
                }
            });
            console.log('✅ Productos sincronizados del servidor.');
            window.dispatchEvent(new Event('cafeteria:stock-updated'));
        } catch (error) {
            console.error('Error pulling products:', error);
        }
    },

    // 3. Sincronizar Estado de la Jornada (Solo detectar BLOQUEO)
    // NO Auto-Join. Solo avisar a la UI si hay alguien más trabajando.
    pullActiveWorkday: async () => {
        if (!navigator.onLine) return;

        try {
            const response = await fetch(`${API_Base}/workdays?status=open`);
            if (response.ok) {
                const remoteWorkday = await response.json();

                // Buscar jornada abierta local
                const localOpen = await db.workdays.where({ status: 'open' }).first();

                // CASO 1: Servidor tiene abierta, Local NO -> BLOQUEO (Lock)
                // Carlos tiene abierta, Enzo está en la pantalla de inicio.
                // Avisamos a la UI para que deshabilite los botones de "Abrir".
                if (remoteWorkday && !localOpen) {
                    console.log('🔒 Detectada sesión remota activa (Bloqueo):', remoteWorkday.responsible_person);
                    window.dispatchEvent(new CustomEvent('cafeteria:remote-lock', {
                        detail: {
                            isLocked: true,
                            responsible: remoteWorkday.responsible_person
                        }
                    }));
                }
                // CASO 1.5: Servidor NO tiene abierta, Local NO -> DESBLOQUEO
                else if (!remoteWorkday && !localOpen) {
                    window.dispatchEvent(new CustomEvent('cafeteria:remote-lock', {
                        detail: { isLocked: false, responsible: null }
                    }));
                }

                // CASO 2: Servidor NO tiene abierta, Local SÍ -> Auto-Close (Sync Close)
                // Si alguien cerró remotamente (o forzado), cerramos aquí también.
                if (!remoteWorkday && localOpen) {
                    // Verificar si tenemos un "Abrir" pendiente nos protegemos de auto-cerrar prematuramente
                    const pendingOpens = await db.pending_sync
                        .where({ table: 'workdays', action: 'open' })
                        .count();

                    if (pendingOpens === 0) {
                        console.log('📥 La sesión remota fue cerrada. Cerrando localmente...');
                        await db.workdays.update(localOpen.id, {
                            status: 'closed',
                            closedAt: new Date()
                        });
                        window.dispatchEvent(new Event('cafeteria:stock-updated'));
                    }
                }
            }
        } catch (error) {
            console.error('Error pulling workday status:', error);
        }
    }
};
