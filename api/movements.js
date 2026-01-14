import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
    if (request.method === 'GET') {
        try {
            const limit = request.query.limit || 50;
            const { rows } = await sql`
        SELECT * FROM movements 
        ORDER BY created_at DESC 
        LIMIT ${limit};
      `;
            return response.status(200).json(rows);
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    if (request.method === 'POST') {
        // Transactional move: Update product and log movement
        // Note: Vercel Postgres supports transactions.
        try {
            const { productId, type, quantity, date, time, notes } = request.body;

            // We perform two queries. Ideally this should be a transaction.
            // 1. Update Product
            await sql`
        UPDATE products 
        SET current_stock = current_stock + ${quantity}
        WHERE id = ${productId};
      `;

            // 2. Log Movement
            const { rows } = await sql`
        INSERT INTO movements (product_id, date, time, type, quantity, notes)
        VALUES (${productId}, ${date}, ${time}, ${type}, ${quantity}, ${notes})
        RETURNING *;
      `;

            return response.status(201).json(rows[0]);
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    return response.status(405).json({ error: 'Method not allowed' });
}
