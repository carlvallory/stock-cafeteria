import { useEffect } from 'react';
import { syncService } from '../services/syncService';

export function useSync() {
    useEffect(() => {
        // 1. Sync on mount (if online)
        syncService.pushChanges();
        syncService.pullProducts();

        // 2. Sync loop (every 2 minutes)
        const intervalId = setInterval(() => {
            syncService.pushChanges();
            // syncService.pullChanges(); // Optional: pull regularly
        }, 120 * 1000);

        // 3. Sync when back online
        const handleOnline = () => {
            console.log('🌐 Online detected. Syncing...');
            syncService.pushChanges();
            syncService.pullProducts();
        };

        window.addEventListener('online', handleOnline);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('online', handleOnline);
        };
    }, []);
}
