import express from "express";

const router = express.Router();

/* =========================
   GOOGLE LOGIN (FORCE ACCOUNT SELECTION)
========================= */
router.get("/google", (req, res) => {
  const clientID = "510875618935-cdvtqu68cti7rt7vjhtkdm9llh60ap9g.apps.googleusercontent.com";
  const redirectURI = encodeURIComponent("https://focus-backend-production-b26c.up.railway.app/auth/google/callback");
  const scope = encodeURIComponent("profile email");
  const accessType = "offline";
  const prompt = "select_account";
  const includeGrantedScopes = "true";

  // Build the super-force Google OAuth URL
  const googleAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientID}&redirect_uri=${redirectURI}&response_type=code&scope=${scope}&access_type=${accessType}&prompt=${prompt}&include_granted_scopes=${includeGrantedScopes}`;

  // Redirect user to Google OAuth
  res.redirect(googleAuthURL);
});

/* =========================
   GOOGLE CALLBACK
========================= */
import passport from "passport";

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: true }),
  (req, res) => {
    res.redirect("/api/users/me"); // redirect after login
  }
);

export default router;
