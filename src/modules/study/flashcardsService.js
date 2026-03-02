import { pool } from "../../config/db.js";

/* CREATE FLASHCARD */
export async function createFlashcard(userId, question, answer) {
  const result = await pool.query(
    `INSERT INTO flashcards (user_id, question, answer)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, question, answer]
  );

  return result.rows[0];
}

/* GET FLASHCARDS (pagination) */
export async function getFlashcards(userId, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const result = await pool.query(
    `
    SELECT *
    FROM flashcards
    WHERE user_id = $1
    ORDER BY next_review_at ASC
    LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );

  return result.rows;
}

/* UPDATE FLASHCARD */
export async function updateFlashcard(userId, id, question, answer) {
  const fields = [];
  const values = [];
  let index = 1;

  if (question !== undefined) {
    fields.push(`question = $${index++}`);
    values.push(question);
  }

  if (answer !== undefined) {
    fields.push(`answer = $${index++}`);
    values.push(answer);
  }

  if (fields.length === 0) return null;

  values.push(id);
  values.push(userId);

  const result = await pool.query(
    `
    UPDATE flashcards
    SET ${fields.join(", ")}
    WHERE id = $${index++} AND user_id = $${index}
    RETURNING *
    `,
    values
  );

  return result.rows[0];
}

/* DELETE FLASHCARD */
export async function deleteFlashcard(userId, id) {
  await pool.query(
    `DELETE FROM flashcards
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

/* REVIEW FLASHCARD (basic spaced repetition) */
export async function reviewFlashcard(userId, id, difficulty = 1) {
  // Increase interval based on difficulty
  const daysToAdd = difficulty === 3 ? 7 : difficulty === 2 ? 3 : 1;

  const result = await pool.query(
    `
    UPDATE flashcards
    SET difficulty = $1,
        next_review_at = CURRENT_TIMESTAMP + ($2 || ' days')::interval
    WHERE id = $3 AND user_id = $4
    RETURNING *
    `,
    [difficulty, daysToAdd, id, userId]
  );

  return result.rows[0];
}
