import pool from './db';

export default async function handler(request, response) {
    if (request.method === 'GET') {
        try {
            const limit = parseInt(request.query.limit || '50');
            const { rows } = await pool.query(
                'SELECT * FROM movements ORDER BY created_at DESC LIMIT $1',
                [limit]
            );
            return response.status(200).json(rows);
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    if (request.method === 'POST') {
        try {
            const { productId, type, quantity, date, time, notes } = request.body;

            // Transactional update: Update product stock AND log movement
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // 1. Update Product
                await client.query(
                    'UPDATE products SET current_stock = current_stock + $1 WHERE id = $2',
                    [quantity, productId]
                );

                // 2. Log Movement
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
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    return response.status(405).json({ error: 'Method not allowed' });
}
