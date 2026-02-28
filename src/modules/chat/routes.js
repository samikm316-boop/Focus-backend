import express from "express";
import { pool } from "../../config/db.js";
import { authenticateJWT } from "../../middleware/auth.js";
import { generateAIReply } from "../../services/aiService.js";
import { addXP } from "../../services/xpService.js";

const router = express.Router();

function getSystemPrompt(type) {
  switch (type) {
    case "study":
      return "You are Focus+, a friendly teacher.";
    case "workout":
      return "You are Focus+, a certified trainer.";
    default:
      return "You are Focus+, a productivity AI.";
  }
}

router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { message, conversationId, type = "ai" } = req.body;

    if (!message)
      return res.status(400).json({ error: "Message required" });

    const userId = req.user.id;
    let convoId = conversationId;

    if (!convoId) {
      const result = await pool.query(
        "INSERT INTO conversations (user_id, type) VALUES ($1,$2) RETURNING id",
        [userId, type]
      );
      convoId = result.rows[0].id;
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
      ...history.rows
    ];

    const aiReply = await generateAIReply(formattedMessages);

    await pool.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)",
      [convoId, "assistant", aiReply]
    );

   // await addXP(userId, 5, "chat", convoId);

    res.json({ conversationId: convoId, reply: aiReply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat failed" });
  }
});

export default router;
