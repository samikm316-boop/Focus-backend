import express from "express";
import { pool } from "../../config/db.js";

const router = express.Router();

/* =========================
   TEMP MIGRATION ROUTE
========================= */
router.get("/migrate-study", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content JSONB NOT NULL,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS note_shares (
        id SERIAL PRIMARY KEY,
        note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
        shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(note_id, shared_with_user_id)
      );
    `);

    res.send("✅ Study tables created successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Migration failed");
  }
});

export default router;
