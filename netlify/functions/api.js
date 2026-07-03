// Netlify Serverless Function - wraps Express app
const serverless = require('serverless-http');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Initialize DB before loading app
const db = require('../../olympus-lite-server/config/db');

let initialized = false;

async function initializeDatabase() {
  if (initialized) return;
  initialized = true;

  try {
    // Create all tables if they don't exist (PostgreSQL)
    if (!db.isFallback) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS gym_profile (
          id SERIAL PRIMARY KEY,
          gym_name VARCHAR(200) NOT NULL DEFAULT 'MUSCLE FACTORY HUB',
          logo_url TEXT,
          contact_phone VARCHAR(20),
          address TEXT,
          tax_percentage NUMERIC(5,2) DEFAULT 0.00,
          receipt_footer_text TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS membership_plans (
          id SERIAL PRIMARY KEY,
          plan_name VARCHAR(200) NOT NULL,
          duration_days INTEGER NOT NULL,
          plan_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS members (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          mobile_number VARCHAR(20) NOT NULL UNIQUE,
          email VARCHAR(200),
          date_of_birth DATE,
          address TEXT,
          photo_url TEXT,
          height_cm NUMERIC(5,2),
          weight_kg NUMERIC(5,2),
          fitness_goal VARCHAR(200),
          medical_notes TEXT,
          emergency_contact JSONB,
          status VARCHAR(50) DEFAULT 'Unassigned',
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS membership_history (
          id SERIAL PRIMARY KEY,
          member_id INTEGER REFERENCES members(id),
          plan_id INTEGER REFERENCES membership_plans(id),
          joining_date DATE NOT NULL,
          expiry_date DATE NOT NULL,
          purchase_price NUMERIC(10,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          product_name VARCHAR(200) NOT NULL,
          category VARCHAR(100),
          cost_price NUMERIC(10,2) DEFAULT 0.00,
          selling_price NUMERIC(10,2) DEFAULT 0.00,
          stock_qty INTEGER DEFAULT 0,
          low_stock_threshold INTEGER DEFAULT 5,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id SERIAL PRIMARY KEY,
          member_id INTEGER REFERENCES members(id),
          invoice_type VARCHAR(100) DEFAULT 'Membership',
          total_amount NUMERIC(10,2) DEFAULT 0.00,
          tax_amount NUMERIC(10,2) DEFAULT 0.00,
          amount_paid NUMERIC(10,2) DEFAULT 0.00,
          balance_due NUMERIC(10,2) DEFAULT 0.00,
          payment_method VARCHAR(100) DEFAULT 'Cash',
          payment_status VARCHAR(100) DEFAULT 'Unpaid',
          due_date DATE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id SERIAL PRIMARY KEY,
          invoice_id INTEGER REFERENCES invoices(id),
          product_id INTEGER REFERENCES products(id),
          description TEXT,
          quantity INTEGER DEFAULT 1,
          unit_price NUMERIC(10,2) DEFAULT 0.00,
          total_price NUMERIC(10,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Seed gym profile
      const gymProfile = await db.query('SELECT id FROM gym_profile LIMIT 1');
      if (gymProfile.rows.length === 0) {
        await db.query(
          `INSERT INTO gym_profile (gym_name, contact_phone, address, tax_percentage, receipt_footer_text)
           VALUES ($1, $2, $3, $4, $5)`,
          ['MUSCLE FACTORY HUB', '9876543210', '123 Peak Avenue, Mount Olympus', 18.00, 'Thank you for training with us! Focus. Commit. Achieve.']
        );
      }

      // Seed admin user
      const users = await db.query('SELECT id FROM users LIMIT 1');
      if (users.rows.length === 0) {
        const hashedPassword = await bcrypt.hash('olympus123', 10);
        await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', ['admin', hashedPassword]);
        console.log('Admin user seeded: admin / olympus123');
      }

      // Seed plans
      const plans = await db.query('SELECT id FROM membership_plans LIMIT 1');
      if (plans.rows.length === 0) {
        await db.query(`INSERT INTO membership_plans (plan_name, duration_days, plan_price) VALUES 
          ('1 Month Plan', 30, 1200.00),
          ('3 Months Plan', 90, 2500.00),
          ('6 Months Plan', 180, 3500.00),
          ('12 Months Plan', 365, 6000.00)`);
        console.log('Default plans seeded.');
      }

      // Seed products
      const products = await db.query('SELECT id FROM products LIMIT 1');
      if (products.rows.length === 0) {
        await db.query(`INSERT INTO products (product_name, category, cost_price, selling_price, stock_qty, low_stock_threshold) VALUES 
          ('Whey Protein 1kg', 'Supplements', 2200.00, 3200.00, 15, 5),
          ('BCAA Powder', 'Supplements', 1200.00, 1800.00, 8, 3),
          ('Energy Drink', 'Drinks', 60.00, 100.00, 4, 10),
          ('Gym Shaker Bottle', 'Equipment', 150.00, 300.00, 25, 5)`);
        console.log('Default products seeded.');
      }
    }
  } catch (err) {
    console.error('DB init error in Netlify function:', err.message);
  }
}

const app = require('../../olympus-lite-server/src/app');
const serverlessHandler = serverless(app);

module.exports.handler = async (event, context) => {
  // Keep connection alive across warm Lambda invocations
  context.callbackWaitsForEmptyEventLoop = false;

  // Initialize DB tables & seed on first cold start
  await initializeDatabase();

  return serverlessHandler(event, context);
};
