import pool from './db';

export default async function handler(request, response) {
    if (request.method === 'GET') {
        try {
            const { rows } = await pool.query('SELECT * FROM settings');
            const settings = {};
            rows.forEach(row => {
                settings[row.key] = row.value;
            });
            return response.status(200).json(settings);
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    if (request.method === 'POST') {
        try {
            const { key, value } = request.body;
            if (!key) throw new Error('Key is required');

            // Upsert: INSERT ... ON CONFLICT
            const { rows } = await pool.query(
                `INSERT INTO settings (key, value, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, updated_at = NOW() 
         RETURNING *`,
                [key, JSON.stringify(value)]
            );
            return response.status(200).json(rows[0]);
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    return response.status(405).json({ error: 'Method not allowed' });
}
