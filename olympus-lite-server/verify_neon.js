const { Client } = require('pg');

async function checkNeon() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_9aRe2OpVlGTj@ep-steep-snow-at6igpwx.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"
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
