import express from "express";
import { pool } from "../../config/db.js";
import { isAuthenticated } from "../../middleware/auth.js";

const router = express.Router();

router.get("/", isAuthenticated, async (req, res) => {
  const result = await pool.query(
    "SELECT total_xp FROM users WHERE id=$1",
    [req.user.id]
  );

  res.json(result.rows[0]);
});

export default router;
