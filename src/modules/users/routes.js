import express from "express";
import { authenticateJWT } from "../../middleware/auth.js";

const router = express.Router();

/* =========================
   GET CURRENT USER
========================= */
router.get("/me", authenticateJWT, (req, res) => {
  res.json(req.user);
});

export default router;
