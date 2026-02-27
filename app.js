import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";

// Load env variables
dotenv.config();

// Import Passport config
import "./src/config/passport.js";

// Import routes
import authRoutes from "./src/modules/auth/routes.js";
import userRoutes from "./src/modules/users/routes.js";
import chatRoutes from "./src/modules/chat/routes.js";
import xpRoutes from "./src/modules/xp/routes.js";
import adminRoutes from "./src/modules/admin/routes.js"; // ✅ TEMP MIGRATION ROUTE

const app = express();

/* =========================
   TRUST PROXY (REQUIRED FOR RAILWAY)
========================= */
app.set("trust proxy", 1);

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* =========================
   BODY PARSER
========================= */
app.use(express.json());

/* =========================
   SESSION (RAILWAY + CHROME SAFE)
========================= */
app.use(
  session({
    name: "focusplus.sid",
    secret: process.env.SESSION_SECRET || "focusplussecret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,      // Railway is HTTPS
      httpOnly: true,
      sameSite: "none",  // Required for Google OAuth
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
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
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/xp", xpRoutes);

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
