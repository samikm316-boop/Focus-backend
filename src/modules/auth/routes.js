import express from "express";
import passport from "passport";

const router = express.Router();

/* =========================
   GOOGLE LOGIN
========================= */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"], // required
    prompt: "select_account",     // always ask which account
    accessType: "offline"         // allows refresh token
  })
);

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
