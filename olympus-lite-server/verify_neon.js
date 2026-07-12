require('dotenv').config();
const { Client } = require('pg');

async function checkNeon() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log("Connected to Neon successfully!");

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables in DB:", tables.rows.map(r => r.table_name));

    const users = await client.query("SELECT * FROM users");
    console.log("Users in DB:", users.rows);

    const plans = await client.query("SELECT * FROM membership_plans");
    console.log("Plans in DB:", plans.rows);

  } catch (err) {
    console.error("Failed to connect or query Neon:", err);
  } finally {
    await client.end();
  }
}

checkNeon();
