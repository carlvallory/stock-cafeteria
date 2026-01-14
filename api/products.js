import pool from './db';

export default async function handler(request, response) {
    if (request.method === 'GET') {
        try {
            const { rows } = await pool.query('SELECT * FROM products ORDER BY name ASC');
            return response.status(200).json(rows);
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    if (request.method === 'POST') {
        try {
            const { name, unit } = request.body;
            if (!name) throw new Error('Name is required');

            const { rows } = await pool.query(
                'INSERT INTO products (name, unit, current_stock, is_active) VALUES ($1, $2, 0, 1) RETURNING *',
                [name, unit]
            );
            return response.status(201).json(rows[0]);
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    return response.status(405).json({ error: 'Method not allowed' });
}
