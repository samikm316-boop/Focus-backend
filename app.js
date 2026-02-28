import express from "express";
import cors from "cors";
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
import studyRoutes from "./src/modules/study/routes.js";

const app = express();

/* =========================
   TRUST PROXY (RAILWAY)
========================= */
app.set("trust proxy", 1);

/* =========================
   CORS (Mobile Safe)
========================= */
app.use(
  cors({
    origin: true,
  })
);

/* =========================
   BODY PARSER
========================= */
app.use(express.json());

/* =========================
   PASSPORT (NO SESSIONS)
========================= */
app.use(passport.initialize());

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("Focus+ Backend JWT 🚀");
});

/* =========================
   ROUTES
========================= */
app.use("/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/xp", xpRoutes);
app.use("/api/study", studyRoutes);

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
