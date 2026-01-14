import { useState, useEffect } from 'react';
import { getClosedWorkdaysInRange } from '../services/workdayService';
import { getMovementsByDate } from '../services/stockService';
import { formatDisplayDate, formatDisplayTime, getCurrentDate, getDateDaysAgo } from '../utils/dateHelpers';
import { db } from '../services/db';
import './HistoryPage.css';

export default function HistoryPage({ onBack }) {
    const [workdays, setWorkdays] = useState([]);
    const [filteredWorkdays, setFilteredWorkdays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkday, setSelectedWorkday] = useState(null);
    const [movements, setMovements] = useState([]);

    // Filtros
    const [startDate, setStartDate] = useState(getDateDaysAgo(30));
    const [endDate, setEndDate] = useState(getCurrentDate());
    const [responsibleFilter, setResponsibleFilter] = useState('');

    useEffect(() => {
        loadWorkdays();
    }, [startDate, endDate]);

    useEffect(() => {
        applyFilters();
    }, [workdays, responsibleFilter]);

    async function loadWorkdays() {
        setLoading(true);
        try {
            const data = await getClosedWorkdaysInRange(startDate, endDate);
            // Ordenar por fecha descendente (más reciente primero)
            const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setWorkdays(sorted);
        } catch (error) {
            console.error('Error loading workdays:', error);
            alert('Error al cargar historial: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    function applyFilters() {
        let filtered = [...workdays];

        if (responsibleFilter.trim()) {
            filtered = filtered.filter(wd =>
                wd.responsiblePerson?.toLowerCase().includes(responsibleFilter.toLowerCase())
            );
        }

        setFilteredWorkdays(filtered);
    }

    async function handleViewDetails(workday) {
        setSelectedWorkday(workday);
        try {
            const movs = await getMovementsByDate(workday.date);
            setMovements(movs);
        } catch (error) {
            console.error('Error loading movements:', error);
        }
    }

    async function handleExportCSV() {
        try {
            // Obtener todos los productos para los encabezados
            const allProducts = await db.products.toArray();

            // Construir encabezados base
            const headers = [
                'Fecha',
                'Responsable',
                'Hora Apertura',
                'Hora Cierre'
            ];

            // Agregar columnas por cada producto (Inicio y Fin)
            allProducts.forEach(p => {
                headers.push(`${p.name} (Inicio)`);
                headers.push(`${p.name} (Fin)`);
                headers.push(`${p.name} (Venta)`); // Opcional: calcular diferencia
            });

            const csvRows = [headers.join(',')];

            // Datos
            for (const wd of filteredWorkdays) {
                const row = [
                    wd.date,
                    wd.responsiblePerson || 'Sin especificar',
                    new Date(wd.openedAt).toLocaleTimeString('es'),
                    new Date(wd.closedAt).toLocaleTimeString('es')
                ];

                // Rellenar datos de productos
                for (const p of allProducts) {
                    const start = wd.openingStock?.[p.id] ?? 0;
                    const end = wd.closingStock?.[p.id] ?? 0;
                    const sales = start - end; // Cálculo simple de consumo/venta

                    row.push(start);
                    row.push(end);
                    row.push(sales);
                }

                csvRows.push(row.join(','));
            }

            // Descargar
            const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel compatibility
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `historial_detallado_${getCurrentDate()}.csv`;
            link.click();
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Error al exportar: ' + error.message);
        }
    }

    if (loading) {
        return (
            <div className="history-page">
                <div className="loading">Cargando historial...</div>
            </div>
        );
    }

    return (
        <div className="history-page">
            <div className="history-header">
                <button className="back-button" onClick={onBack}>
                    ← Volver
                </button>
                <h1>Historial de Jornadas</h1>
            </div>

            <div className="history-filters">
                <div className="filter-group">
                    <label>Desde:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label>Hasta:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label>Responsable:</label>
                    <input
                        type="text"
                        placeholder="Filtrar por nombre..."
                        value={responsibleFilter}
                        onChange={(e) => setResponsibleFilter(e.target.value)}
                    />
                </div>
                <button className="export-button" onClick={handleExportCSV}>
                    📊 Exportar CSV
                </button>
            </div>

            <div className="history-summary">
                <p>Mostrando {filteredWorkdays.length} jornada(s)</p>
            </div>

            <div className="workdays-list">
                {filteredWorkdays.length === 0 ? (
                    <div className="empty-state">
                        <p>No hay jornadas en el rango seleccionado</p>
                    </div>
                ) : (
                    filteredWorkdays.map(workday => (
                        <div key={workday.id} className="workday-card">
                            <div className="workday-main">
                                <div className="workday-date">
                                    <span className="date-label">{formatDisplayDate(workday.date)}</span>
                                    <span className="responsible-name">
                                        👤 {workday.responsiblePerson || 'Sin especificar'}
                                    </span>
                                </div>
                                <div className="workday-times">
                                    <span>🕐 {formatDisplayTime(new Date(workday.openedAt).toTimeString().split(' ')[0])}</span>
                                    <span>→</span>
                                    <span>🕐 {formatDisplayTime(new Date(workday.closedAt).toTimeString().split(' ')[0])}</span>
                                </div>
                            </div>
                            <button
                                className="view-details-button"
                                onClick={() => handleViewDetails(workday)}
                            >
                                Ver Detalle
                            </button>
                        </div>
                    ))
                )}
            </div>

            {selectedWorkday && (
                <div className="modal-overlay" onClick={() => setSelectedWorkday(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detalle de Jornada</h2>
                            <button className="modal-close" onClick={() => setSelectedWorkday(null)}>
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-section">
                                <h3>Información General</h3>
                                <p><strong>Fecha:</strong> {formatDisplayDate(selectedWorkday.date)}</p>
                                <p><strong>Responsable:</strong> {selectedWorkday.responsiblePerson || 'Sin especificar'}</p>
                                <p><strong>Apertura:</strong> {new Date(selectedWorkday.openedAt).toLocaleString('es')}</p>
                                <p><strong>Cierre:</strong> {new Date(selectedWorkday.closedAt).toLocaleString('es')}</p>
                            </div>

                            <div className="detail-section">
                                <h3>Movimientos del Día ({movements.length})</h3>
                                <div className="movements-list">
                                    {movements.length === 0 ? (
                                        <p className="empty-message">No hay movimientos registrados</p>
                                    ) : (
                                        movements.map((mov, idx) => (
                                            <div key={idx} className="movement-item">
                                                <span className="movement-time">{mov.time}</span>
                                                <span className="movement-type">{mov.type}</span>
                                                <span className="movement-quantity">{mov.quantity}</span>
                                                {mov.notes && <span className="movement-notes">{mov.notes}</span>}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
