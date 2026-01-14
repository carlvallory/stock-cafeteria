import { Pool } from '@neondatabase/serverless';

// Cache the pool connection in memory (outside the handler)
let pool;

export default function getPool() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error("❌ DATABASE_URL is missing in environment variables!");
            throw new Error("DATABASE_URL is missing");
        }
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }
    return pool;
}
