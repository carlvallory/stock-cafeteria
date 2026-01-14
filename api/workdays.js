import pool from './db';

export default async function handler(request, response) {
    if (request.method === 'GET') {
        try {
            // Check for open workday
            if (request.query.status === 'open') {
                const { rows } = await pool.query('SELECT * FROM workdays WHERE status = $1 LIMIT 1', ['open']);
                return response.status(200).json(rows[0] || null);
            }

            // Default: list recent workdays
            const limit = parseInt(request.query.limit || '30');
            const { rows } = await pool.query(
                'SELECT * FROM workdays ORDER BY created_at DESC LIMIT $1',
                [limit]
            );
            return response.status(200).json(rows);
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    if (request.method === 'POST') {
        try {
            const { action, date, responsiblePerson, openingStock, closingStock } = request.body;

            if (action === 'open') {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');

                    // Prevent multiple open days (Optimistic Locking/Check)
                    const existing = await client.query("SELECT id FROM workdays WHERE status = 'open' FOR UPDATE SKIP LOCKED LIMIT 1");
                    // Note: simple select is enough usually, but strictly FOR UPDATE protects race conditions. 
                    // However, simply checking IF EXISTS is usually fine for this app scale.

                    // Actually, let's just do a simple check.
                    const check = await client.query("SELECT id FROM workdays WHERE status = 'open'");
                    if (check.rows.length > 0) {
                        await client.query('ROLLBACK');
                        return response.status(409).json({ error: 'There is already an open workday' });
                    }

                    const { rows } = await client.query(
                        'INSERT INTO workdays (date, status, opened_at, responsible_person, opening_stock) VALUES ($1, $2, NOW(), $3, $4) RETURNING *',
                        [date, 'open', responsiblePerson, JSON.stringify(openingStock)]
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

            if (action === 'close') {
                // Close current open day
                const { rows } = await pool.query(
                    `UPDATE workdays 
           SET status = 'closed', closed_at = NOW(), closing_stock = $1 
           WHERE status = 'open' 
           RETURNING *`,
                    [JSON.stringify(closingStock)]
                );

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
