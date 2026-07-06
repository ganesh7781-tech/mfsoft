const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Uploaded Files
const { uploadDir } = require('../config/paths');
app.use('/uploads', express.static(uploadDir));

// Routes matrix
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const membersRoutes = require('./routes/members');
const plansRoutes = require('./routes/plans');
const storeRoutes = require('./routes/store');
const settingsRoutes = require('./routes/settings');
const expensesRoutes = require('./routes/expenses');
const invoicesRoutes = require('./routes/invoices');
const enquiriesRoutes = require('./routes/enquiries');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/members', membersRoutes);
app.use('/api/v1/plans', plansRoutes);
app.use('/api/v1/store', storeRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/enquiries', enquiriesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', datetime: new Date() });
});

// Error handling
app.use(errorHandler);

module.exports = app;
