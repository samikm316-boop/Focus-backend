import express from "express";
import passport from "passport";

const router = express.Router();

router.get("/google", (req, res, next) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],  // MUST be here
    prompt: "select_account",
    accessType: "offline"
  })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: true }),
  (req, res) => {
    res.redirect("/api/users/me");
  }
);

export default router;
