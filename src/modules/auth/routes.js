import express from "express";
import passport from "passport";

console.log("AUTH VERSION 4"); // updated version
const router = express.Router();

/* =========================
   GOOGLE AUTH ROUTE
========================= */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"], // required to get user info
    prompt: "select_account",     // forces account selection every time
    accessType: "offline"         // allows refresh token
  })
);

/* =========================
   GOOGLE CALLBACK
========================= */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",  // redirect on failure
    session: true
  }),
  (req, res) => {
    // Redirect to user info if logged in, fallback to home
    if (req.user) {
      res.redirect("/api/users/me"); // logged-in user endpoint
    } else {
      res.redirect("/");
    }
  }
);

export default router;
