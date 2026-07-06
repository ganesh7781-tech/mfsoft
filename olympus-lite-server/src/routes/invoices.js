const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const auth = require('../middleware/auth');

// GET /invoices - List all billing transactions and receipts
router.get('/', auth, async (req, res, next) => {
  try {
    const invoicesRes = await db.query('SELECT * FROM invoices ORDER BY id DESC');
    const invoices = invoicesRes.rows;

    // Fetch members to attach names
    const membersRes = await db.query('SELECT id, first_name, last_name, mobile_number FROM members');
    const members = membersRes.rows;

    const formattedInvoices = invoices.map(inv => {
      const member = inv.member_id ? members.find(m => m.id === inv.member_id) : null;
      return {
        ...inv,
        member_name: member ? `${member.first_name} ${member.last_name}` : 'Walk-in Customer',
        member_mobile: member ? member.mobile_number : 'N/A'
      };
    });

    res.json({ success: true, data: formattedInvoices });
  } catch (error) {
    next(error);
  }
});

// POST /invoices/:id/pay - Record a payment towards pending dues
router.post('/:id/pay', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount_paid, payment_method } = req.body;
    const paymentAmt = parseFloat(amount_paid);

    if (isNaN(paymentAmt) || paymentAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
    }

    // Fetch invoice
    const invRes = await db.query('SELECT * FROM invoices WHERE id = $1', [parseInt(id)]);
    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    const invoice = invRes.rows[0];

    const currentBalance = parseFloat(invoice.balance_due || 0);
    if (currentBalance <= 0) {
      return res.status(400).json({ success: false, message: 'This invoice has no pending dues.' });
    }

    if (paymentAmt > currentBalance) {
      return res.status(400).json({ success: false, message: `Payment amount cannot exceed the pending balance of ₹${currentBalance}.` });
    }

    const newPaid = parseFloat(invoice.amount_paid || 0) + paymentAmt;
    const newBalance = currentBalance - paymentAmt;
    const newStatus = newBalance === 0 ? 'Fully Paid' : 'Partially Paid';

    // Parse or build payment history list
    let history = [];
    if (invoice.payment_history) {
      try {
        history = typeof invoice.payment_history === 'string'
          ? JSON.parse(invoice.payment_history)
          : invoice.payment_history;
      } catch (e) {
        history = [];
      }
    }

    // If history is currently empty, backport the initial payment record first
    if (history.length === 0) {
      const initialAmt = parseFloat(invoice.amount_paid || 0);
      if (initialAmt > 0) {
        history.push({
          amount: initialAmt,
          date: invoice.created_at,
          method: invoice.payment_method || 'Cash',
          note: 'Initial Payment'
        });
      }
    }

    // Append this installment payment record
    history.push({
      amount: paymentAmt,
      date: new Date().toISOString(),
      method: payment_method || 'Cash',
      note: 'Dues Payment'
    });

    const historyStr = JSON.stringify(history);

    // Update invoice
    await db.query(
      'UPDATE invoices SET amount_paid = $1, balance_due = $2, payment_status = $3, payment_method = $4, payment_history = $5 WHERE id = $6',
      [newPaid, newBalance, newStatus, payment_method || invoice.payment_method, historyStr, parseInt(id)]
    );

    res.json({ success: true, message: 'Payment recorded successfully.' });
  } catch (error) {
    next(error);
  }
});

// DELETE /invoices/:id - Delete an invoice receipt
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM invoices WHERE id = $1', [parseInt(id)]);
    res.json({ success: true, message: 'Receipt record deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
