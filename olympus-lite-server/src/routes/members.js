const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isFirebaseConfigured, uploadToFirebase } = require('../../config/firebase');

// Set up photo upload storage (local fallback)
const { uploadDir } = require('../../config/paths');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, webp) are allowed'));
  }
});

// GET /members - List and search members
router.get('/', auth, async (req, res, next) => {
  try {
    const search = req.query.q || '';
    
    // Fetch all non-deleted members
    const membersRes = await db.query('SELECT * FROM members WHERE is_deleted = FALSE');
    let members = membersRes.rows;
    
    if (search) {
      const searchLower = search.toLowerCase();
      members = members.filter(m => 
        m.first_name.toLowerCase().includes(searchLower) ||
        m.last_name.toLowerCase().includes(searchLower) ||
        m.mobile_number.includes(searchLower)
      );
    }

    // Attach active plan info to each member
    const historyRes = await db.query('SELECT * FROM membership_history');
    const plansRes = await db.query('SELECT * FROM membership_plans');
    const invoicesRes = await db.query('SELECT * FROM invoices');
    const histories = historyRes.rows;
    const plans = plansRes.rows;
    const invoices = invoicesRes.rows;

    const today = new Date();
    today.setHours(0,0,0,0);

    const membersWithPlan = members.map(member => {
      const mHistory = histories.filter(h => h.member_id === member.id);
      
      // Find active plan if any
      const activeHist = mHistory.find(h => {
        const join = new Date(h.joining_date);
        const exp = new Date(h.expiry_date);
        return join <= today && exp >= today;
      });

      // Find latest plan expiry
      let latestExpiry = null;
      let latestJoining = null;
      let currentPlanName = 'No Plan';
      
      if (mHistory.length > 0) {
        // Sort by expiry_date descending
        mHistory.sort((a, b) => new Date(b.expiry_date) - new Date(a.expiry_date));
        latestExpiry = mHistory[0].expiry_date;
        latestJoining = mHistory[0].joining_date;
        const plan = plans.find(p => p.id === mHistory[0].plan_id);
        currentPlanName = plan ? plan.plan_name : 'Custom Plan';
      }

      // Compute dynamic status
      const isActive = activeHist ? true : false;
      const computedStatus = mHistory.length === 0 ? 'Unassigned' : (isActive ? 'Active' : 'Expired');

      // Calculate balance due
      const mInvoices = invoices.filter(inv => inv.member_id === member.id);
      const totalBalanceDue = mInvoices.reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0);

      return {
        ...member,
        status: computedStatus,
        current_plan: currentPlanName,
        joining_date: latestJoining,
        expiry_date: latestExpiry,
        balance_due: totalBalanceDue,
        has_pending_payment: totalBalanceDue > 0
      };
    });

    res.json({ success: true, data: membersWithPlan });
  } catch (error) {
    next(error);
  }
});

