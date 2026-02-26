import { pool } from "../config/db.js";

export async function addXP(userId, amount, sourceType, sourceId = null) {
  await pool.query(
    `INSERT INTO xp_logs (user_id, xp_amount, source_type, source_id)
     VALUES ($1,$2,$3,$4)`,
    [userId, amount, sourceType, sourceId]
  );

  await pool.query(
    `UPDATE users
     SET total_xp = COALESCE(total_xp,0) + $1
     WHERE id = $2`,
    [amount, userId]
  );
}
