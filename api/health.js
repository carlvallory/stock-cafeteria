import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
    try {
        const { rows } = await sql`SELECT version();`;
        return response.status(200).json({ version: rows[0].version });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}
