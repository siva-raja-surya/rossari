const db = require("../db");

const initDb = async () => {
  try {
    // Create Schema
    await db.query(`CREATE SCHEMA IF NOT EXISTS rossari;`);

    // Set search path for this connection
    await db.query(`SET search_path TO rossari;`);

    // OTP Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        email VARCHAR(255) PRIMARY KEY,
        otp_code VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Admins Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        email VARCHAR(255) PRIMARY KEY
      );
    `);

    // Insert a default admin for testing if table is empty
    const adminCheck = await db.query(`SELECT * FROM admins LIMIT 1`);
    if (adminCheck.rows.length === 0) {
      await db.query(`INSERT INTO admins (email) VALUES ('admin@rossari.com')`);
      console.log("Default admin created: admin@rossari.com");
    }

    // Sequence for Ref ID
    await db.query(`CREATE SEQUENCE IF NOT EXISTS form_ref_seq START 1;`);

    // Submissions Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ref_id VARCHAR(20) UNIQUE DEFAULT ('RO' || lpad(nextval('form_ref_seq')::text, 10, '0')),
        user_email VARCHAR(255) NOT NULL,
        invoice_type VARCHAR(255),
        customer_name VARCHAR(255),
        form_data JSONB NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 1. Entities
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_entities (
        code VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );
    `);

    // 2. Divisions
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_divisions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50),
        entity_code VARCHAR(50),
        name VARCHAR(255) NOT NULL
      );
    `);

    // 3. Bank Accounts
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_bank_accounts (
        gl_code VARCHAR(50) PRIMARY KEY,
        bank_name VARCHAR(255) NOT NULL,
        entity_code VARCHAR(50)
      );
    `);

    // 4. Credit Control Areas
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_credit_control_areas (
        code VARCHAR(50) PRIMARY KEY,
        description VARCHAR(255)
      );
    `);

    // 5. Profit Centers
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_profit_centers (
        code VARCHAR(50),
        entity_code VARCHAR(50),
        name VARCHAR(255), 
        PRIMARY KEY (code, entity_code)
      );
    `);

    // 6. Customers
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_customers (
        account_number VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );
    `);

    // --- Seed Master Data ---
    const entityCheck = await db.query("SELECT 1 FROM master_entities LIMIT 1");
    if (entityCheck.rows.length === 0) {
      console.log("Seeding master data...");

      // Entities
      await db.query(`
        INSERT INTO master_entities (code, name) VALUES 
        ('1000', 'Rossari Biotech Limited'),
        ('2000', 'Buzil')
      `);

      // Divisions
      await db.query(`
        INSERT INTO master_divisions (code, name, entity_code) VALUES 
        ('16', 'Institutional Non-Ch', '1000'),
        ('17', 'Phenoxy Series', '1000'),
        ('11', 'Silicones', '2000'),
        ('20', 'Textile Commodity', '2000'),
        ('16', 'Phenoxy Series', '2000')
      `);

      // Bank Accounts
      await db.query(`
        INSERT INTO master_bank_accounts (gl_code, bank_name, entity_code) VALUES 
        ('21001101', 'HDFC', '1000'),
        ('21002021', 'HDFC CC R', '2000'),
        ('21002030', 'HSBC', '2000'),
        ('21002080', 'AXIS', '2000')
      `);

      // Credit Control Areas
      await db.query(`
        INSERT INTO master_credit_control_areas (code, description) VALUES 
        ('1010', 'Textile Chemical CCA'),
        ('1011', 'Textile Non-Chemicals CCA'),
        ('1012', 'Private Label CCA'),
        ('1013', 'HPPC CCA'),
        ('1014', 'Performance Additives CCA'),
        ('1016', 'Institutional CCA'),
        ('1017', 'Phenoxy CCA'),
        ('1020', 'Commodity CCA')
      `);

      // Profit Centers
      await db.query(`
        INSERT INTO master_profit_centers (code, name, entity_code) VALUES 
        ('127000', 'Amazon Bhiwandi WH 2', '1000'),
        ('128000', 'Amazon Pune WH', '1000'),
        ('190000', 'RBL R&D powai', '1000'),
        ('191000', 'RBL R&D Dahej', '1000'),
        ('192000', 'RBL R&D Silvas', '1000'),
        ('200000', 'BRPL Head Office Mumbai', '2000'),
        ('210000', 'BRPL Bhiwandi MFG', '2000')
      `);
      console.log("Master data seeded.");
    }

    // Seed Customers
    const customerCheck = await db.query(
      "SELECT 1 FROM master_customers LIMIT 1"
    );
    if (customerCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO master_customers (account_number, name) VALUES 
        ('20000107', 'Rajesh Petrochem'),
        ('20000109', 'RBI chemicals'),
        ('20000140', 'AR Pvt Ltd')
      `);
      console.log("Customer data seeded.");
    }

    console.log("Database schema initialized successfully.");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
};

module.exports = initDb;
