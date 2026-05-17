const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            ['martin.walid@elevate.com.eg']
        );

        if (existing.rows.length > 0) {
            console.log('Admin already exists. Skipping.');
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(')1YpCL%-s-P6g6m9QS', salt);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
            ['Martin', 'martin.walid@elevate.com.eg', password_hash, 'admin']
        );

        console.log('Admin created successfully:');
        console.log(result.rows[0]);
        process.exit(0);

    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
};

seedAdmin();