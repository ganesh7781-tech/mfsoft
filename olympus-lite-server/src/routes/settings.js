const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { uploadDir } = require('../../config/paths');
const { isFirebaseConfigured, uploadToFirebase } = require('../../config/firebase');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// GET /settings - Fetch gym profile config
router.get('/', auth, async (req, res, next) => {
  try {
    const profileRes = await db.query('SELECT * FROM gym_profile LIMIT 1');
    res.json({ success: true, data: profileRes.rows[0] || {} });
  } catch (error) {
    next(error);
  }
});

// PUT /settings - Save settings details
router.put('/', auth, upload.single('logo'), async (req, res, next) => {
  try {
    const { gym_name, contact_phone, address, tax_percentage, receipt_footer_text } = req.body;

    if (!gym_name || !contact_phone) {
      return res.status(400).json({ success: false, message: 'Gym name and contact number are required.' });
    }

    // Check if there is an existing record
    const checkRes = await db.query('SELECT id, logo_url FROM gym_profile LIMIT 1');
    const existing = checkRes.rows[0];

    let logo_url = existing ? existing.logo_url : '';
    if (req.file) {
      if (isFirebaseConfigured) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          logo_url = await uploadToFirebase(fileBuffer, req.file.filename, req.file.mimetype);
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error("Firebase logo upload failed, falling back to local file:", err);
          logo_url = `/uploads/${req.file.filename}`;
        }
      } else {
        logo_url = `/uploads/${req.file.filename}`;
      }
    }

    let result;
    if (existing) {
      // Update
      const updateSql = `
        UPDATE gym_profile 
        SET gym_name = $1, logo_url = $2, contact_phone = $3, address = $4, 
            tax_percentage = $5, receipt_footer_text = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 RETURNING *
      `;
      result = await db.query(updateSql, [
        gym_name,
        logo_url,
        contact_phone,
        address || '',
        parseFloat(tax_percentage || 0),
        receipt_footer_text || '',
        existing.id
      ]);
    } else {
      // Insert
      const insertSql = `
        INSERT INTO gym_profile 
        (gym_name, logo_url, contact_phone, address, tax_percentage, receipt_footer_text)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `;
      result = await db.query(insertSql, [
        gym_name,
        logo_url,
        contact_phone,
        address || '',
        parseFloat(tax_percentage || 0),
        receipt_footer_text || ''
      ]);
    }

    res.json({
      success: true,
      message: 'Gym profile updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// GET /settings/backup - System backup export (generates downloadable JSON of database state)
router.get('/backup', auth, async (req, res, next) => {
  try {
    let backupData = {};

    if (db.isFallback) {
      backupData = db.getRawData();
    } else {
      // Fetch table-by-table from PostgreSQL
      const tables = [
        'gym_profile',
        'users',
        'members',
        'membership_plans',
        'products',
        'membership_history',
        'invoices',
        'invoice_items'
      ];

      for (const table of tables) {
        const queryRes = await db.query(`SELECT * FROM ${table}`);
        backupData[table] = queryRes.rows;
      }
    }

    res.setHeader('Content-disposition', `attachment; filename=olympus_lite_backup_${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(backupData, null, 2), 'utf-8');
    res.end();
  } catch (error) {
    next(error);
  }
});

// POST /settings/restore - Upload file backup and replace state
router.post('/restore', auth, upload.single('backup_file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Backup file is required.' });
    }

    const filepath = req.file.path;
    const backupContent = fs.readFileSync(filepath, 'utf8');
    fs.unlinkSync(filepath); // Clean up temp uploaded file

    let backupData;
    try {
      backupData = JSON.parse(backupContent);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid file format. Backup must be a valid JSON file.' });
    }

    // Basic structure verification
    const requiredTables = ['gym_profile', 'members', 'membership_plans', 'products'];
    const missing = requiredTables.filter(t => !backupData[t]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Restore aborted: File is missing required database tables: ${missing.join(', ')}.`
      });
    }

    if (db.isFallback) {
      // Restore fallback data directly
      db.setRawData(backupData);
    } else {
      // PostgreSQL Restore: Truncate tables and repopulate them sequentially inside transaction
      await db.query('BEGIN');
      try {
        // Truncate tables in reverse dependency order
        await db.query('TRUNCATE TABLE invoice_items, invoices, membership_history, products, membership_plans, members, users, gym_profile CASCADE');

        // Repopulate in dependency order
        // 1. Gym Profile
        if (backupData.gym_profile && backupData.gym_profile.length > 0) {
          for (const row of backupData.gym_profile) {
            await db.query(
              `INSERT INTO gym_profile (id, gym_name, logo_url, contact_phone, address, tax_percentage, receipt_footer_text, updated_at) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [row.id, row.gym_name, row.logo_url, row.contact_phone, row.address, row.tax_percentage, row.receipt_footer_text, row.updated_at]
            );
          }
        }

        // 2. Users
        if (backupData.users && backupData.users.length > 0) {
          for (const row of backupData.users) {
            await db.query(
              `INSERT INTO users (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4)`,
              [row.id, row.username, row.password_hash, row.created_at]
            );
          }
        }

        // 3. Members
        if (backupData.members && backupData.members.length > 0) {
          for (const row of backupData.members) {
            await db.query(
              `INSERT INTO members (id, first_name, last_name, mobile_number, email, date_of_birth, address, photo_url, height_cm, weight_kg, fitness_goal, medical_notes, emergency_contact, status, is_deleted, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
              [row.id, row.first_name, row.last_name, row.mobile_number, row.email, row.date_of_birth, row.address, row.photo_url, row.height_cm, row.weight_kg, row.fitness_goal, row.medical_notes, typeof row.emergency_contact === 'object' ? JSON.stringify(row.emergency_contact) : row.emergency_contact, row.status, row.is_deleted, row.created_at]
            );
          }
        }

        // 4. Membership Plans
        if (backupData.membership_plans && backupData.membership_plans.length > 0) {
          for (const row of backupData.membership_plans) {
            await db.query(
              `INSERT INTO membership_plans (id, plan_name, duration_days, plan_price, is_active) VALUES ($1, $2, $3, $4, $5)`,
              [row.id, row.plan_name, row.duration_days, row.plan_price, row.is_active]
            );
          }
        }

        // 5. Products
        if (backupData.products && backupData.products.length > 0) {
          for (const row of backupData.products) {
            await db.query(
              `INSERT INTO products (id, product_name, category, cost_price, selling_price, stock_qty, low_stock_threshold, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [row.id, row.product_name, row.category, row.cost_price, row.selling_price, row.stock_qty, row.low_stock_threshold, row.is_active]
            );
          }
        }

        // 6. Membership History
        if (backupData.membership_history && backupData.membership_history.length > 0) {
          for (const row of backupData.membership_history) {
            await db.query(
              `INSERT INTO membership_history (id, member_id, plan_id, joining_date, expiry_date, purchase_price, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [row.id, row.member_id, row.plan_id, row.joining_date, row.expiry_date, row.purchase_price, row.created_at]
            );
          }
        }

        // 7. Invoices
        if (backupData.invoices && backupData.invoices.length > 0) {
          for (const row of backupData.invoices) {
            await db.query(
              `INSERT INTO invoices (id, member_id, invoice_type, total_amount, tax_amount, amount_paid, balance_due, payment_method, payment_status, due_date, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [row.id, row.member_id, row.invoice_type, row.total_amount, row.tax_amount, row.amount_paid, row.balance_due, row.payment_method, row.payment_status, row.due_date, row.created_at]
            );
          }
        }

        // 8. Invoice Items
        if (backupData.invoice_items && backupData.invoice_items.length > 0) {
          for (const row of backupData.invoice_items) {
            await db.query(
              `INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, unit_price, total_price)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [row.id, row.invoice_id, row.product_id, row.description, row.quantity, row.unit_price, row.total_price]
            );
          }
        }

        // Update SERIAL primary keys sequences
        const sequences = [
          'gym_profile_id_seq',
          'users_id_seq',
          'members_id_seq',
          'membership_plans_id_seq',
          'products_id_seq',
          'membership_history_id_seq',
          'invoices_id_seq',
          'invoice_items_id_seq'
        ];
        
        for (const seq of sequences) {
          const tableName = seq.replace('_id_seq', '');
          await db.query(`SELECT setval('${seq}', COALESCE((SELECT MAX(id)+1 FROM ${tableName}), 1), false)`);
        }

        await db.query('COMMIT');
      } catch (txErr) {
        await db.query('ROLLBACK');
        throw txErr;
      }
    }

    res.json({ success: true, message: 'Database state restored successfully.' });
  } catch (error) {
    next(error);
  }
});

// GET /settings/invoices/:id - Retrieve invoice details and itemization
router.get('/invoices/:id', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    // Fetch invoice details
    const invRes = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const invoice = invRes.rows[0];

    // Fetch member details
    let firstName = '';
    let lastName = '';
    let mobileNumber = '';

    if (invoice.member_id) {
      const memberRes = await db.query('SELECT first_name, last_name, mobile_number FROM members WHERE id = $1', [invoice.member_id]);
      if (memberRes.rows.length > 0) {
        firstName = memberRes.rows[0].first_name;
        lastName = memberRes.rows[0].last_name;
        mobileNumber = memberRes.rows[0].mobile_number;
      }
    }

    const invoiceWithMember = {
      ...invoice,
      first_name: firstName,
      last_name: lastName,
      mobile_number: mobileNumber
    };

    // Fetch invoice items
    const itemsRes = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);

    res.json({
      success: true,
      invoice: invoiceWithMember,
      items: itemsRes.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
