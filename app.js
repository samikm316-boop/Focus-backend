import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";

import "./src/config/passport.js";

import authRoutes from "./src/modules/auth/routes.js";
import chatRoutes from "./src/modules/chat/routes.js";
import userRoutes from "./src/modules/users/routes.js";
import xpRoutes from "./src/modules/xp/routes.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "focusplussecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.send("Focus+ Backend Modular 🚀");
});

app.use("/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/xp", xpRoutes);

export default app;
