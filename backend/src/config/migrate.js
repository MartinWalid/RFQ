const pool = require('./db');

const createTables = async () => {
    try {
        await pool.query(`

      DROP TABLE IF EXISTS status_log CASCADE;
      DROP TABLE IF EXISTS finance_data CASCADE;
      DROP TABLE IF EXISTS item_suppliers CASCADE;
      DROP TABLE IF EXISTS item_attachments CASCADE;
      DROP TABLE IF EXISTS request_items CASCADE;
      DROP TABLE IF EXISTS requests CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) CHECK (role IN ('sales', 'operations', 'finance', 'admin')) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reference_number VARCHAR(50) UNIQUE NOT NULL,
        created_by UUID REFERENCES users(id),
        client_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        project_title VARCHAR(255) NOT NULL,
        quotation_deadline TIMESTAMP,
        delivery_date TIMESTAMP,
        payment_terms VARCHAR(100),
        client_budget DECIMAL(12,2),
        status VARCHAR(50) DEFAULT 'pending_ops' CHECK (
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
        ),
        current_assignee UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE request_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
        item_code VARCHAR(50),
        item_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        specifications TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (
          status IN ('pending', 'done')
        ),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE item_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID REFERENCES request_items(id) ON DELETE CASCADE,
        uploaded_by UUID REFERENCES users(id),
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100),
        file_size INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE item_suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID REFERENCES request_items(id) ON DELETE CASCADE,
        filled_by UUID REFERENCES users(id),
        supplier_name VARCHAR(255) NOT NULL,
        unit_cost DECIMAL(12,2) NOT NULL,
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        net_unit_cost DECIMAL(12,2),
        payment_terms VARCHAR(100),
        production_time VARCHAR(100),
        delivery_time VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE finance_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID REFERENCES item_suppliers(id) ON DELETE CASCADE,
        filled_by UUID REFERENCES users(id),
        cog DECIMAL(12,2),
        markup_percentage DECIMAL(5,2),
        markup_amount DECIMAL(12,2),
        vat_applicable BOOLEAN DEFAULT FALSE,
        vat_percentage DECIMAL(5,2) DEFAULT 0,
        vat_amount DECIMAL(12,2) DEFAULT 0,
        supplier_discount DECIMAL(12,2) DEFAULT 0,
        total_item_price DECIMAL(12,2),
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE status_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
        changed_by UUID REFERENCES users(id),
        from_status VARCHAR(50),
        to_status VARCHAR(50),
        comment TEXT,
        changed_at TIMESTAMP DEFAULT NOW()
      );

    `);

        console.log('✅ All tables created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating tables:', err);
        process.exit(1);
    }
};

createTables();