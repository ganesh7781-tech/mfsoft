const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const auth = require('../middleware/auth');

// GET /plans - Fetch all active plans
router.get('/', auth, async (req, res, next) => {
  try {
    const plansRes = await db.query('SELECT * FROM membership_plans WHERE is_active = TRUE');
    res.json({ success: true, data: plansRes.rows });
  } catch (error) {
    next(error);
  }
});

// POST /plans - Create a plan (Predefined or Custom Engine)
router.post('/', auth, async (req, res, next) => {
  try {
    const { plan_name, duration_days, plan_price } = req.body;

    if (!plan_name || !duration_days || plan_price === undefined) {
      return res.status(400).json({ success: false, message: 'Plan name, duration (days), and price are required.' });
    }

    const price = parseFloat(plan_price);
    const duration = parseInt(duration_days);

    if (duration <= 0 || price < 0) {
      return res.status(400).json({ success: false, message: 'Duration must be positive, and price cannot be negative.' });
    }

    const result = await db.query(
      'INSERT INTO membership_plans (plan_name, duration_days, plan_price, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [plan_name, duration, price, true]
    );

    res.status(201).json({
      success: true,
      message: 'Plan created successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// PUT /plans/:id - Update or deactivate plan
router.put('/:id', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { plan_name, duration_days, plan_price, is_active } = req.body;

    const checkRes = await db.query('SELECT * FROM membership_plans WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found.' });
    }

    const updatedPlan = {
      plan_name: plan_name !== undefined ? plan_name : checkRes.rows[0].plan_name,
      duration_days: duration_days !== undefined ? parseInt(duration_days) : checkRes.rows[0].duration_days,
      plan_price: plan_price !== undefined ? parseFloat(plan_price) : parseFloat(checkRes.rows[0].plan_price),
      is_active: is_active !== undefined ? (is_active === true || is_active === 'true') : checkRes.rows[0].is_active
    };

    const result = await db.query(
      'UPDATE membership_plans SET plan_name = $1, duration_days = $2, plan_price = $3, is_active = $4 WHERE id = $5 RETURNING *',
      [updatedPlan.plan_name, updatedPlan.duration_days, updatedPlan.plan_price, updatedPlan.is_active, id]
    );

    res.json({
      success: true,
      message: 'Plan updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
