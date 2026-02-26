import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { pool } from "./db.js"; // your PostgreSQL pool

// Use BASE_URL from Railway variables with fallback
const BASE_URL = process.env.BASE_URL || "https://focus-backend-production-b26c.up.railway.app";

/* =========================
   SESSION SERIALIZATION
========================= */
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

/* =========================
   GOOGLE STRATEGY
========================= */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/auth/google/callback`,
      proxy: true // ✅ Required for Railway/Heroku to handle HTTPS correctly
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const result = await pool.query(
          `INSERT INTO users (google_id, name, email, profile_picture)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (google_id)
           DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, profile_picture = EXCLUDED.profile_picture
           RETURNING *`,
          [
            profile.id,
            profile.displayName,
            profile.emails?.[0]?.value,
            profile.photos?.[0]?.value
          ]
        );
        done(null, result.rows[0]);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

console.log("✅ Passport Google Strategy configured with BASE_URL:", BASE_URL);
