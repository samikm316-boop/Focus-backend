import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

/* =========================
   GOOGLE LOGIN
========================= */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })
);

/* =========================
   GOOGLE CALLBACK (JWT)
========================= */
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  }
);

export default router;
