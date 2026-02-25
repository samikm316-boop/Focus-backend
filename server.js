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
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

/* =========================
   AUTO MIGRATIONS
========================= */

async function runMigrations() {
  try {
    console.log("Running DB migrations...");

    await pool.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'ai';
    `);

    await pool.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'New Chat';
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_messages (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        role TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("DB migrations complete.");
  } catch (err) {
    console.error("Migration error:", err);
  }
}

/* =========================
   Middleware
========================= */

app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "focusplussecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
           ON CONFLICT (google_id)
           DO UPDATE SET name = EXCLUDED.name
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
   Helper: System Prompt Per Mode
========================= */

function getSystemPrompt(type) {
  switch (type) {
    case "study":
      return "You are Focus+, a friendly teacher. Explain clearly with structured steps and examples.";
    case "workout":
      return "You are Focus+, a certified fitness trainer. Give safe, clear exercise guidance.";
    case "group":
      return "You are Focus+, assisting inside a group chat. Keep responses concise and collaborative.";
    default:
      return "You are Focus+, a powerful productivity AI assistant.";
  }
}

/* =========================
   Base Routes
========================= */

app.get("/", (req, res) => {
  res.send("Focus+ Backend v6 running 🚀");
});

/* =========================
   Google Auth Routes
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
app.get("/me", isAuthenticated, (req, res) => {
  res.json(req.user);
});

/* =========================
   AI CHAT (Normal)
========================= */

app.post("/api/chat", async (req, res) => {
  try {
    const { message, conversationId, type = "ai" } = req.body;
    if (!message)
      return res.status(400).json({ error: "Message required" });

    const userId = 1;
    let convoId = conversationId;

    if (!convoId) {
      const newConvo = await pool.query(
        "INSERT INTO conversations (user_id, type) VALUES ($1,$2) RETURNING id",
        [userId, type]
      );
      convoId = newConvo.rows[0].id;
    }

    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)",
      [convoId, "user", message]
    );

    const history = await pool.query(
      "SELECT role, content FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC",
      [convoId]
    );

    const formattedMessages = [
      { role: "system", content: getSystemPrompt(type) },
      ...history.rows,
    ];

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
          messages: formattedMessages,
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
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

/* =========================
   AI CHAT (Streaming)
========================= */

app.post("/api/chat-stream", async (req, res) => {
  try {
    const { message, conversationId, type = "ai" } = req.body;
    if (!message)
      return res.status(400).json({ error: "Message required" });

    const userId = 1;
    let convoId = conversationId;

    if (!convoId) {
      const newConvo = await pool.query(
        "INSERT INTO conversations (user_id, type) VALUES ($1,$2) RETURNING id",
        [userId, type]
      );
      convoId = newConvo.rows[0].id;
    }

    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)",
      [convoId, "user", message]
    );

    const history = await pool.query(
      "SELECT role, content FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC",
      [convoId]
    );

    const formattedMessages = [
      { role: "system", content: getSystemPrompt(type) },
      ...history.rows,
    ];

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
          messages: formattedMessages,
          stream: true,
        }),
      }
    );

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.write(`__CONVO_ID__:${convoId}\n`);

    let fullReply = "";

    for await (const chunk of aiRes.body) {
      const lines = chunk.toString().split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.replace("data: ", "").trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;

          if (content) {
            fullReply += content;
            res.write(content);
          }
        } catch {}
      }
    }

    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)",
      [convoId, "assistant", fullReply]
    );

    res.end();
  } catch (err) {
    console.error("Streaming error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Streaming failed" });
    }
  }
});

/* =========================
   GET CONVERSATIONS
========================= */

app.get("/api/conversations", async (req, res) => {
  try {
    const userId = 1;

    const result = await pool.query(
      `SELECT id, type, title, created_at
       FROM conversations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch conversations error:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

/* =========================
   GET MESSAGES
========================= */

app.get("/api/messages/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await pool.query(
      `SELECT role, content
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/* =========================
   Start Server
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await runMigrations();
});
