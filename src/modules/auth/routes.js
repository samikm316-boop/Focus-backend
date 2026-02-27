import express from "express";
import passport from "passport";

const router = express.Router();

/* =========================
   GOOGLE LOGIN
   Forces account selection
========================= */
router.get("/google", (req, res, next) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],  // required by Google
    prompt: "select_account",      // always ask which account
    accessType: "offline",         // allow refresh token
    includeGrantedScopes: true     // optional, allows multiple scopes
  })(req, res, next);
});

/* =========================
   GOOGLE CALLBACK
========================= */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",  // redirect if login fails
    session: true          // store session
  }),
  (req, res) => {
    // Redirect logged-in users to their profile
    res.redirect("/api/users/me");
  }
);

export default router;
