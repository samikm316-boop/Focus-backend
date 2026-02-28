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
import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

/* GOOGLE LOGIN */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })
);

/* GOOGLE CALLBACK (JWT VERSION) */
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // For now, return JSON so we can test
    res.json({ token });

    // Later for mobile deep link:
    // res.redirect(`focusplus://auth?token=${token}`);
  }
);

export default router;

export default router;
