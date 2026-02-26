import express from "express";
import passport from "passport";

const router = express.Router();

/* =========================
   GOOGLE LOGIN
========================= */
router.get("/google", (req, res, next) => {
  // Use function-style authenticate to ensure scope works in ES Modules + Railway
  passport.authenticate("google", ["profile", "email"], {
    prompt: "select_account", // always ask which account
    accessType: "offline"     // allows refresh token
  })(req, res, next);
});

/* =========================
   GOOGLE CALLBACK
========================= */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
    session: true
  }),
  (req, res) => {
    // Redirect logged-in users to profile
    if (req.user) {
      res.redirect("/api/users/me");
    } else {
      res.redirect("/");
    }
  }
);

export default router;