// GET /members/:id - Detail view
router.get('/:id', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const memberRes = await db.query('SELECT * FROM members WHERE id = $1 AND is_deleted = FALSE', [id]);
    
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    const member = memberRes.rows[0];
    
    // Fetch membership history
    const historyRes = await db.query(
      'SELECT mh.*, mp.plan_name FROM membership_history mh LEFT JOIN membership_plans mp ON mh.plan_id = mp.id WHERE mh.member_id = $1',
      [id]
    );

    // Fetch invoices
    const invoicesRes = await db.query('SELECT * FROM invoices WHERE member_id = $1', [id]);
    
    res.json({
      success: true,
      data: {
        ...member,
        history: historyRes.rows,
        invoices: invoicesRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /members - Add Member & Initial Plan configuration
router.post('/', auth, upload.single('photo'), async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      mobile_number,
      email,
      date_of_birth,
      address,
      height_cm,
      weight_kg,
      fitness_goal,
      medical_notes,
      emergency_contact,
      plan_id,
      joining_date,
      amount_paid,
      payment_method
    } = req.body;

    if (!first_name || !last_name || !mobile_number) {
      return res.status(400).json({ success: false, message: 'First name, last name, and 10-digit mobile number are required.' });
    }

    // Verify format of mobile (usually 10 digits)
    if (!/^\d{10,15}$/.test(mobile_number)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10 to 15 digit number.' });
    }

    // Check for duplicate mobile
    const duplicateCheck = await db.query('SELECT id FROM members WHERE mobile_number = $1 AND is_deleted = FALSE', [mobile_number]);
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A member with this mobile number already exists.',
        duplicate: true
      });
    }

    // File path for photo
    let photo_url = '';
    if (req.file) {
      if (isFirebaseConfigured) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          photo_url = await uploadToFirebase(fileBuffer, req.file.filename, req.file.mimetype);
          fs.unlinkSync(req.file.path); // remove local temp file
        } catch (err) {
          console.error("Firebase multer file upload failed, falling back to local file:", err);
          photo_url = `/uploads/${req.file.filename}`;
        }
      } else {
        photo_url = `/uploads/${req.file.filename}`;
      }
    } else if (req.body.photo_data_url) {
      // Base64 webcam capture
      const base64Data = req.body.photo_data_url.replace(/^data:image\/\w+;base64,/, "");
      const filename = `webcam-${Date.now()}.png`;

      if (isFirebaseConfigured) {
        try {
          const buffer = Buffer.from(base64Data, 'base64');
          photo_url = await uploadToFirebase(buffer, filename, 'image/png');
        } catch (err) {
          console.error("Firebase webcam base64 upload failed, falling back to local file:", err);
          const filepath = path.join(uploadDir, filename);
          fs.writeFileSync(filepath, base64Data, 'base64');
          photo_url = `/uploads/${filename}`;
        }
      } else {
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, base64Data, 'base64');
        photo_url = `/uploads/${filename}`;
      }
    }

    // Parse emergency contact if stringified
    let parsedEmergency = emergency_contact;
    if (typeof emergency_contact === 'string') {
      try {
        parsedEmergency = JSON.parse(emergency_contact);
      } catch (e) {
        parsedEmergency = null;
      }
    }

    // Insert Member
    const insertMemberSql = `
      INSERT INTO members 
      (first_name, last_name, mobile_number, email, date_of_birth, address, photo_url, height_cm, weight_kg, fitness_goal, medical_notes, emergency_contact, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const params = [
      first_name,
      last_name,
      mobile_number,
      email || null,
      date_of_birth || null,
      address || null,
      photo_url || null,
      height_cm ? parseFloat(height_cm) : null,
      weight_kg ? parseFloat(weight_kg) : null,
      fitness_goal || null,
      medical_notes || null,
      parsedEmergency ? JSON.stringify(parsedEmergency) : null,
      'Active'
    ];

    const result = await db.query(insertMemberSql, params);
    const newMember = result.rows[0];

    let invoiceId = null;

    // Check if initial plan should be set up
    if (plan_id) {
      const planRes = await db.query('SELECT * FROM membership_plans WHERE id = $1', [parseInt(plan_id)]);
      if (planRes.rows.length > 0) {
        const plan = planRes.rows[0];
        const duration = parseInt(plan.duration_days);
        const price = parseFloat(plan.plan_price);

        const jDate = (joining_date && !isNaN(Date.parse(joining_date))) ? new Date(joining_date) : new Date();
        const expDate = new Date(jDate);
        expDate.setDate(expDate.getDate() + duration);

        const jDateStr = jDate.toISOString().split('T')[0];
        const expDateStr = expDate.toISOString().split('T')[0];

        // Insert into history
        await db.query(
          'INSERT INTO membership_history (member_id, plan_id, joining_date, expiry_date, purchase_price) VALUES ($1, $2, $3, $4, $5)',
          [newMember.id, plan.id, jDateStr, expDateStr, price]
        );

        // Calculate Tax from Settings
        const settingsRes = await db.query('SELECT tax_percentage FROM gym_profile LIMIT 1');
        const taxPercentage = settingsRes.rows[0] ? parseFloat(settingsRes.rows[0].tax_percentage) : 0;
        
        const subtotal = price;
        const taxAmount = (subtotal * taxPercentage) / 100;
        const totalAmount = subtotal + taxAmount;

        const paid = amount_paid ? parseFloat(amount_paid) : 0;
        const balance = totalAmount - paid;

        let paymentStatus = 'Unpaid';
        if (paid >= totalAmount) paymentStatus = 'Fully Paid';
        else if (paid > 0) paymentStatus = 'Partially Paid';

        const dueDateStr = balance > 0 ? expDateStr : null;

        // Create Invoice
        const invoiceRes = await db.query(
          `INSERT INTO invoices 
           (member_id, invoice_type, total_amount, tax_amount, amount_paid, balance_due, payment_method, payment_status, due_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [newMember.id, 'Membership', totalAmount, taxAmount, paid, balance, payment_method || 'Cash', paymentStatus, dueDateStr]
        );

        invoiceId = invoiceRes.rows[0].id;

        // Create Invoice Item
        await db.query(
          `INSERT INTO invoice_items 
           (invoice_id, product_id, description, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoiceId, null, `Membership Plan: ${plan.plan_name} (${duration} Days)`, 1, subtotal, subtotal]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Member registered successfully.',
      data: {
        member_id: newMember.id,
        status: newMember.status,
        invoice_id: invoiceId
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /members/:id - Update member details
router.put('/:id', auth, upload.single('photo'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if member exists
    const checkRes = await db.query('SELECT * FROM members WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    const currentMember = checkRes.rows[0];

    const {
      first_name,
      last_name,
      mobile_number,
      email,
      date_of_birth,
      address,
      height_cm,
      weight_kg,
      fitness_goal,
      medical_notes,
      emergency_contact,
      status
    } = req.body;

    if (!first_name || !last_name || !mobile_number) {
      return res.status(400).json({ success: false, message: 'First name, last name, and mobile number are required.' });
    }

    // Check duplicate mobile if mobile number is changing
    if (mobile_number !== currentMember.mobile_number) {
      const duplicateCheck = await db.query('SELECT id FROM members WHERE mobile_number = $1 AND is_deleted = FALSE', [mobile_number]);
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'A member with this mobile number already exists.' });
      }
    }

    // Photo selection logic
    let photo_url = currentMember.photo_url;
    if (req.file) {
      if (isFirebaseConfigured) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          photo_url = await uploadToFirebase(fileBuffer, req.file.filename, req.file.mimetype);
          fs.unlinkSync(req.file.path); // remove local temp file
        } catch (err) {
          console.error("Firebase multer file upload failed on update, falling back to local file:", err);
          photo_url = `/uploads/${req.file.filename}`;
        }
      } else {
        photo_url = `/uploads/${req.file.filename}`;
      }
    } else if (req.body.photo_data_url) {
      const base64Data = req.body.photo_data_url.replace(/^data:image\/\w+;base64,/, "");
      const filename = `webcam-${Date.now()}.png`;

      if (isFirebaseConfigured) {
        try {
          const buffer = Buffer.from(base64Data, 'base64');
          photo_url = await uploadToFirebase(buffer, filename, 'image/png');
        } catch (err) {
          console.error("Firebase webcam base64 upload failed on update, falling back to local file:", err);
          const filepath = path.join(uploadDir, filename);
          fs.writeFileSync(filepath, base64Data, 'base64');
          photo_url = `/uploads/${filename}`;
        }
      } else {
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, base64Data, 'base64');
        photo_url = `/uploads/${filename}`;
      }
    }

    let parsedEmergency = emergency_contact;
    if (typeof emergency_contact === 'string') {
      try {
        parsedEmergency = JSON.parse(emergency_contact);
      } catch (e) {
        parsedEmergency = null;
      }
    }

    // Update members table
    const updateSql = `
      UPDATE members 
      SET first_name = $1, last_name = $2, mobile_number = $3, email = $4, date_of_birth = $5,
          address = $6, photo_url = $7, height_cm = $8, weight_kg = $9, fitness_goal = $10,
          medical_notes = $11, emergency_contact = $12, status = $13
      WHERE id = $14
      RETURNING *
    `;
    const params = [
      first_name,
      last_name,
      mobile_number,
      email || null,
      date_of_birth || null,
      address || null,
      photo_url,
      height_cm ? parseFloat(height_cm) : null,
      weight_kg ? parseFloat(weight_kg) : null,
      fitness_goal || null,
      medical_notes || null,
      parsedEmergency ? JSON.stringify(parsedEmergency) : null,
      status || currentMember.status,
      id
    ];

    const result = await db.query(updateSql, params);
    
    res.json({
      success: true,
      message: 'Member updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// POST /members/:id/renew - Renew plan
router.post('/:id/renew', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { plan_id, joining_date, amount_paid, payment_method } = req.body;

    if (!plan_id) {
      return res.status(400).json({ success: false, message: 'Plan ID is required for renewal.' });
    }

    // Check if member exists
    const memberRes = await db.query('SELECT * FROM members WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const planRes = await db.query('SELECT * FROM membership_plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const plan = planRes.rows[0];
    const duration = parseInt(plan.duration_days);
    const price = parseFloat(plan.plan_price);

    // Renewal Engine Expiry Rule:
    // "It automatically sets the new start date to Previous Expiry + 1 Day if renewed early."
    // Fetch all history for this member to check for active/future plans
    const historyRes = await db.query('SELECT * FROM membership_history WHERE member_id = $1', [id]);
    const history = historyRes.rows;

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    let calculatedJoinDate = (joining_date && !isNaN(Date.parse(joining_date))) ? new Date(joining_date) : new Date();

    if (history.length > 0) {
      // Find the latest expiry date in the future
      const futureExpiries = history
        .map(h => new Date(h.expiry_date))
        .filter(exp => exp >= today);

      if (futureExpiries.length > 0) {
        const latestFutureExpiry = new Date(Math.max(...futureExpiries));
        // Set new joining date to Previous Expiry + 1 Day
        calculatedJoinDate = new Date(latestFutureExpiry);
        calculatedJoinDate.setDate(calculatedJoinDate.getDate() + 1);
      }
    }

    const calculatedExpiryDate = new Date(calculatedJoinDate);
    calculatedExpiryDate.setDate(calculatedExpiryDate.getDate() + duration);

    const joinDateStr = calculatedJoinDate.toISOString().split('T')[0];
    const expiryDateStr = calculatedExpiryDate.toISOString().split('T')[0];

    // Insert history
    await db.query(
      'INSERT INTO membership_history (member_id, plan_id, joining_date, expiry_date, purchase_price) VALUES ($1, $2, $3, $4, $5)',
      [id, plan.id, joinDateStr, expiryDateStr, price]
    );

    // Calculate Tax & Totals
    const settingsRes = await db.query('SELECT tax_percentage FROM gym_profile LIMIT 1');
    const taxPercentage = settingsRes.rows[0] ? parseFloat(settingsRes.rows[0].tax_percentage) : 0;
    
    const subtotal = price;
    const taxAmount = (subtotal * taxPercentage) / 100;
    const totalAmount = subtotal + taxAmount;

    const paid = amount_paid ? parseFloat(amount_paid) : 0;
    const balance = totalAmount - paid;

    let paymentStatus = 'Unpaid';
    if (paid >= totalAmount) paymentStatus = 'Fully Paid';
    else if (paid > 0) paymentStatus = 'Partially Paid';

    const dueDateStr = balance > 0 ? expiryDateStr : null;

    // Create Invoice
    const invoiceRes = await db.query(
      `INSERT INTO invoices 
       (member_id, invoice_type, total_amount, tax_amount, amount_paid, balance_due, payment_method, payment_status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [id, 'Membership', totalAmount, taxAmount, paid, balance, payment_method || 'Cash', paymentStatus, dueDateStr]
    );

    const invoiceId = invoiceRes.rows[0].id;

    // Create Invoice Item
    await db.query(
      `INSERT INTO invoice_items 
       (invoice_id, product_id, description, quantity, unit_price, total_price)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [invoiceId, null, `Membership Renewal: ${plan.plan_name} (${duration} Days)`, 1, subtotal, subtotal]
    );

    // Update status to Active
    await db.query("UPDATE members SET status = 'Active' WHERE id = $1", [id]);

    res.json({
      success: true,
      message: 'Membership renewed successfully. Invoice generated.',
      invoice_id: invoiceId
    });
  } catch (error) {
    next(error);
  }
});

// GET /members/:id/invoices/latest - Get latest invoice for print
router.get('/:id/invoices/latest', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const invoiceRes = await db.query(
      'SELECT id FROM invoices WHERE member_id = $1 ORDER BY id DESC LIMIT 1',
      [id]
    );
    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No invoice generated yet for this member.' });
    }
    res.json({
      success: true,
      invoice_id: invoiceRes.rows[0].id
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /members/:id - Soft Delete member
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const checkRes = await db.query('SELECT * FROM members WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Update is_deleted flag (soft delete)
    await db.query('UPDATE members SET is_deleted = TRUE WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Member deleted successfully (soft-deleted).'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
