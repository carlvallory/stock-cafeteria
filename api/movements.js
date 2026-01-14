import { Pool } from '@neondatabase/serverless';

export default async function handler(request, response) {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });

        if (request.method === 'GET') {
            const limit = parseInt(request.query.limit || '50');
            const { rows } = await pool.query(
                'SELECT * FROM movements ORDER BY created_at DESC LIMIT $1',
                [limit]
            );
            return response.status(200).json(rows);
        }

        if (request.method === 'POST') {
            const { productId, type, quantity, date, time, notes } = request.body;

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                await client.query(
                    'UPDATE products SET current_stock = current_stock + $1 WHERE id = $2',
                    [quantity, productId]
                );

                const { rows } = await client.query(
                    'INSERT INTO movements (product_id, date, time, type, quantity, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                    [productId, date, time, type, quantity, notes]
                );

                await client.query('COMMIT');
                return response.status(201).json(rows[0]);
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }

        return response.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
