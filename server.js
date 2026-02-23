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
   Database
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
   Passport
========================= */

passport.serializeUser((user, done) => {
  done(null, user.google_id);
});

passport.deserializeUser(async (googleId, done) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE google_id = $1",
      [googleId]
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
        const result = await pool.query(
          `INSERT INTO users (google_id, name, email, profile_picture)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (google_id) DO UPDATE
           SET name = EXCLUDED.name
           RETURNING *`,
          [
            profile.id,
            profile.displayName,
            profile.emails?.[0]?.value,
            profile.photos?.[0]?.value,
          ]
        );

        done(null, result.rows[0]);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

/* =========================
   Auth Middleware
========================= */

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

/* =========================
   Basic Routes
========================= */

app.get("/", (req, res) => {
  res.send("Focus+ Backend is running 🚀");
});

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
   Initialize DB
========================= */

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

    res.json({ message: "Tables ready" });
  } catch {
    res.status(500).json({ error: "DB setup failed" });
  }
});

/* =========================
   AI CHAT (POST)
========================= */

app.post("/api/chat", isAuthenticated, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message)
      return res.status(400).json({ error: "Message required" });

    const userId = req.user.id;
    let convoId = conversationId;

    // Create conversation if new
    if (!convoId) {
      const newConvo = await pool.query(
        "INSERT INTO conversations (user_id) VALUES ($1) RETURNING *",
        [userId]
      );
      convoId = newConvo.rows[0].id;
    }

    // Save user message
    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)",
      [convoId, "user", message]
    );

    /* ===== Generate Title (only first message) ===== */

    if (!conversationId) {
      const titleRes = await fetch(
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
              {
                role: "system",
                content:
                  "Generate a short 3-5 word title for this conversation. No quotes.",
              },
              { role: "user", content: message },
            ],
            max_tokens: 20,
          }),
        }
      );

      const titleData = await titleRes.json();
      const generatedTitle =
        titleData?.choices?.[0]?.message?.content?.trim() || "New Chat";

      await pool.query(
        "UPDATE conversations SET title=$1 WHERE id=$2",
        [generatedTitle, convoId]
      );
    }

    /* ===== Main AI Reply ===== */

    const aiRes = await fetch(
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

    const aiData = await aiRes.json();
    const aiReply =
      aiData?.choices?.[0]?.message?.content || "No response from AI.";

    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)",
      [convoId, "assistant", aiReply]
    );

    res.json({ conversationId: convoId, reply: aiReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat failed" });
  }
});

/* =========================
   Browser Test Route
========================= */

app.get("/api/chat-test", isAuthenticated, async (req, res) => {
  try {
    const message = req.query.message;
    if (!message)
      return res.status(400).json({ error: "Message query required" });

    const userId = req.user.id;

    const newConvo = await pool.query(
      "INSERT INTO conversations (user_id) VALUES ($1) RETURNING *",
      [userId]
    );

    const convoId = newConvo.rows[0].id;

    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)",
      [convoId, "user", message]
    );

    const aiRes = await fetch(
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

    const aiData = await aiRes.json();
    const aiReply =
      aiData?.choices?.[0]?.message?.content || "No response";

    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)",
      [convoId, "assistant", aiReply]
    );

    res.json({ conversationId: convoId, reply: aiReply });
  } catch {
    res.status(500).json({ error: "Test chat failed" });
  }
});

/* =========================
   Get Conversations
========================= */

app.get("/api/conversations", isAuthenticated, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM conversations WHERE user_id=$1 ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(result.rows);
});

/* =========================
   Get Messages
========================= */

app.get(
  "/api/conversations/:id/messages",
  isAuthenticated,
  async (req, res) => {
    const result = await pool.query(
      `SELECT m.*
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.conversation_id=$1 AND c.user_id=$2
       ORDER BY m.created_at ASC`,
      [req.params.id, req.user.id]
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
