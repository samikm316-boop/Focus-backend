import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import pkg from "pg";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

dotenv.config();

const { Pool } = pkg;
const app = express();

/* =========================
   Database Connection
========================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   Middleware
========================= */

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "focusplussecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "none",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

/* =========================
   Passport Config
========================= */

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE google_id = $1",
      [id]
    );
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        "https://focus-backend-production-b26c.up.railway.app/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        await pool.query(
          `INSERT INTO users (google_id, name, email, profile_picture)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (google_id) DO NOTHING`,
          [
            profile.id,
            profile.displayName,
            profile.emails?.[0]?.value,
            profile.photos?.[0]?.value,
          ]
        );

        return done(null, { id: profile.id });
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

/* =========================
   Auth Middleware
========================= */

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Unauthorized" });
}

/* =========================
   Routes
========================= */

app.get("/", (req, res) => {
  res.send("Focus+ Backend is running 🚀");
});

/* Initialize ALL Tables */
app.get("/init-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id TEXT UNIQUE,
        name TEXT,
        email TEXT UNIQUE,
        profile_picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT CHECK (role IN ('user','assistant')),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    res.json({ message: "All tables created successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to create tables" });
  }
});

/* Protected: Current User */
app.get("/me", isAuthenticated, (req, res) => {
  res.json(req.user);
});

/* =========================
   Google Auth
========================= */

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/me");
  }
);

/* =========================
   AI Chat (Persistent)
========================= */

app.post("/api/chat", isAuthenticated, async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const userId = req.user.id;
    let convoId = conversationId;

    // Create new conversation if none provided
    if (!convoId) {
      const newConvo = await pool.query(
        "INSERT INTO conversations (user_id) VALUES ($1) RETURNING *",
        [userId]
      );
      convoId = newConvo.rows[0].id;
    }

    // Verify ownership
    const check = await pool.query(
      "SELECT * FROM conversations WHERE id = $1 AND user_id = $2",
      [convoId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Save user message
    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
      [convoId, "user", message]
    );

    // Call AI
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: "You are Focus+, a productivity AI assistant." },
            { role: "user", content: message },
          ],
        }),
      }
    );

    const data = await response.json();
    const aiReply =
      data?.choices?.[0]?.message?.content || "No response from AI.";

    // Save AI reply
    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
      [convoId, "assistant", aiReply]
    );

    res.json({
      conversationId: convoId,
      reply: aiReply,
    });

  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

/* =========================
   Get Conversations
========================= */

app.get("/api/conversations", isAuthenticated, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(result.rows);
});

/* =========================
   Get Messages of Conversation
========================= */

app.get(
  "/api/conversations/:id/messages",
  isAuthenticated,
  async (req, res) => {
    const convoId = req.params.id;

    const result = await pool.query(
      `SELECT m.*
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.conversation_id = $1 AND c.user_id = $2
       ORDER BY m.created_at ASC`,
      [convoId, req.user.id]
    );

    res.json(result.rows);
  }
);

/* =========================
   Start Server
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
