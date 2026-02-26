import express from "express";
import passport from "passport";

console.log("AUTH VERSION 3");
const router = express.Router();

/* =========================
   GOOGLE AUTH ROUTE
========================= */

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    accessType: "offline"
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
    res.redirect("/api/users/me");
  }
);

export default router;
