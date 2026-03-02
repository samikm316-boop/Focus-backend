import express from "express";
import { authenticateJWT } from "../../middleware/auth.js";
import { addXP } from "../../services/xpService.js";

/* ===== NOTES SERVICE ===== */
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote
} from "./notesService.js";

/* ===== FLASHCARDS SERVICE ===== */
import {
  createFlashcard,
  getFlashcards,
  updateFlashcard,
  deleteFlashcard,
  getDueFlashcards,
  getFlashcardStats,
  getStudySession,
  reviewFlashcard
} from "./flashcardsService.js";

const router = express.Router();

/* =====================================================
   NOTES ROUTES
===================================================== */

/* CREATE NOTE */
router.post("/notes", authenticateJWT, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content required" });
    }

    const note = await createNote(req.user.id, title, content);

    await addXP(req.user.id, 10, "note_create", note.id);

    res.status(201).json(note);
  } catch (err) {
    console.error("CREATE NOTE ERROR:", err);
    res.status(500).json({ message: "Error creating note" });
  }
});

/* GET NOTES */
router.get("/notes", authenticateJWT, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const notes = await getNotes(
      req.user.id,
      Number(page),
      Number(limit),
      search
    );

    res.json(notes);
  } catch (err) {
    console.error("GET NOTES ERROR:", err);
    res.status(500).json({ message: "Error fetching notes" });
  }
});

/* GET SINGLE NOTE */
router.get("/notes/:id", authenticateJWT, async (req, res) => {
  try {
    const note = await getNoteById(req.user.id, req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(note);
  } catch (err) {
    console.error("GET NOTE ERROR:", err);
    res.status(500).json({ message: "Error fetching note" });
  }
});

/* UPDATE NOTE */
router.put("/notes/:id", authenticateJWT, async (req, res) => {
  try {
    const { title, content } = req.body;

    const updated = await updateNote(
      req.user.id,
      req.params.id,
      title,
      content
    );

    if (!updated) {
      return res.status(404).json({ message: "Note not found or nothing to update" });
    }

    res.json(updated);
  } catch (err) {
    console.error("UPDATE NOTE ERROR:", err);
    res.status(500).json({ message: "Error updating note" });
  }
});

/* DELETE NOTE */
router.delete("/notes/:id", authenticateJWT, async (req, res) => {
  try {
    await deleteNote(req.user.id, req.params.id);
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error("DELETE NOTE ERROR:", err);
    res.status(500).json({ message: "Error deleting note" });
  }
});

/* =====================================================
   FLASHCARDS ROUTES
===================================================== */

/* CREATE FLASHCARD */
router.post("/flashcards", authenticateJWT, async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "Question and answer required" });
    }

    const flashcard = await createFlashcard(
      req.user.id,
      question,
      answer
    );

    await addXP(req.user.id, 5, "flashcard_create", flashcard.id);

    res.status(201).json(flashcard);
  } catch (err) {
    console.error("CREATE FLASHCARD ERROR:", err);
    res.status(500).json({ message: "Error creating flashcard" });
  }
});

/* GET FLASHCARDS */
router.get("/flashcards", authenticateJWT, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const flashcards = await getFlashcards(
      req.user.id,
      Number(page),
      Number(limit)
    );

    res.json(flashcards);
  } catch (err) {
    console.error("GET FLASHCARDS ERROR:", err);
    res.status(500).json({ message: "Error fetching flashcards" });
  }
});
/* GET DUE FLASHCARDS */
router.get("/flashcards/due", authenticateJWT, async (req, res) => {
  try {
    const due = await getDueFlashcards(req.user.id);
    res.json(due);
  } catch (err) {
    console.error("GET DUE FLASHCARDS ERROR:", err);
    res.status(500).json({ message: "Error fetching due flashcards" });
  }
});
/* GET FLASHCARD STATS */
router.get("/flashcards/stats", authenticateJWT, async (req, res) => {
  try {
    const stats = await getFlashcardStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error("GET FLASHCARD STATS ERROR:", err);
    res.status(500).json({ message: "Error fetching flashcard stats" });
  }
});
/* START STUDY SESSION */
router.get("/flashcards/study-session", authenticateJWT, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const session = await getStudySession(
      req.user.id,
      Number(limit)
    );

    res.json({
      total: session.length,
      cards: session
    });
  } catch (err) {
    console.error("STUDY SESSION ERROR:", err);
    res.status(500).json({ message: "Error starting study session" });
  }
});

/* UPDATE FLASHCARD */
router.put("/flashcards/:id", authenticateJWT, async (req, res) => {
  try {
    const { question, answer } = req.body;

    const updated = await updateFlashcard(
      req.user.id,
      req.params.id,
      question,
      answer
    );

    if (!updated) {
      return res.status(404).json({ message: "Flashcard not found or nothing to update" });
    }

    res.json(updated);
  } catch (err) {
    console.error("UPDATE FLASHCARD ERROR:", err);
    res.status(500).json({ message: "Error updating flashcard" });
  }
});

/* DELETE FLASHCARD */
router.delete("/flashcards/:id", authenticateJWT, async (req, res) => {
  try {
    await deleteFlashcard(req.user.id, req.params.id);
    res.json({ message: "Flashcard deleted" });
  } catch (err) {
    console.error("DELETE FLASHCARD ERROR:", err);
    res.status(500).json({ message: "Error deleting flashcard" });
  }
});

/* REVIEW FLASHCARD */
router.post("/flashcards/:id/review", authenticateJWT, async (req, res) => {
  try {
    const { difficulty = 1 } = req.body;

    const reviewed = await reviewFlashcard(
      req.user.id,
      req.params.id,
      difficulty
    );

    if (!reviewed) {
      return res.status(404).json({ message: "Flashcard not found" });
    }

    await addXP(req.user.id, 8, "flashcard_review", reviewed.id);
    import { updateStreak } from "../../services/streakService.js";

    res.json(reviewed);
  } catch (err) {
    console.error("REVIEW FLASHCARD ERROR:", err);
    res.status(500).json({ message: "Error reviewing flashcard" });
  }
});

export default router;
