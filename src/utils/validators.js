// Validar que el stock sea un número válido
export function validateStock(value) {
    const num = Number(value);
    if (isNaN(num)) {
        return { valid: false, error: 'Debe ser un número válido' };
    }
    if (num < 0) {
        return { valid: false, error: 'El stock no puede ser negativo' };
    }
    if (num > 9999) {
        return { valid: false, error: 'El stock no puede exceder 9999' };
    }
    if (!Number.isInteger(num)) {
        return { valid: false, error: 'El stock debe ser un número entero' };
    }
    return { valid: true, value: num };
}

// Validar nombre de producto
export function validateProductName(name) {
    if (!name || name.trim().length === 0) {
        return false;
    }
    if (name.length < 3 || name.length > 50) {
        return false;
    }
    return true;
}

// Validar unidad de medida
export function validateUnit(unit) {
    if (!unit || unit.trim().length === 0) {
        return { valid: false, error: 'La unidad no puede estar vacía' };
    }
    if (unit.length > 50) {
        return { valid: false, error: 'La unidad es demasiado larga (máximo 50 caracteres)' };
    }
    return { valid: true, value: unit.trim() };
}

// Alias para compatibilidad
export function validateProductUnit(unit) {
    if (!unit || unit.trim().length === 0) {
        return false;
    }
    if (unit.length < 2 || unit.length > 20) {
        return false;
    }
    return true;
}

// Validar porcentaje
export function validatePercentage(value) {
    const num = Number(value);
    if (isNaN(num)) {
        return { valid: false, error: 'Debe ser un número válido' };
    }
    if (num < 0 || num > 100) {
        return { valid: false, error: 'Debe estar entre 0 y 100' };
    }
    return { valid: true, value: num };
}

// Validar días activos por semana
export function validateActiveDays(value) {
    const num = Number(value);
    if (isNaN(num)) {
        return { valid: false, error: 'Debe ser un número válido' };
    }
    if (!Number.isInteger(num)) {
        return { valid: false, error: 'Debe ser un número entero' };
    }
    if (num < 1 || num > 7) {
        return { valid: false, error: 'Debe estar entre 1 y 7 días' };
    }
    return { valid: true, value: num };
}
