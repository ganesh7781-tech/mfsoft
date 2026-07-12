const app = require('./src/app');
const db = require('./config/db');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 5000;

// PostgreSQL Table Initialization SQL script
const ddlSql = `
  -- 1. GYM SETTINGS TABLE (Single-Row Configuration)
  CREATE TABLE IF NOT EXISTS gym_profile (
      id SERIAL PRIMARY KEY,
      gym_name VARCHAR(255) NOT NULL,
      logo_url TEXT,
      contact_phone VARCHAR(15) NOT NULL,
      address TEXT,
      tax_percentage NUMERIC(5,2) DEFAULT 0.00,
      receipt_footer_text TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 2. USERS TABLE for owner logins
  CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 3. CORE MEMBERS TABLE
  CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      mobile_number VARCHAR(15) UNIQUE NOT NULL,
      email VARCHAR(255),
      date_of_birth DATE,
      address TEXT,
      photo_url TEXT,
      height_cm NUMERIC(5,2),
      weight_kg NUMERIC(5,2),
      fitness_goal VARCHAR(100),
      medical_notes TEXT,
      emergency_contact JSONB, -- {name, relation, phone}
      status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Expired'
      is_deleted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 4. MEMBERSHIP PLANS MATRIX
  CREATE TABLE IF NOT EXISTS membership_plans (
      id SERIAL PRIMARY KEY,
      plan_name VARCHAR(100) NOT NULL,
      duration_days INT NOT NULL,
      plan_price NUMERIC(12,2) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE
  );

  -- 5. ACTIVE & HISTORICAL MEMBER PLANS ASSIGNMENTS
  CREATE TABLE IF NOT EXISTS membership_history (
      id SERIAL PRIMARY KEY,
      member_id INT REFERENCES members(id) ON DELETE CASCADE,
      plan_id INT REFERENCES membership_plans(id),
      joining_date DATE NOT NULL,
      expiry_date DATE NOT NULL,
      purchase_price NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 6. RETAIL PRODUCT INVENTORY
  CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      product_name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      cost_price NUMERIC(12,2) NOT NULL,
      selling_price NUMERIC(12,2) NOT NULL,
      stock_qty INT NOT NULL DEFAULT 0,
      low_stock_threshold INT DEFAULT 5,
      is_active BOOLEAN DEFAULT TRUE
  );

  -- 7. UNIFIED BILLING LEDGER INVOICES
  CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      member_id INT REFERENCES members(id) ON DELETE SET NULL,
      invoice_type VARCHAR(50) NOT NULL, -- 'Membership', 'Store'
      total_amount NUMERIC(12,2) NOT NULL,
      tax_amount NUMERIC(12,2) DEFAULT 0.00,
      amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
      balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
      payment_method VARCHAR(30), -- 'Cash', 'UPI', 'Card'
      payment_status VARCHAR(30) NOT NULL, -- 'Fully Paid', 'Partially Paid', 'Unpaid'
      due_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 8. ITEMIZATION SUB-LEDGER
  CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INT REFERENCES products(id), -- Nullable if membership item
      description TEXT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_price NUMERIC(12,2) NOT NULL,
      total_price NUMERIC(12,2) NOT NULL
  );

  -- 9. EXPENSE REGISTER TABLE
  CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      category VARCHAR(100),
      expense_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 10. WEBSITE ENQUIRIES TABLE
  CREATE TABLE IF NOT EXISTS enquiries (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(15) NOT NULL,
      message TEXT,
      source VARCHAR(100) DEFAULT 'Website',
      status VARCHAR(50) DEFAULT 'New', -- 'New', 'Contacted', 'Converted', 'Ignored'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 10. INDICES
  CREATE INDEX IF NOT EXISTS idx_members_mobile ON members(mobile_number) WHERE is_deleted = FALSE;
  CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
  CREATE INDEX IF NOT EXISTS idx_history_dates ON membership_history(joining_date, expiry_date);
  CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
`;

async function bootstrap() {
  try {
    // 1. If PostgreSQL mode is active, run the migrations script
    if (!db.isFallback) {
      console.log('Running PostgreSQL Schema Check...');
      await db.query(ddlSql);
      console.log('PostgreSQL Tables verified.');
    }

    // 2. Verify settings seeded
    const settings = await db.query('SELECT id FROM gym_profile LIMIT 1');
    if (settings.rows.length === 0) {
      console.log('Seeding initial gym settings profile...');
      await db.query(
        `INSERT INTO gym_profile (gym_name, contact_phone, address, tax_percentage, receipt_footer_text)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          "MUSCLE FACTORY HUB",
          "9876543210",
          "123 Peak Avenue, Mount Olympus",
          18.00,
          "Thank you for training with us! Focus. Commit. Achieve."
        ]
      );
    }

    // 3. Verify admin seeded
    const users = await db.query('SELECT id FROM users LIMIT 1');
    if (users.rows.length === 0) {
      console.log('Seeding default administrator credentials...');
      const hashedPassword = await bcrypt.hash('MUSCLE@108', 10);
      await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', ['musclefactoryhub', hashedPassword]);
      console.log('Admin user seeded: musclefactoryhub / MUSCLE@108');
    }

    // 4. In PostgreSQL mode, verify plans seeded
    if (!db.isFallback) {
      const plans = await db.query('SELECT id FROM membership_plans LIMIT 1');
      if (plans.rows.length === 0) {
        console.log('Seeding default membership plans...');
        await db.query(`INSERT INTO membership_plans (plan_name, duration_days, plan_price) VALUES 
          ('1 Month Plan', 30, 1200.00),
          ('3 Months Plan', 90, 2500.00),
          ('6 Months Plan', 180, 3500.00),
          ('12 Months Plan', 365, 6000.00)`);
      }

      const products = await db.query('SELECT id FROM products LIMIT 1');
      if (products.rows.length === 0) {
        console.log('Seeding default products...');
        await db.query(`INSERT INTO products (product_name, category, cost_price, selling_price, stock_qty, low_stock_threshold) VALUES 
          ('Whey Protein 1kg', 'Supplements', 2200.00, 3200.00, 15, 5),
          ('BCAA Powder', 'Supplements', 1200.00, 1800.00, 8, 3),
          ('Energy Drink', 'Drinks', 60.00, 100.00, 4, 10),
          ('Gym Shaker Bottle', 'Equipment', 150.00, 300.00, 25, 5)`);
      }
    }

    // 5. Start Listener
    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`  OLYMPUS LITE backend running on port ${PORT}   `);
      console.log(`  Mode: ${db.isFallback ? 'Fallback (JSON File)' : 'Active (PostgreSQL)'}`);
      console.log(`=================================================`);
    });
  } catch (error) {
    console.error('Initialization error during server bootstrap:', error);
    process.exit(1);
  }
}

bootstrap();
