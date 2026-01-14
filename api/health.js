import pool from './db';

export default async function handler(request, response) {
    try {
        // Intentar una consulta simple para verificar conexión
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as now, current_database() as db_name'); // Consulta de prueba
        client.release();

        return response.status(200).json({
            status: 'ok',
            message: 'Database Connected Successfully! 🚀',
            time: result.rows[0].now,
            database: result.rows[0].db_name,
            env_check: process.env.DATABASE_URL ? 'Defined' : 'Missing'
        });
    } catch (error) {
        return response.status(500).json({
            status: 'error',
            message: 'Database Connection Failed ❌',
            error_detail: error.message,
            stack: error.stack,
            env_check: process.env.DATABASE_URL ? 'Defined' : 'Missing' // Ayuda a saber si la variable llegó
        });
    }
}
