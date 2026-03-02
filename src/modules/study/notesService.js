import { pool } from "../../config/db.js";

/* =========================
   CREATE NOTE
========================= */
export async function createNote(userId, title, content) {
  const result = await pool.query(
    `INSERT INTO notes (user_id, title, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, title, content]
  );

  return result.rows[0];
}

/* =========================
   GET NOTES (WITH PAGINATION + SEARCH)
========================= */
export async function getNotes(userId, page = 1, limit = 10, search = "") {
  const offset = (page - 1) * limit;

  const result = await pool.query(
    `
    SELECT *
    FROM notes
    WHERE user_id = $1
    AND ($2 = '' OR title ILIKE '%' || $2 || '%')
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
    `,
    [userId, search, limit, offset]
  );

  return result.rows;
}

/* =========================
   GET SINGLE NOTE
========================= */
export async function getNoteById(userId, noteId) {
  const result = await pool.query(
    `SELECT *
     FROM notes
     WHERE id = $1 AND user_id = $2`,
    [noteId, userId]
  );

  return result.rows[0];
}

/* =========================
   UPDATE NOTE
========================= */
export async function updateNote(userId, noteId, title, content) {
  const fields = [];
  const values = [];
  let index = 1;

  if (title !== undefined) {
    fields.push(`title = $${index++}`);
    values.push(title);
  }

  if (content !== undefined) {
    fields.push(`content = $${index++}`);
    values.push(content);
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(noteId);
  values.push(userId);

  const result = await pool.query(
    `
    UPDATE notes
    SET ${fields.join(", ")}
    WHERE id = $${index++} AND user_id = $${index}
    RETURNING *
    `,
    values
  );

  return result.rows[0];
}

/* =========================
   DELETE NOTE
========================= */
export async function deleteNote(userId, noteId) {
  await pool.query(
    `DELETE FROM notes
     WHERE id = $1 AND user_id = $2`,
    [noteId, userId]
  );
}
