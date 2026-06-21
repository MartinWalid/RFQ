const pool = require('./db');

// Idempotent migration: widen the requests.status CHECK constraint to include
// 'pending_approval' (approval gate) and 'cancelled' (Cancel Request action)
// without dropping/recreating tables. Run with: node src/config/alterStatusConstraint.js
const run = async () => {
    try {
        await pool.query(`
            ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check;
            ALTER TABLE requests ADD CONSTRAINT requests_status_check CHECK (
                status IN (
                    'draft',
                    'pending_ops',
                    'pending_finance',
                    'pending_approval',
                    'approved',
                    'revision',
                    'rejected',
                    'cancelled'
                )
            );
        `);

        console.log('✅ requests.status constraint updated (added pending_approval, cancelled).');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to update status constraint:', err);
        process.exit(1);
    }
};

run();
