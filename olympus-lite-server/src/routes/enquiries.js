const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const auth = require('../middleware/auth');

// GET /enquiries - List all enquiries (Authorized)
router.get('/', auth, async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM enquiries ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// POST /enquiries - Submit new enquiry (Public - callable by any of their websites!)
router.post('/', async (req, res, next) => {
  try {
    const { full_name, email, phone, message, source } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full Name and Phone Number are required fields.'
      });
    }

    const result = await db.query(
      `INSERT INTO enquiries (full_name, email, phone, message, source, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [full_name, email || 'No Email', phone, message || '', source || 'Website', 'New']
    );

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully!',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// PUT /enquiries/:id - Update enquiry status (Authorized)
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['New', 'Contacted', 'Converted', 'Ignored'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const check = await db.query('SELECT id FROM enquiries WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry record not found.'
      });
    }

    const result = await db.query(
      'UPDATE enquiries SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({
      success: true,
      message: 'Enquiry status updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /enquiries/:id - Delete enquiry record (Authorized)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const check = await db.query('SELECT id FROM enquiries WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry record not found.'
      });
    }

    await db.query('DELETE FROM enquiries WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Enquiry record deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
