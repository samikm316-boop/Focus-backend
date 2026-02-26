import express from "express";
import { isAuthenticated } from "../../middleware/auth.js";

const router = express.Router();

router.get("/me", isAuthenticated, (req, res) => {
  res.json(req.user);
});

export default router;
