import { pool } from "../config/db.js";

export async function updateStreak(userId) {
  const result = await pool.query(
    `SELECT current_streak, longest_streak, last_study_date
     FROM users
     WHERE id = $1`,
    [userId]
  );

  const user = result.rows[0];
  const today = new Date().toISOString().split("T")[0];

  if (!user.last_study_date) {
    await pool.query(
      `UPDATE users
       SET current_streak = 1,
           longest_streak = 1,
           last_study_date = CURRENT_DATE
       WHERE id = $1`,
      [userId]
    );
    return;
  }

  const lastDate = user.last_study_date.toISOString().split("T")[0];

  if (lastDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastDate === yesterdayStr) {
    const newStreak = user.current_streak + 1;

    await pool.query(
      `UPDATE users
       SET current_streak = $1,
           longest_streak = GREATEST(longest_streak, $1),
           last_study_date = CURRENT_DATE
       WHERE id = $2`,
      [newStreak, userId]
    );
  } else {
    await pool.query(
      `UPDATE users
       SET current_streak = 1,
           last_study_date = CURRENT_DATE
       WHERE id = $1`,
      [userId]
    );
  }
}
