import { create } from 'zustand';
import { getActiveProducts } from '../services/stockService';
import { isWorkdayOpen, getCurrentWorkday } from '../services/workdayService';
import { getLowStockProducts } from '../services/alertService';

export const useStore = create((set, get) => ({
    // Estado
    products: [],
    workdayOpen: false,
    currentWorkday: null,
    lowStockAlerts: [],
    loading: false,
    error: null,

    // Acciones
    loadProducts: async () => {
        try {
            set({ loading: true, error: null });
            const products = await getActiveProducts();
            set({ products, loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    checkWorkdayStatus: async () => {
        try {
            const isOpen = await isWorkdayOpen();
            const workday = await getCurrentWorkday();
            set({ workdayOpen: isOpen, currentWorkday: workday });
        } catch (error) {
            set({ error: error.message });
        }
    },

    checkLowStockAlerts: async () => {
        try {
            const alerts = await getLowStockProducts();
            set({ lowStockAlerts: alerts });
        } catch (error) {
            console.error('Error checking low stock:', error);
        }
    },

    refreshAll: async () => {
        await Promise.all([
            get().loadProducts(),
            get().checkWorkdayStatus(),
            get().checkLowStockAlerts()
        ]);
    },

    setError: (error) => set({ error }),
    clearError: () => set({ error: null })
}));
