const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read from env file if available
require('dotenv').config();

const usePostgres = (process.env.DB_HOST || process.env.DATABASE_URL) ? true : false;
let pool = null;
let fallbackDb = null;
const { dbFallbackPath } = require('./paths');
const fallbackFilePath = dbFallbackPath;

// Initialize Fallback JSON database schema
function initFallbackDb() {
  if (fs.existsSync(fallbackFilePath)) {
    try {
      fallbackDb = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      return;
    } catch (e) {
      console.error("Error reading db_fallback.json, resetting database:", e);
    }
  }

  // Default empty schema
  fallbackDb = {
    gym_profile: [{
      id: 1,
      gym_name: "MUSCLE FACTORY HUB",
      logo_url: "",
      contact_phone: "9876543210",
      address: "123 High Street, Olympus Peak",
      tax_percentage: 18.00,
      receipt_footer_text: "Thank you for training with us! Focus. Commit. Achieve."
    }],
    users: [], // Seeded on server startup if empty
    members: [],
    membership_plans: [
      { id: 1, plan_name: "1 Month Plan", duration_days: 30, plan_price: 1200.00, is_active: true },
      { id: 2, plan_name: "3 Months Plan", duration_days: 90, plan_price: 2500.00, is_active: true },
      { id: 3, plan_name: "6 Months Plan", duration_days: 180, plan_price: 3500.00, is_active: true },
      { id: 4, plan_name: "12 Months Plan", duration_days: 365, plan_price: 6000.00, is_active: true }
    ],
    membership_history: [],
    products: [
      { id: 1, product_name: "Whey Protein 1kg", category: "Supplements", cost_price: 2200.00, selling_price: 3200.00, stock_qty: 15, low_stock_threshold: 5, is_active: true },
      { id: 2, product_name: "BCAA Powder", category: "Supplements", cost_price: 1200.00, selling_price: 1800.00, stock_qty: 8, low_stock_threshold: 3, is_active: true },
      { id: 3, product_name: "Energy Drink", category: "Drinks", cost_price: 60.00, selling_price: 100.00, stock_qty: 4, low_stock_threshold: 10, is_active: true },
      { id: 4, product_name: "Gym Shaker Bottle", category: "Equipment", cost_price: 150.00, selling_price: 300.00, stock_qty: 25, low_stock_threshold: 5, is_active: true }
    ],
    invoices: [],
    invoice_items: [],
    expenses: [],
    enquiries: []
  };
  saveFallbackDb();
}

function saveFallbackDb() {
  fs.writeFileSync(fallbackFilePath, JSON.stringify(fallbackDb, null, 2), 'utf8');
}

// Set up postgres connection if configured
if (usePostgres) {
  const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
} else {
  console.log("No PostgreSQL host env defined. Bootstrapping Olympus Lite with local JSON DB fallback...");
  initFallbackDb();
}

