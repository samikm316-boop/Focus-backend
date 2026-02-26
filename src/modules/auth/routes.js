import express from "express";
import passport from "passport";

const router = express.Router();

/* =========================
   GOOGLE LOGIN (FORCE ACCOUNT SELECTION)
========================= */
router.get("/google", (req, res, next) => {
  passport.authenticate("google", ["profile", "email"], {
    prompt: "select_account",  // ✅ Forces Google to ask which account
    accessType: "offline",     // allows refresh token
    includeGrantedScopes: true // optional but helps with multiple logins
  })(req, res, next);
});

/* =========================
   GOOGLE CALLBACK
========================= */
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: true }),
  (req, res) => {
    res.redirect("/api/users/me");
  }
);

export default router;
