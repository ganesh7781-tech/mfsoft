const db = require('./config/db');

async function test() {
  try {
    const q1 = await db.query('SELECT * FROM membership_plans WHERE is_active = TRUE');
    console.log("membership_plans query returned:", q1.rows.length, "rows");
    if (q1.rows.length > 0) {
      console.log("First row keys:", Object.keys(q1.rows[0]));
      console.log("First row name/first_name:", q1.rows[0].plan_name || q1.rows[0].first_name);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
