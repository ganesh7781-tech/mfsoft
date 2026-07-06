const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const auth = require('../middleware/auth');

// GET /expenses - Get all expenses
router.get('/', auth, async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM expenses ORDER BY expense_date DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// POST /expenses - Create new expense record
router.post('/', auth, async (req, res, next) => {
  try {
    const { title, amount, category, expense_date, notes } = req.body;

    if (!title || !amount || !expense_date) {
      return res.status(400).json({
        success: false,
        message: 'Title, amount, and expense date are required fields.'
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number.'
      });
    }

    const result = await db.query(
      `INSERT INTO expenses (title, amount, category, expense_date, notes) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, parsedAmount, category || 'Other', expense_date, notes || '']
    );

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /expenses/:id - Delete an expense record
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID.'
      });
    }

    const result = await db.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.json({
      success: true,
      message: 'Expense record deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
