import { useEffect } from 'react';
import { syncService } from '../services/syncService';
import { useStore } from '../store/useStore';

export function useSync() {
    const refreshAll = useStore(state => state.refreshAll);

    useEffect(() => {
        // 1. Sync on mount (if online)
        syncService.pushChanges();
        syncService.pullProducts();
        syncService.pullActiveWorkday();
        syncService.pullRecentWorkdays();

        // 2. Sync loop (every 60 seconds - Autopull enabled)
        const intervalId = setInterval(() => {
            syncService.pushChanges();
            syncService.pullProducts(); // Pull regular para ver cambios de otros usuarios
            syncService.pullActiveWorkday(); // Verificar si alguien abrió/cerró caja
            syncService.pullRecentWorkdays(); // Mantener historial fresco
        }, 60 * 1000);

        // 3. Sync when back online
        const handleOnline = () => {
            console.log('🌐 Online detected. Syncing...');
            syncService.pushChanges();
            syncService.pullProducts();
            syncService.pullActiveWorkday();
        };

        // 4. Listen for sync updates to refresh UI
        const handleStockUpdate = () => {
            console.log('🔄 Stock updated from sync, refreshing UI...');
            refreshAll();
        };

        const handleRemoteLock = (event) => {
            // Actualizar estado de bloqueo en el store
            useStore.getState().setRemoteLock(event.detail);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('cafeteria:stock-updated', handleStockUpdate);
        window.addEventListener('cafeteria:remote-lock', handleRemoteLock);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('cafeteria:stock-updated', handleStockUpdate);
            window.removeEventListener('cafeteria:remote-lock', handleRemoteLock);
        };
    }, [refreshAll]);
}
