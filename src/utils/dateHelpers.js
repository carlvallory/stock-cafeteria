import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// Obtener fecha actual en formato YYYY-MM-DD
export function getCurrentDate() {
    return format(new Date(), 'yyyy-MM-dd');
}

// Obtener hora actual en formato HH:mm:ss
export function getCurrentTime() {
    return format(new Date(), 'HH:mm:ss');
}

// Obtener fecha de ayer
export function getYesterdayDate() {
    return format(subDays(new Date(), 1), 'yyyy-MM-dd');
}

// Obtener fecha de hace N días
export function getDateDaysAgo(days) {
    return format(subDays(new Date(), days), 'yyyy-MM-dd');
}

// Formatear fecha para display (ej: "10 Ene 2024")
export function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    return format(date, "d MMM yyyy", { locale: es });
}

// Formatear hora para mostrar (ej: "14:30")
export function formatDisplayTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
}

// Obtener inicio y fin del día
export function getDayBounds(dateString) {
    const date = new Date(dateString);
    return {
        start: startOfDay(date),
        end: endOfDay(date)
    };
}

// Verificar si una fecha es hoy
export function isToday(dateString) {
    return dateString === getCurrentDate();
}

// Verificar si una fecha es ayer
export function isYesterday(dateString) {
    return dateString === getYesterdayDate();
}
