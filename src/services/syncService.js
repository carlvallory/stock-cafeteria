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
                // No borramos el item, se reintentará en la próxima sincronización
                // Opcional: Implementar contador de reintentos para evitar bucles infinitos
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
        } catch (error) {
            console.error('Error pulling products:', error);
        }
    }
};
