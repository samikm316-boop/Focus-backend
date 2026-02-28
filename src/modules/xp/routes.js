import express from "express";
import { pool } from "../../config/db.js";
import { authenticateJWT } from "../../middleware/auth.js";

const router = express.Router();

/* =========================
   GET USER XP
========================= */
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT total_xp FROM users WHERE id=$1",
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch XP" });
  }
});

export default router;
