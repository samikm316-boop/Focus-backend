import express from "express";
import passport from "passport";

const router = express.Router();

/* =========================
   GOOGLE LOGIN (FORCE ACCOUNT SELECTION)
========================= */
router.get("/google", (req, res, next) => {
  passport.authenticate("google", {
    // MUST be inside the object
    scope: ["profile", "email"],  
    prompt: "select_account",       // force account chooser
    accessType: "offline",          // allow refresh token
    includeGrantedScopes: true
  })(req, res, next);
});

/* =========================
   GOOGLE CALLBACK
========================= */
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: true }),
  (req, res) => {
    res.redirect("/api/users/me"); // redirect after login
  }
);

export default router;
