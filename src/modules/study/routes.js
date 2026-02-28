import express from "express";
import { pool } from "../../config/db.js";

const router = express.Router();

/* =========================
   CREATE NOTE
========================= */
router.post("/notes", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { title, content } = req.body;

    const result = await pool.query(
      `INSERT INTO notes (user_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, title, content]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating note" });
  }
});

/* =========================
   GET MY NOTES
========================= */
router.get("/notes", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const result = await pool.query(
      `SELECT * FROM notes
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching notes" });
  }
});

/* =========================
   GET SHARED NOTES
========================= */
router.get("/shared", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const result = await pool.query(
      `SELECT n.*
       FROM notes n
       JOIN note_shares s ON n.id = s.note_id
       WHERE s.shared_with_user_id = $1`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching shared notes" });
  }
});

/*===================
temp
=====================*/
router.get("/test-create", async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  const result = await pool.query(
    `INSERT INTO notes (user_id, title, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [
      req.user.id,
      "Browser Test Note",
      { blocks: [{ type: "text", value: "Created from browser" }] }
    ]
  );

  res.json(result.rows[0]);
});

/* =========================
   SHARE NOTE
========================= */
router.post("/share", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { noteId, userId } = req.body;

    await pool.query(
      `INSERT INTO note_shares (note_id, shared_with_user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [noteId, userId]
    );

    res.json({ message: "Note shared successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sharing note" });
  }
});

/* =========================
   TOGGLE PUBLIC
========================= */
router.patch("/notes/:id/public", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const noteId = req.params.id;

    const result = await pool.query(
      `UPDATE notes
       SET is_public = NOT is_public
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [noteId, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating note" });
  }
});

export default router;