// SQL Query Simulator for Fallback Mode
function simulateQuery(text, params = []) {
  const queryNormalized = text.replace(/\s+/g, ' ').trim();
  const lowerQuery = queryNormalized.toLowerCase();

  // Helper to replace $1, $2 placeholders with actual parameters
  const getParam = (index) => {
    // $1 corresponds to params[0]
    return params[index - 1];
  };

  // 1. SELECT * FROM users WHERE username = $1
  if (lowerQuery.includes('select') && lowerQuery.includes('from users') && lowerQuery.includes('username =')) {
    const username = getParam(1);
    const rows = fallbackDb.users.filter(u => u.username === username);
    return { rows, rowCount: rows.length };
  }

  // SELECT * FROM users
  if (lowerQuery.includes('select') && lowerQuery.includes('from users') && !lowerQuery.includes('where')) {
    return { rows: fallbackDb.users, rowCount: fallbackDb.users.length };
  }

  // 2. INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *
  if (lowerQuery.includes('insert into users')) {
    const nextId = fallbackDb.users.length ? Math.max(...fallbackDb.users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: nextId,
      username: getParam(1),
      password_hash: getParam(2),
      created_at: new Date()
    };
    fallbackDb.users.push(newUser);
    saveFallbackDb();
    return { rows: [newUser], rowCount: 1 };
  }

  // 3. SELECT * FROM gym_profile LIMIT 1 or SELECT * FROM gym_profile
  if (lowerQuery.includes('select') && lowerQuery.includes('from gym_profile')) {
    return { rows: fallbackDb.gym_profile, rowCount: fallbackDb.gym_profile.length };
  }

  // 4. INSERT INTO gym_profile or UPDATE gym_profile
  if (lowerQuery.includes('update gym_profile')) {
    // UPDATE gym_profile SET gym_name = $1, logo_url = $2, contact_phone = $3, address = $4, tax_percentage = $5, receipt_footer_text = $6 WHERE id = 1 RETURNING *
    const profile = fallbackDb.gym_profile[0] || { id: 1 };
    profile.gym_name = getParam(1);
    profile.logo_url = getParam(2);
    profile.contact_phone = getParam(3);
    profile.address = getParam(4);
    profile.tax_percentage = parseFloat(getParam(5));
    profile.receipt_footer_text = getParam(6);
    profile.updated_at = new Date();
    fallbackDb.gym_profile[0] = profile;
    saveFallbackDb();
    return { rows: [profile], rowCount: 1 };
  }

  if (lowerQuery.includes('insert into gym_profile')) {
    const profile = {
      id: 1,
      gym_name: getParam(1),
      logo_url: getParam(2),
      contact_phone: getParam(3),
      address: getParam(4),
      tax_percentage: parseFloat(getParam(5)),
      receipt_footer_text: getParam(6),
      updated_at: new Date()
    };
    fallbackDb.gym_profile = [profile];
    saveFallbackDb();
    return { rows: [profile], rowCount: 1 };
  }

  // 5. MEMBERS
  // SELECT * FROM members WHERE is_deleted = FALSE
  if (lowerQuery.includes('from members') && !lowerQuery.includes('membership_') && lowerQuery.includes('select')) {
    let rows = fallbackDb.members.filter(m => !m.is_deleted);
    
    // Check for specific filters
    // WHERE mobile_number = $1
    if (lowerQuery.includes('mobile_number =')) {
      const mobile = getParam(1);
      rows = rows.filter(m => m.mobile_number === mobile);
      return { rows, rowCount: rows.length };
    }
    // WHERE id = $1
    if (lowerQuery.includes('where id =') || lowerQuery.includes('where members.id =')) {
      const id = parseInt(getParam(1));
      rows = rows.filter(m => m.id === id);
      return { rows, rowCount: rows.length };
    }

    return { rows, rowCount: rows.length };
  }

  // INSERT INTO members
  if (lowerQuery.includes('insert into members')) {
    // INSERT INTO members (first_name, last_name, mobile_number, email, date_of_birth, address, photo_url, height_cm, weight_kg, fitness_goal, medical_notes, emergency_contact, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *
    const nextId = fallbackDb.members.length ? Math.max(...fallbackDb.members.map(m => m.id)) + 1 : 1;
    const newMember = {
      id: nextId,
      first_name: getParam(1),
      last_name: getParam(2),
      mobile_number: getParam(3),
      email: getParam(4),
      date_of_birth: getParam(5),
      address: getParam(6),
      photo_url: getParam(7),
      height_cm: getParam(8) ? parseFloat(getParam(8)) : null,
      weight_kg: getParam(9) ? parseFloat(getParam(9)) : null,
      fitness_goal: getParam(10),
      medical_notes: getParam(11),
      emergency_contact: typeof getParam(12) === 'string' ? JSON.parse(getParam(12)) : getParam(12),
      status: getParam(13) || 'Active',
      is_deleted: false,
      created_at: new Date()
    };
    fallbackDb.members.push(newMember);
    saveFallbackDb();
    return { rows: [newMember], rowCount: 1 };
  }

  // UPDATE members
  if (lowerQuery.includes('update members')) {
    // Match update by ID
    // UPDATE members SET first_name=$1, last_name=$2, mobile_number=$3, email=$4, date_of_birth=$5, address=$6, photo_url=$7, height_cm=$8, weight_kg=$9, fitness_goal=$10, medical_notes=$11, emergency_contact=$12, status=$13, is_deleted=$14 WHERE id=$15 RETURNING *
    // Check if it's a soft deletion or dynamic update
    const isSoftDelete = lowerQuery.includes('is_deleted = true') || lowerQuery.includes('is_deleted = $');
    
    // We can extract ID parameter. Usually the last parameter or second to last. Let's do general parsing.
    let memberId = null;
    if (lowerQuery.includes('where id =')) {
      // Find the ID param index. Let's look for $XX in "WHERE id = $XX"
      const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
      if (match) {
        memberId = parseInt(getParam(parseInt(match[1])));
      }
    }

    const memberIndex = fallbackDb.members.findIndex(m => m.id === memberId);
    if (memberIndex !== -1) {
      const member = fallbackDb.members[memberIndex];
      if (isSoftDelete) {
        member.is_deleted = true;
      } else {
        member.first_name = getParam(1);
        member.last_name = getParam(2);
        member.mobile_number = getParam(3);
        member.email = getParam(4);
        member.date_of_birth = getParam(5);
        member.address = getParam(6);
        member.photo_url = getParam(7);
        member.height_cm = getParam(8) ? parseFloat(getParam(8)) : null;
        member.weight_kg = getParam(9) ? parseFloat(getParam(9)) : null;
        member.fitness_goal = getParam(10);
        member.medical_notes = getParam(11);
        member.emergency_contact = typeof getParam(12) === 'string' ? JSON.parse(getParam(12)) : getParam(12);
        member.status = getParam(13);
        if (params.length >= 14 && getParam(14) !== undefined) {
          member.is_deleted = getParam(14) === true || getParam(14) === 'true';
        }
      }
      fallbackDb.members[memberIndex] = member;
      saveFallbackDb();
      return { rows: [member], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 6. MEMBERSHIP PLANS
  // SELECT * FROM membership_plans
  if (lowerQuery.includes('from membership_plans') && lowerQuery.includes('select')) {
    let rows = fallbackDb.membership_plans;
    if (lowerQuery.includes('is_active = true') || lowerQuery.includes('is_active = $1')) {
      const activeVal = lowerQuery.includes('is_active = $1') ? getParam(1) : true;
      rows = rows.filter(p => p.is_active === (activeVal === true || activeVal === 'true'));
    }
    if (lowerQuery.includes('where id =')) {
      const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
      if (match) {
        const id = parseInt(getParam(parseInt(match[1])));
        rows = rows.filter(p => p.id === id);
      }
    }
    return { rows, rowCount: rows.length };
  }

  // INSERT INTO membership_plans
  if (lowerQuery.includes('insert into membership_plans')) {
    const nextId = fallbackDb.membership_plans.length ? Math.max(...fallbackDb.membership_plans.map(p => p.id)) + 1 : 1;
    const newPlan = {
      id: nextId,
      plan_name: getParam(1),
      duration_days: parseInt(getParam(2)),
      plan_price: parseFloat(getParam(3)),
      is_active: getParam(4) !== false
    };
    fallbackDb.membership_plans.push(newPlan);
    saveFallbackDb();
    return { rows: [newPlan], rowCount: 1 };
  }

  // UPDATE membership_plans
  if (lowerQuery.includes('update membership_plans')) {
    const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
    let planId = null;
    if (match) {
      planId = parseInt(getParam(parseInt(match[1])));
    }
    const idx = fallbackDb.membership_plans.findIndex(p => p.id === planId);
    if (idx !== -1) {
      const plan = fallbackDb.membership_plans[idx];
      plan.plan_name = getParam(1);
      plan.duration_days = parseInt(getParam(2));
      plan.plan_price = parseFloat(getParam(3));
      plan.is_active = getParam(4) === true || getParam(4) === 'true';
      fallbackDb.membership_plans[idx] = plan;
      saveFallbackDb();
      return { rows: [plan], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 7. MEMBERSHIP HISTORY
  // SELECT mh.*, mp.plan_name FROM membership_history mh JOIN membership_plans mp ON mh.plan_id = mp.id WHERE mh.member_id = $1
  if (lowerQuery.includes('from membership_history') && lowerQuery.includes('select')) {
    let rows = fallbackDb.membership_history;
    if (lowerQuery.includes('member_id =')) {
      const match = lowerQuery.match(/member_id\s*=\s*\$(\d+)/);
      if (match) {
        const memberId = parseInt(getParam(parseInt(match[1])));
        rows = rows.filter(h => h.member_id === memberId);
      }
    }
    // Attach plan_name
    const rowsWithPlans = rows.map(h => {
      const plan = fallbackDb.membership_plans.find(p => p.id === h.plan_id) || {};
      return {
        ...h,
        plan_name: plan.plan_name || 'Custom Plan'
      };
    });
    // Sort by created_at desc
    rowsWithPlans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows: rowsWithPlans, rowCount: rowsWithPlans.length };
  }

  // INSERT INTO membership_history
  if (lowerQuery.includes('insert into membership_history')) {
    // INSERT INTO membership_history (member_id, plan_id, joining_date, expiry_date, purchase_price) VALUES ($1, $2, $3, $4, $5) RETURNING *
    const nextId = fallbackDb.membership_history.length ? Math.max(...fallbackDb.membership_history.map(h => h.id)) + 1 : 1;
    const newHistory = {
      id: nextId,
      member_id: parseInt(getParam(1)),
      plan_id: getParam(2) ? parseInt(getParam(2)) : null,
      joining_date: getParam(3),
      expiry_date: getParam(4),
      purchase_price: parseFloat(getParam(5)),
      created_at: new Date()
    };
    fallbackDb.membership_history.push(newHistory);
    saveFallbackDb();
    return { rows: [newHistory], rowCount: 1 };
  }

  // 8. PRODUCTS
  // SELECT * FROM products
  if (lowerQuery.includes('from products') && lowerQuery.includes('select')) {
    let rows = fallbackDb.products;
    if (lowerQuery.includes('is_active = true') || lowerQuery.includes('is_active = $1')) {
      const activeVal = lowerQuery.includes('is_active = $1') ? getParam(1) : true;
      rows = rows.filter(p => p.is_active === (activeVal === true || activeVal === 'true'));
    }
    if (lowerQuery.includes('where id =')) {
      const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
      if (match) {
        const id = parseInt(getParam(parseInt(match[1])));
        rows = rows.filter(p => p.id === id);
      }
    }
    return { rows, rowCount: rows.length };
  }

  // INSERT INTO products
  if (lowerQuery.includes('insert into products')) {
    // (product_name, category, cost_price, selling_price, stock_qty, low_stock_threshold, is_active)
    const nextId = fallbackDb.products.length ? Math.max(...fallbackDb.products.map(p => p.id)) + 1 : 1;
    const newProduct = {
      id: nextId,
      product_name: getParam(1),
      category: getParam(2),
      cost_price: parseFloat(getParam(3)),
      selling_price: parseFloat(getParam(4)),
      stock_qty: parseInt(getParam(5)),
      low_stock_threshold: parseInt(getParam(6) || 5),
      is_active: getParam(7) !== false
    };
    fallbackDb.products.push(newProduct);
    saveFallbackDb();
    return { rows: [newProduct], rowCount: 1 };
  }

  // UPDATE products (including decrementing stock)
  if (lowerQuery.includes('update products')) {
    // Check if it's stock decrement: UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2
    if (lowerQuery.includes('stock_qty = stock_qty -')) {
      const decrement = parseInt(getParam(1));
      const id = parseInt(getParam(2));
      const idx = fallbackDb.products.findIndex(p => p.id === id);
      if (idx !== -1) {
        fallbackDb.products[idx].stock_qty = Math.max(0, fallbackDb.products[idx].stock_qty - decrement);
        saveFallbackDb();
        return { rows: [fallbackDb.products[idx]], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // Standard update: UPDATE products SET product_name=$1, category=$2, cost_price=$3, selling_price=$4, stock_qty=$5, low_stock_threshold=$6, is_active=$7 WHERE id=$8
    const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
    let id = null;
    if (match) {
      id = parseInt(getParam(parseInt(match[1])));
    }
    const idx = fallbackDb.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      const prod = fallbackDb.products[idx];
      prod.product_name = getParam(1);
      prod.category = getParam(2);
      prod.cost_price = parseFloat(getParam(3));
      prod.selling_price = parseFloat(getParam(4));
      prod.stock_qty = parseInt(getParam(5));
      prod.low_stock_threshold = parseInt(getParam(6));
      prod.is_active = getParam(7) === true || getParam(7) === 'true';
      fallbackDb.products[idx] = prod;
      saveFallbackDb();
      return { rows: [prod], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // UPDATE invoices
  if (lowerQuery.includes('update invoices')) {
    // UPDATE invoices SET amount_paid = $1, balance_due = $2, payment_status = $3, payment_method = $4, payment_history = $5 WHERE id = $6
    const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
    let id = null;
    if (match) {
      id = parseInt(getParam(parseInt(match[1])));
    }
    const idx = fallbackDb.invoices.findIndex(i => i.id === id);
    if (idx !== -1) {
      const inv = fallbackDb.invoices[idx];
      inv.amount_paid = parseFloat(getParam(1));
      inv.balance_due = parseFloat(getParam(2));
      inv.payment_status = getParam(3);
      inv.payment_method = getParam(4);
      if (lowerQuery.includes('payment_history =')) {
        const histVal = getParam(5);
        inv.payment_history = typeof histVal === 'string' ? JSON.parse(histVal) : histVal;
      }
      fallbackDb.invoices[idx] = inv;
      saveFallbackDb();
      return { rows: [inv], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 9. INVOICES
  // SELECT * FROM invoices
  if (lowerQuery.includes('from invoices') && lowerQuery.includes('select')) {
    let rows = fallbackDb.invoices;
    if (lowerQuery.includes('where id =')) {
      const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
      if (match) {
        const idVal = parseInt(getParam(parseInt(match[1])));
        rows = rows.filter(inv => inv.id === idVal);
      }
    }
    if (lowerQuery.includes('member_id =')) {
      const match = lowerQuery.match(/member_id\s*=\s*\$(\d+)/);
      if (match) {
        const memberId = parseInt(getParam(parseInt(match[1])));
        rows = rows.filter(inv => inv.member_id === memberId);
      }
    }
    // JOIN members or filter
    const rowsWithMembers = rows.map(inv => {
      const member = fallbackDb.members.find(m => m.id === inv.member_id) || {};
      return {
        ...inv,
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        mobile_number: member.mobile_number || ''
      };
    });
    // Sort by created_at desc
    rowsWithMembers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows: rowsWithMembers, rowCount: rowsWithMembers.length };
  }

  // INSERT INTO invoices
  if (lowerQuery.includes('insert into invoices')) {
    // (member_id, invoice_type, total_amount, tax_amount, amount_paid, balance_due, payment_method, payment_status, due_date)
    const nextId = fallbackDb.invoices.length ? Math.max(...fallbackDb.invoices.map(i => i.id)) + 1 : 1;
    const newInvoice = {
      id: nextId,
      member_id: getParam(1) ? parseInt(getParam(1)) : null,
      invoice_type: getParam(2),
      total_amount: parseFloat(getParam(3)),
      tax_amount: parseFloat(getParam(4) || 0.00),
      amount_paid: parseFloat(getParam(5)),
      balance_due: parseFloat(getParam(6)),
      payment_method: getParam(7),
      payment_status: getParam(8),
      due_date: getParam(9),
      created_at: new Date()
    };
    fallbackDb.invoices.push(newInvoice);
    saveFallbackDb();
    return { rows: [newInvoice], rowCount: 1 };
  }

  // 10. INVOICE ITEMS
  // SELECT * FROM invoice_items WHERE invoice_id = $1
  if (lowerQuery.includes('from invoice_items') && lowerQuery.includes('select')) {
    let rows = fallbackDb.invoice_items;
    if (lowerQuery.includes('invoice_id =')) {
      const match = lowerQuery.match(/invoice_id\s*=\s*\$(\d+)/);
      if (match) {
        const invoiceId = parseInt(getParam(parseInt(match[1])));
        rows = rows.filter(item => item.invoice_id === invoiceId);
      }
    }
    return { rows, rowCount: rows.length };
  }

  // INSERT INTO invoice_items
  if (lowerQuery.includes('insert into invoice_items')) {
    // (invoice_id, product_id, description, quantity, unit_price, total_price)
    const nextId = fallbackDb.invoice_items.length ? Math.max(...fallbackDb.invoice_items.map(ii => ii.id)) + 1 : 1;
    const newItem = {
      id: nextId,
      invoice_id: parseInt(getParam(1)),
      product_id: getParam(2) ? parseInt(getParam(2)) : null,
      description: getParam(3),
      quantity: parseInt(getParam(4)),
      unit_price: parseFloat(getParam(5)),
      total_price: parseFloat(getParam(6)),
      created_at: new Date()
    };
    fallbackDb.invoice_items.push(newItem);
    saveFallbackDb();
    return { rows: [newItem], rowCount: 1 };
  }

  // 11. EXPENSES
  // SELECT * FROM expenses
  if (lowerQuery.includes('from expenses') && lowerQuery.includes('select')) {
    const rows = fallbackDb.expenses || [];
    // Sort by expense_date descending
    const sortedRows = [...rows].sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
    return { rows: sortedRows, rowCount: sortedRows.length };
  }

  // INSERT INTO expenses
  if (lowerQuery.includes('insert into expenses')) {
    // INSERT INTO expenses (title, amount, category, expense_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *
    const expensesList = fallbackDb.expenses || [];
    const nextId = expensesList.length ? Math.max(...expensesList.map(e => e.id)) + 1 : 1;
    const newExpense = {
      id: nextId,
      title: getParam(1),
      amount: parseFloat(getParam(2) || 0),
      category: getParam(3),
      expense_date: getParam(4),
      notes: getParam(5),
      created_at: new Date()
    };
    if (!fallbackDb.expenses) fallbackDb.expenses = [];
    fallbackDb.expenses.push(newExpense);
    saveFallbackDb();
    return { rows: [newExpense], rowCount: 1 };
  }

  // DELETE FROM expenses
  if (lowerQuery.includes('delete from expenses')) {
    const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
    let expenseId = null;
    if (match) {
      expenseId = parseInt(getParam(parseInt(match[1])));
    }
    const expensesList = fallbackDb.expenses || [];
    const idx = expensesList.findIndex(e => e.id === expenseId);
    if (idx !== -1) {
      fallbackDb.expenses.splice(idx, 1);
      saveFallbackDb();
      return { rowCount: 1 };
    }
    return { rowCount: 0 };
  }

  // DELETE FROM invoices
  if (lowerQuery.includes('delete from invoices')) {
    const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
    let invoiceId = null;
    if (match) {
      invoiceId = parseInt(getParam(parseInt(match[1])));
    }
    const idx = fallbackDb.invoices.findIndex(i => i.id === invoiceId);
    if (idx !== -1) {
      fallbackDb.invoices.splice(idx, 1);
      // Cascading delete invoice items
      fallbackDb.invoice_items = (fallbackDb.invoice_items || []).filter(item => item.invoice_id !== invoiceId);
      saveFallbackDb();
      return { rowCount: 1 };
    }
    return { rowCount: 0 };
  }

  // 10. WEBSITE ENQUIRIES
  // SELECT * FROM enquiries
  if (lowerQuery.includes('select') && lowerQuery.includes('from enquiries')) {
    const list = fallbackDb.enquiries || [];
    // If it queries single item e.g. WHERE id = $1
    if (lowerQuery.includes('where id =')) {
      const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
      if (match) {
        const id = parseInt(getParam(parseInt(match[1])));
        const filtered = list.filter(e => e.id === id);
        return { rows: filtered, rowCount: filtered.length };
      }
    }
    // Default: Sort by created_at descending
    const sorted = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows: sorted, rowCount: sorted.length };
  }

  // INSERT INTO enquiries
  if (lowerQuery.includes('insert into enquiries')) {
    // INSERT INTO enquiries (full_name, email, phone, message, source, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    const list = fallbackDb.enquiries || [];
    const nextId = list.length ? Math.max(...list.map(e => e.id)) + 1 : 1;
    const newEnquiry = {
      id: nextId,
      full_name: getParam(1),
      email: getParam(2),
      phone: getParam(3),
      message: getParam(4),
      source: getParam(5) || 'Website',
      status: getParam(6) || 'New',
      created_at: new Date()
    };
    if (!fallbackDb.enquiries) fallbackDb.enquiries = [];
    fallbackDb.enquiries.push(newEnquiry);
    saveFallbackDb();
    return { rows: [newEnquiry], rowCount: 1 };
  }

  // UPDATE enquiries
  if (lowerQuery.includes('update enquiries')) {
    // UPDATE enquiries SET status = $1 WHERE id = $2 RETURNING *
    let enquiryId = null;
    const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
    if (match) {
      enquiryId = parseInt(getParam(parseInt(match[1])));
    }
    const list = fallbackDb.enquiries || [];
    const idx = list.findIndex(e => e.id === enquiryId);
    if (idx !== -1) {
      const item = list[idx];
      item.status = getParam(1);
      saveFallbackDb();
      return { rows: [item], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // DELETE FROM enquiries
  if (lowerQuery.includes('delete from enquiries')) {
    const match = lowerQuery.match(/where id\s*=\s*\$(\d+)/);
    let enquiryId = null;
    if (match) {
      enquiryId = parseInt(getParam(parseInt(match[1])));
    }
    const list = fallbackDb.enquiries || [];
    const idx = list.findIndex(e => e.id === enquiryId);
    if (idx !== -1) {
      list.splice(idx, 1);
      saveFallbackDb();
      return { rowCount: 1 };
    }
    return { rowCount: 0 };
  }

  console.warn("UNHANDLED SIMULATED QUERY:", queryNormalized, "PARAMS:", params);
  return { rows: [], rowCount: 0 };
}

// Unified client connection handler
const query = (text, params) => {
  if (usePostgres && pool) {
    return pool.query(text, params);
  } else {
    return Promise.resolve(simulateQuery(text, params));
  }
};

module.exports = {
  query,
  isFallback: !usePostgres,
  getRawData: () => fallbackDb,
  setRawData: (data) => {
    fallbackDb = data;
    saveFallbackDb();
  }
};
