const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const auth = require('../middleware/auth');

// GET /store/products - List all products
router.get('/products', auth, async (req, res, next) => {
  try {
    const productsRes = await db.query('SELECT * FROM products WHERE is_active = TRUE');
    res.json({ success: true, data: productsRes.rows });
  } catch (error) {
    next(error);
  }
});

// POST /store/products - Create a new product
router.post('/products', auth, async (req, res, next) => {
  try {
    const { product_name, category, cost_price, selling_price, stock_qty, low_stock_threshold } = req.body;

    if (!product_name || cost_price === undefined || selling_price === undefined || stock_qty === undefined) {
      return res.status(400).json({ success: false, message: 'Product name, cost, selling price, and stock quantity are required.' });
    }

    const result = await db.query(
      `INSERT INTO products (product_name, category, cost_price, selling_price, stock_qty, low_stock_threshold, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        product_name,
        category || 'General',
        parseFloat(cost_price),
        parseFloat(selling_price),
        parseInt(stock_qty),
        low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : 5,
        true
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Product added successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// PUT /store/products/:id - Update product details
router.put('/products/:id', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { product_name, category, cost_price, selling_price, stock_qty, low_stock_threshold, is_active } = req.body;

    const checkRes = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const current = checkRes.rows[0];

    const result = await db.query(
      `UPDATE products 
       SET product_name = $1, category = $2, cost_price = $3, selling_price = $4, 
           stock_qty = $5, low_stock_threshold = $6, is_active = $7 
       WHERE id = $8 RETURNING *`,
      [
        product_name !== undefined ? product_name : current.product_name,
        category !== undefined ? category : current.category,
        cost_price !== undefined ? parseFloat(cost_price) : parseFloat(current.cost_price),
        selling_price !== undefined ? parseFloat(selling_price) : parseFloat(current.selling_price),
        stock_qty !== undefined ? parseInt(stock_qty) : parseInt(current.stock_qty),
        low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : parseInt(current.low_stock_threshold),
        is_active !== undefined ? (is_active === true || is_active === 'true') : current.is_active,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Product updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// POST /store/checkout - Point of Sale transaction checkout
router.post('/checkout', auth, async (req, res, next) => {
  try {
    const { member_id, payment_method, amount_paid, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required for checkout.' });
    }

    // Step 1: Negative Stock Prevention validation & fetch product prices
    const productsToCheck = [];
    for (const item of items) {
      const prodRes = await db.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      if (prodRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: `Product ID ${item.product_id} not found.` });
      }

      const product = prodRes.rows[0];

      if (!product.is_active) {
        return res.status(400).json({ success: false, message: `Product '${product.product_name}' is no longer active.` });
      }

      // Check stock limit
      if (product.stock_qty < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot purchase ${item.quantity} of '${product.product_name}'. Only ${product.stock_qty} in stock.`
        });
      }

      productsToCheck.push({
        ...product,
        requestedQty: item.quantity
      });
    }

    // Fetch tax rate from settings
    const settingsRes = await db.query('SELECT tax_percentage FROM gym_profile LIMIT 1');
    const taxPercentage = settingsRes.rows[0] ? parseFloat(settingsRes.rows[0].tax_percentage) : 0;

    // Calculate invoice totals
    let subtotal = 0;
    productsToCheck.forEach(prod => {
      subtotal += prod.selling_price * prod.requestedQty;
    });

    const taxAmount = (subtotal * taxPercentage) / 100;
    const totalAmount = subtotal + taxAmount;
    const paid = amount_paid !== undefined ? parseFloat(amount_paid) : totalAmount;
    const balance = totalAmount - paid;

    let paymentStatus = 'Unpaid';
    if (paid >= totalAmount) paymentStatus = 'Fully Paid';
    else if (paid > 0) paymentStatus = 'Partially Paid';

    // Step 2: Write transaction
    // If PostgreSQL, use transaction blocks.
    if (!db.isFallback) {
      await db.query('BEGIN');
    }

    try {
      // Create unified invoice
      const invoiceRes = await db.query(
        `INSERT INTO invoices 
         (member_id, invoice_type, total_amount, tax_amount, amount_paid, balance_due, payment_method, payment_status, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          member_id ? parseInt(member_id) : null,
          'Store',
          totalAmount,
          taxAmount,
          paid,
          balance,
          payment_method || 'Cash',
          paymentStatus,
          balance > 0 ? new Date().toISOString().split('T')[0] : null
        ]
      );

      const invoiceId = invoiceRes.rows[0].id;

      // Insert invoice items & deduct inventory quantities
      for (const prod of productsToCheck) {
        const itemTotal = prod.selling_price * prod.requestedQty;
        
        // Insert item record
        await db.query(
          `INSERT INTO invoice_items 
           (invoice_id, product_id, description, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoiceId, prod.id, prod.product_name, prod.requestedQty, prod.selling_price, itemTotal]
        );

        // Deduct quantity
        await db.query(
          `UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2`,
          [prod.requestedQty, prod.id]
        );
      }

      if (!db.isFallback) {
        await db.query('COMMIT');
      }

      res.json({
        success: true,
        invoice_id: invoiceId,
        balance_due: balance,
        message: 'Transaction complete. Inventory updated.'
      });
    } catch (txError) {
      if (!db.isFallback) {
        await db.query('ROLLBACK');
      }
      throw txError;
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
