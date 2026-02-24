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
  res.send("Focus+ Backend v4 running 🚀");
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
   Normal Chat
========================= */

app.post("/api/chat", isAuthenticated, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message)
      return res.status(400).json({ error: "Message required" });

    const userId = 1; // temporary test user
    let convoId = conversationId;

    if (!convoId) {
      const newConvo = await pool.query(
        "INSERT INTO conversations (user_id) VALUES ($1) RETURNING *",
        [userId]
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
      { role: "system", content: "You are Focus+, a productivity AI assistant." },
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
    console.error(err);
    res.status(500).json({ error: "Chat failed" });
  }
});

/* =========================
   Streaming Chat
========================= */

app.post("/api/chat-stream", async (req, res) => {
  try {

    const { message, conversationId } = req.body;
    if (!message)
      return res.status(400).json({ error: "Message required" });

    const userId = 1;
    let convoId = conversationId;

    if (!convoId) {
      const newConvo = await pool.query(
        "INSERT INTO conversations (user_id) VALUES ($1) RETURNING *",
        [userId]
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
      { role: "system", content: "You are Focus+, a productivity AI assistant." },
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

    let fullReply = "";

    for await (const chunk of aiRes.body) {
      const lines = chunk.toString().split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") break;

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
    }

    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)",
      [convoId, "assistant", fullReply]
    );

    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Streaming failed" });
  }
});
/* =========================
   Start Server
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
