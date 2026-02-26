import express from "express";
import passport from "passport";

const router = express.Router();

router.get("/google", (req, res, next) => {
  passport.authenticate("google", ["profile", "email"], {
    prompt: "select_account",
    accessType: "offline"
  })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: true }),
  (req, res) => {
    if (req.user) res.redirect("/api/users/me");
    else res.redirect("/");
  }
);

export default router;
