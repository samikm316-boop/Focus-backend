import express from "express";
import { authenticateJWT } from "../../middleware/auth.js";
import { addXP } from "../../services/xpService.js";
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote
} from "./notesService.js";

const router = express.Router();

/* =========================
   CREATE NOTE
========================= */
router.post("/notes", authenticateJWT, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content required" });
    }

    const note = await createNote(req.user.id, title, content);

    // Award XP
    await addXP(req.user.id, 10, "note_create", note.id);

    res.status(201).json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating note" });
  }
});

/* =========================
   GET NOTES (PAGINATED + SEARCH)
========================= */
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
    console.error(err);
    res.status(500).json({ message: "Error fetching notes" });
  }
});

/* =========================
   GET SINGLE NOTE
========================= */
router.get("/notes/:id", authenticateJWT, async (req, res) => {
  try {
    const note = await getNoteById(req.user.id, req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching note" });
  }
});

/* =========================
   UPDATE NOTE
========================= */
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
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating note" });
  }
});

/* =========================
   DELETE NOTE
========================= */
router.delete("/notes/:id", authenticateJWT, async (req, res) => {
  try {
    await deleteNote(req.user.id, req.params.id);
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting note" });
  }
});

export default router;
