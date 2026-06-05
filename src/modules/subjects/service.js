import { pool } from "../../config/db.js";

export async function createSubject(
  userId,
  name,
  color,
  icon
) {
  const result = await pool.query(
    `
      INSERT INTO subjects
      (user_id,name,color,icon)

      VALUES ($1,$2,$3,$4)

      RETURNING *
    `,
    [
      userId,
      name,
      color || "#8B5CF6",
      icon || "BookOpen"
    ]
  );

  return result.rows[0];
}

export async function getSubjects(userId) {
  const result = await pool.query(
    `
      SELECT *
      FROM subjects
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function updateSubject(
  userId,
  subjectId,
  name,
  color,
  icon
) {
  const result = await pool.query(
    `
      UPDATE subjects

      SET
      name = COALESCE($3,name),
      color = COALESCE($4,color),
      icon = COALESCE($5,icon)

      WHERE id = $1
      AND user_id = $2

      RETURNING *
    `,
    [
      subjectId,
      userId,
      name,
      color,
      icon
    ]
  );

  return result.rows[0];
}

export async function deleteSubject(
  userId,
  subjectId
) {
  await pool.query(
    `
      DELETE FROM subjects
      WHERE id = $1
      AND user_id = $2
    `,
    [subjectId, userId]
  );

  return true;
}
