const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const auth = require('../middleware/auth');

router.get('/summary', auth, async (req, res, next) => {
  try {
    // Fetch settings to check tax percentage if needed
    const settingsRes = await db.query('SELECT * FROM gym_profile LIMIT 1');
    const settings = settingsRes.rows[0] || {};
    
    // Fetch all members
    const membersRes = await db.query('SELECT * FROM members WHERE is_deleted = FALSE');
    const members = membersRes.rows;
    
    // Fetch all membership histories
    const historyRes = await db.query('SELECT * FROM membership_history');
    const history = historyRes.rows;
    
    // Fetch all invoices
    const invoicesRes = await db.query('SELECT * FROM invoices');
    const invoices = invoicesRes.rows;

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    
    // Calculate Active / Expired members
    let activeCount = 0;
    let expiredCount = 0;
    const expiringSoonList = [];
    
    members.forEach(member => {
      // Find history for this member
      const memberHistory = history.filter(h => h.member_id === member.id);
      
      if (memberHistory.length === 0) {
        expiredCount++; // No plan assigned
        return;
      }
      
      // Check if there is any active plan for today
      const hasActivePlan = memberHistory.some(h => {
        const joinDate = new Date(h.joining_date);
        const expDate = new Date(h.expiry_date);
        return joinDate <= today && expDate >= today;
      });
      
      if (hasActivePlan) {
        activeCount++;
        
        // Check if expiring in next 7 days
        // Get the latest expiry date among active plans
        const activeExpiries = memberHistory
          .filter(h => {
            const joinDate = new Date(h.joining_date);
            const expDate = new Date(h.expiry_date);
            return joinDate <= today && expDate >= today;
          })
          .map(h => new Date(h.expiry_date));
          
        const maxExpiry = new Date(Math.max(...activeExpiries));
        const diffTime = maxExpiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays <= 7) {
          expiringSoonList.push({
            id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            mobile_number: member.mobile_number,
            expiry_date: maxExpiry.toISOString().split('T')[0],
            days_left: diffDays
          });
        }
      } else {
        expiredCount++;
      }
    });

    // Sort expiring soon by expiry date ascending
    expiringSoonList.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

    // Revenue calculations
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    let todayRevenue = 0;
    let monthlyRevenue = 0;
    let pendingPayments = 0;
    
    let storeSalesToday = 0;
    let storeSalesMonth = 0;
    let membershipSalesToday = 0;
    let membershipSalesMonth = 0;

    invoices.forEach(inv => {
      const invDate = new Date(inv.created_at);
      
      // Revenue is the amount paid
      const amountPaid = parseFloat(inv.amount_paid) || 0;
      const balanceDue = parseFloat(inv.balance_due) || 0;
      
      // Today revenue check (00:00:00 to 23:59:59)
      if (invDate >= todayStart && invDate <= todayEnd) {
        todayRevenue += amountPaid;
        if (inv.invoice_type === 'Store') {
          storeSalesToday += amountPaid;
        } else {
          membershipSalesToday += amountPaid;
        }
      }
      
      // Monthly revenue check (current calendar month)
      if (invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth) {
        monthlyRevenue += amountPaid;
        if (inv.invoice_type === 'Store') {
          storeSalesMonth += amountPaid;
        } else {
          membershipSalesMonth += amountPaid;
        }
      }
      
      // Pending payments check: total balance_due across active or unpaid/partially-paid invoices where current date >= due_date
      if (balanceDue > 0) {
        const dueDate = inv.due_date ? new Date(inv.due_date) : null;
        if (!dueDate || today >= dueDate) {
          pendingPayments += balanceDue;
        }
      }
    });

    // Provide 7 days of daily revenue history for charts
    const salesChartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayStart = new Date(d);
      dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23,59,59,999);
      
      let amount = 0;
      invoices.forEach(inv => {
        const invDate = new Date(inv.created_at);
        if (invDate >= dayStart && invDate <= dayEnd) {
          amount += parseFloat(inv.amount_paid) || 0;
        }
      });
      
      salesChartData.push({
        date: dateStr,
        revenue: amount
      });
    }

    res.json({
      success: true,
      metrics: {
        total_members: members.length,
        active_members: activeCount,
        expired_members: expiredCount,
        today_revenue: todayRevenue,
        monthly_revenue: monthlyRevenue,
        pending_payments: pendingPayments
      },
      expiring_soon: expiringSoonList,
      store_sales_summary: {
        today: storeSalesToday,
        month: storeSalesMonth
      },
      membership_sales_summary: {
        today: membershipSalesToday,
        month: membershipSalesMonth
      },
      chart_data: salesChartData
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
