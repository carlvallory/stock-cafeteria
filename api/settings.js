import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
    if (request.method === 'GET') {
        try {
            const { rows } = await sql`SELECT * FROM settings;`;
            // Convert array of {key, value} to single object for frontend convenience
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

            // Upsert
            const { rows } = await sql`
        INSERT INTO settings (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}, NOW())
        ON CONFLICT (key) 
        DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
        RETURNING *;
      `;
            return response.status(200).json(rows[0]);
        } catch (error) {
            return response.status(500).json({ error: error.message });
        }
    }

    return response.status(405).json({ error: 'Method not allowed' });
}
