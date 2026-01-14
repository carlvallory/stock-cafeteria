import { Pool } from '@neondatabase/serverless';

// Singleton pattern for Serverless
let pool;

export default function getPool() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is missing");
        }
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }
    return pool;
}
