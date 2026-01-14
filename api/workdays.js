import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
    if (request.method === 'GET') {
        try {
            // Check for open workday
            if (request.query.status === 'open') {
                const { rows } = await sql`
          SELECT * FROM workdays 
          WHERE status = 'open' 
          LIMIT 1;
        `;
                return response.status(200).json(rows[0] || null);
            }

            // Default: list recent workdays
            const limit = request.query.limit || 30;
            const { rows } = await sql`
        SELECT * FROM workdays 
        ORDER BY created_at DESC 
        LIMIT ${limit};
      `;
            return response.status(200).json(rows);
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    if (request.method === 'POST') {
        try {
            const { action, date, responsiblePerson, openingStock, closingStock } = request.body;

            if (action === 'open') {
                // Prevent multiple open days
                const existing = await sql`SELECT id FROM workdays WHERE status = 'open' LIMIT 1`;
                if (existing.rows.length > 0) {
                    return response.status(409).json({ error: 'There is already an open workday' });
                }

                const { rows } = await sql`
          INSERT INTO workdays (date, status, opened_at, responsible_person, opening_stock)
          VALUES (${date}, 'open', NOW(), ${responsiblePerson}, ${JSON.stringify(openingStock)})
          RETURNING *;
        `;
                return response.status(201).json(rows[0]);
            }

            if (action === 'close') {
                // Close current open day
                const { rows } = await sql`
          UPDATE workdays 
          SET status = 'closed', closed_at = NOW(), closing_stock = ${JSON.stringify(closingStock)}
          WHERE status = 'open'
          RETURNING *;
        `;

                if (rows.length === 0) {
                    return response.status(404).json({ error: 'No open workday to close' });
                }
                return response.status(200).json(rows[0]);
            }

            return response.status(400).json({ error: 'Invalid action' });
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    return response.status(405).json({ error: 'Method not allowed' });
}
