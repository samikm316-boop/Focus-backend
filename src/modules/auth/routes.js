import express from "express";
import passport from "passport";

const router = express.Router();

/* =========================
   GOOGLE AUTH ROUTE
========================= */

router.get("/google", (req, res, next) => {
  const prompt = req.query.prompt || "select_account";

  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt
  })(req, res, next);
});

/* =========================
   GOOGLE CALLBACK
========================= */

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // After successful login redirect to user endpoint
    res.redirect("/api/users/me");
  }
);

export default router;
