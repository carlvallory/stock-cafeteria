import { Pool } from '@neondatabase/serverless';

export default async function handler(request, response) {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });

        if (request.method === 'GET') {
            const { rows } = await pool.query('SELECT * FROM products ORDER BY name ASC');
            return response.status(200).json(rows);
        }

        if (request.method === 'POST') {
            const { name, unit } = request.body;
            if (!name) throw new Error('Name is required');

            const { rows } = await pool.query(
                'INSERT INTO products (name, unit, current_stock, is_active) VALUES ($1, $2, 0, 1) RETURNING *',
                [name, unit]
            );
            return response.status(201).json(rows[0]);
        }

        return response.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
