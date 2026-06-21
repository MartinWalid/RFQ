const pool = require('./db');

// Idempotent migration: add the contact_person column to requests without
// dropping/recreating tables. Run with: node src/config/alterContactPerson.js
const run = async () => {
    try {
        await pool.query(
            `ALTER TABLE requests ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);`
        );

        console.log('✅ requests.contact_person column ensured.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to add contact_person column:', err);
        process.exit(1);
    }
};

run();
