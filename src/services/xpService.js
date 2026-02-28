import { pool } from "../config/db.js";

export async function addXP(userId, amount, reason, referenceId = null) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update total XP
    await client.query(
      `UPDATE users
       SET total_xp = COALESCE(total_xp, 0) + $1
       WHERE id = $2`,
      [amount, userId]
    );

    // Insert XP log
    await client.query(
      `INSERT INTO xp_logs (user_id, amount, reason, reference_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, amount, reason, referenceId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
