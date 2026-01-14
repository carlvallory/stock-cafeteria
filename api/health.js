export default async function handler(request, response) {
    try {
        // 1. Check Env Var availability BEFORE importing DB
        // This prevents crash if 'new Pool()' throws synchronously due to missing config
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return response.status(500).json({
                status: 'error',
                message: 'DATABASE_URL environment variable is MISSING',
                tip: 'Please add DATABASE_URL in Vercel Settings'
            });
        }

        // 2. Dynamic Import (Lazy Load)
        // This catches errors if the package itself is missing or corrupt
        let pool;
        try {
            const dbModule = await import('./db.js');
            pool = dbModule.default;
        } catch (e) {
            return response.status(500).json({
                status: 'error',
                message: 'Failed to load Database Module (import error)',
                error: e.message,
                stack: e.stack
            });
        }

        // 3. Test Connection
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as now, current_database() as db_name');
        client.release();

        return response.status(200).json({
            status: 'ok',
            message: 'Database Connected Successfully! 🚀',
            time: result.rows[0].now,
            database: result.rows[0].db_name,
            params_test: dbUrl.substring(0, 15) + '...' // Show snippet to prove it exists
        });

    } catch (error) {
        return response.status(500).json({
            status: 'error',
            message: 'Database Connection Failed ❌',
            error_detail: error.message,
            stack: error.stack
        });
    }
}
