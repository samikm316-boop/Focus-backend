import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";

import "./src/config/passport.js";

import authRoutes from "./src/modules/auth/routes.js";
import chatRoutes from "./src/modules/chat/routes.js";
import userRoutes from "./src/modules/users/routes.js";
import xpRoutes from "./src/modules/xp/routes.js";

const app = express();

/* =========================
   TRUST PROXY (Railway)
========================= */
app.set("trust proxy", 1);

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

/* =========================
   BODY PARSER
========================= */
app.use(express.json());

/* =========================
   SESSION
========================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "focusplussecret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax"
    }
  })
);

/* =========================
   PASSPORT
========================= */
app.use(passport.initialize());
app.use(passport.session());

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("Focus+ Backend Modular 🚀");
});

/* =========================
   ROUTES
========================= */
app.use("/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/xp", xpRoutes);

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
